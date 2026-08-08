-- ============================================================================
-- Altech Project — domínio CONFIGURAÇÕES DO TENANT
--   ALTER  tenants            → type, slug, slug_status, status, documento seguro
--   CREATE tenant_settings    → branding / localização por tenant
--   CREATE reserved_slugs     → palavras reservadas (semeadas)
--   CREATE check_slug(text)   → normaliza e valida disponibilidade do slug
-- Mesmo template das migrações anteriores (client_portal / timesheets / modules):
-- tenant_id, FK tenant-safe com array_agg(a.attname::text ...), colunas de
-- auditoria, row_version, metadata jsonb, archived_at, unique (tenant_id, id),
-- trigger tg_touch_row, grants Data API, RLS + policies *_inspection, índices.
-- NÃO cria billing/checkout. Idempotente: pode rodar várias vezes.
-- CPF/CNPJ nunca em claro: apenas hash, últimos 4 dígitos e blob cifrado.
-- ============================================================================

begin;

-- ─── Helper: FK composta (tenant_id, <col>) -> <alvo>(tenant_id, id) ────────
create or replace function public.__tset_add_tenant_fk(
  p_table text, p_col text, p_target text, p_constraint text, p_on_delete text default 'restrict'
) returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $fn$
declare
  has_composite boolean;
begin
  if exists (
    select 1 from pg_constraint
    where conname = p_constraint and connamespace = 'public'::regnamespace
  ) then
    return;
  end if;

  select exists (
    select 1
    from pg_constraint c
    join lateral unnest(c.conkey) with ordinality as k(attnum, ord) on true
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
    where c.conrelid = format('public.%I', p_target)::regclass
      and c.contype in ('p', 'u')
    group by c.oid
    having array_agg(a.attname::text order by k.ord) = array['tenant_id', 'id']::text[]
        or array_agg(a.attname::text order by k.ord) = array['id', 'tenant_id']::text[]
  ) into has_composite;

  if has_composite then
    execute format(
      'alter table public.%I add constraint %I foreign key (tenant_id, %I) references public.%I (tenant_id, id) on delete %s',
      p_table, p_constraint, p_col, p_target, p_on_delete
    );
  else
    execute format(
      'alter table public.%I add constraint %I foreign key (%I) references public.%I (id) on delete %s',
      p_table, p_constraint, p_col, p_target, p_on_delete
    );
  end if;
end;
$fn$;

-- ─── 1) ALTER tenants ───────────────────────────────────────────────────────
alter table public.tenants add column if not exists type                         text;
alter table public.tenants add column if not exists slug                         text;
alter table public.tenants add column if not exists slug_status                  text;
alter table public.tenants add column if not exists status                       text not null default 'active';
alter table public.tenants add column if not exists document_encrypted           text;
alter table public.tenants add column if not exists document_hash                text;
alter table public.tenants add column if not exists document_last4               text;
alter table public.tenants add column if not exists document_verification_status text not null default 'unverified';

create unique index if not exists tenants_slug_lower_uniq on public.tenants (lower(slug)) where slug is not null;
create index if not exists tenants_status_idx on public.tenants (status);

-- Validações por trigger (nunca CHECK, para manter flexibilidade)
create or replace function public.tg_tenants_validate()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $fn$
begin
  if new.type is not null and new.type not in ('pf', 'pj') then
    raise exception 'tenants.type inválido: %', new.type;
  end if;
  if new.status not in ('draft','pending_terms','pending_payment','provisioning','active','suspended','inactive','cancelled') then
    raise exception 'tenants.status inválido: %', new.status;
  end if;
  if new.document_verification_status not in ('unverified','pending','verified','rejected') then
    raise exception 'tenants.document_verification_status inválido: %', new.document_verification_status;
  end if;
  return new;
end;
$fn$;

drop trigger if exists tg_tenants_validate on public.tenants;
create trigger tg_tenants_validate before insert or update on public.tenants
  for each row execute function public.tg_tenants_validate();

