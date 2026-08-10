-- ============================================================================
-- Altech Project — J3b: primeiro acesso / troca de senha obrigatória
-- Cria activation_tokens (uso único, só hash do token) e garante
-- profiles.password_must_change. Idempotente. NÃO altera policies existentes.
-- ============================================================================

begin;

-- ─── 1) profiles.password_must_change ───────────────────────────────────────
alter table public.profiles
  add column if not exists password_must_change boolean not null default false;

-- ─── Helper: FK composta tenant-safe (tenant_id, <col>) -> <alvo>(tenant_id,id)
create or replace function public.__act_add_tenant_fk(
  p_table text, p_col text, p_target text, p_constraint text, p_on_delete text default 'cascade'
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

-- ─── 2) activation_tokens ───────────────────────────────────────────────────
create table if not exists public.activation_tokens (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null,
  profile_id  uuid not null,
  purpose     text not null check (purpose in ('first_access', 'password_reset')),
  token_hash  text not null,           -- SHA-256 do token bruto; bruto nunca é gravado
  expires_at  timestamptz not null,
  used_at     timestamptz null,        -- uso único
  created_by  uuid null,
  created_at  timestamptz not null default now(),
  metadata    jsonb not null default '{}'::jsonb
);

-- unique (tenant_id, id) para permitir FKs compostas tenant-safe daqui pra frente
create unique index if not exists activation_tokens_tenant_id_id_key
  on public.activation_tokens (tenant_id, id);

create unique index if not exists activation_tokens_token_hash_key
  on public.activation_tokens (token_hash);

create index if not exists activation_tokens_tenant_profile_idx
  on public.activation_tokens (tenant_id, profile_id);

select public.__act_add_tenant_fk(
  'activation_tokens', 'profile_id', 'profiles', 'activation_tokens_profile_fk', 'cascade'
);

-- Grants Data API
grant select, insert, update on public.activation_tokens to authenticated;
grant select, insert, update on public.activation_tokens to anon;
grant all on public.activation_tokens to service_role;

-- RLS + policy de protótipo (mesmo padrão das demais)
alter table public.activation_tokens enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'activation_tokens'
      and policyname = 'activation_tokens_inspection'
  ) then
    create policy activation_tokens_inspection
      on public.activation_tokens
      for all
      using (true)
      with check (true);
  end if;
end $$;

commit;

-- Recarrega o schema cache do PostgREST
notify pgrst, 'reload schema';