-- ─── 2) tenant_settings ─────────────────────────────────────────────────────
create table if not exists public.tenant_settings (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null unique references public.tenants (id) on delete cascade,
  display_name  text,
  timezone      text not null default 'America/Sao_Paulo',
  locale        text not null default 'pt-BR',
  logo_url      text,
  primary_color text,
  created_at    timestamptz not null default now(),
  created_by    uuid,
  updated_at    timestamptz not null default now(),
  updated_by    uuid,
  archived_at   timestamptz,
  metadata      jsonb not null default '{}'::jsonb,
  row_version   bigint not null default 1,
  constraint tenant_settings_tenant_id_id_key unique (tenant_id, id)
);

create index if not exists tenant_settings_tenant_idx on public.tenant_settings (tenant_id);

drop trigger if exists tg_tenant_settings_touch on public.tenant_settings;
create trigger tg_tenant_settings_touch before update on public.tenant_settings
  for each row execute function public.tg_touch_row();

-- ─── 3) reserved_slugs + seed ───────────────────────────────────────────────
create table if not exists public.reserved_slugs (
  slug       text primary key,
  created_at timestamptz not null default now()
);

insert into public.reserved_slugs (slug) values
  ('admin'), ('administrator'), ('api'), ('app'), ('auth'), ('login'), ('logout'),
  ('signup'), ('cadastro'), ('billing'), ('checkout'), ('payment'), ('payments'),
  ('support'), ('suporte'), ('help'), ('altech'), ('altechproject'), ('control'),
  ('view'), ('www')
on conflict (slug) do nothing;

-- ─── 4) check_slug ──────────────────────────────────────────────────────────
-- unaccent pode não estar disponível: fallback por translate
create or replace function public.unaccent_fallback(p_text text)
returns text
language sql
immutable
security invoker
set search_path = public, pg_temp
as $fn$
  select translate(
    coalesce(p_text, ''),
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
  );
$fn$;

create or replace function public.normalize_slug(p_slug text)
returns text
language sql
immutable
security invoker
set search_path = public, pg_temp
as $fn$
  select trim(both '-' from regexp_replace(
    regexp_replace(
      lower(unaccent_fallback(coalesce(p_slug, ''))),
      '[^a-z0-9]+', '-', 'g'
    ),
    '-{2,}', '-', 'g'
  ));
$fn$;

create or replace function public.check_slug(p_slug text)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_slug text;
begin
  v_slug := public.normalize_slug(p_slug);

  if v_slug is null or length(v_slug) < 3 or length(v_slug) > 63 then
    return 'invalid';
  end if;
  if v_slug !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' then
    return 'invalid';
  end if;
  if exists (select 1 from public.reserved_slugs r where r.slug = v_slug) then
    return 'reserved';
  end if;
  if exists (select 1 from public.tenants t where lower(t.slug) = v_slug) then
    return 'unavailable';
  end if;
  return 'available';
end;
$fn$;

-- ─── Grants (Data API) ──────────────────────────────────────────────────────
grant select, insert, update, delete on public.tenant_settings to anon, authenticated;
grant all    on public.tenant_settings to service_role;
grant select on public.reserved_slugs  to anon, authenticated;
grant all    on public.reserved_slugs  to service_role;
grant execute on function public.check_slug(text)      to anon, authenticated, service_role;
grant execute on function public.normalize_slug(text)  to anon, authenticated, service_role;

-- ─── RLS + policies (protótipo) ─────────────────────────────────────────────
alter table public.tenant_settings enable row level security;
alter table public.reserved_slugs  enable row level security;

drop policy if exists tenant_settings_inspection on public.tenant_settings;
create policy tenant_settings_inspection on public.tenant_settings
  for all using (true) with check (true);

drop policy if exists reserved_slugs_inspection on public.reserved_slugs;
create policy reserved_slugs_inspection on public.reserved_slugs
  for select using (true);

drop function if exists public.__tset_add_tenant_fk(text, text, text, text, text);

commit;
