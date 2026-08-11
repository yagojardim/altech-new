-- ============================================================================
-- Altech Project — ELEIÇÃO AUTÔNOMA DO ADMIN MASTER
--   ALTER tenant_settings → estado da eleição (pending/defined), prazo de graça,
--   método de definição e conta de cadastro (registrant).
--   BACKFILL: tenants que JÁ possuem profile com tenant_owner=true entram como
--   'defined' / 'self_elected' — o overlay nunca reabre para eles.
-- O Project é AUTOSSUFICIENTE: nenhum serviço externo participa da eleição.
-- O futuro Altech Control apenas LÊ este estado. Sem billing/checkout.
-- Idempotente: pode rodar várias vezes.
-- ============================================================================

begin;

-- ─── 1) Colunas de estado da eleição ────────────────────────────────────────
alter table public.tenant_settings add column if not exists admin_master_status        text        not null default 'pending';
alter table public.tenant_settings add column if not exists admin_master_grace_days    integer     not null default 5;
alter table public.tenant_settings add column if not exists admin_master_grace_until   timestamptz;
alter table public.tenant_settings add column if not exists admin_master_defined_at    timestamptz;
alter table public.tenant_settings add column if not exists admin_master_defined_by    uuid;
alter table public.tenant_settings add column if not exists admin_master_defined_method text;
alter table public.tenant_settings add column if not exists registrant_profile_id      uuid;

-- Validações por trigger (o projeto evita CHECK para manter flexibilidade)
create or replace function public.tg_tenant_settings_validate()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $fn$
begin
  if new.admin_master_status not in ('pending', 'defined') then
    raise exception 'tenant_settings.admin_master_status inválido: %', new.admin_master_status;
  end if;
  if new.admin_master_defined_method is not null
     and new.admin_master_defined_method not in ('self_elected', 'invited_other', 'auto_elected') then
    raise exception 'tenant_settings.admin_master_defined_method inválido: %', new.admin_master_defined_method;
  end if;
  return new;
end;
$fn$;

drop trigger if exists tg_tenant_settings_validate on public.tenant_settings;
create trigger tg_tenant_settings_validate before insert or update on public.tenant_settings
  for each row execute function public.tg_tenant_settings_validate();

create index if not exists tenant_settings_admin_master_status_idx
  on public.tenant_settings (admin_master_status);

-- ─── 2) Linha de settings garantida para todo tenant ────────────────────────
insert into public.tenant_settings (tenant_id)
select t.id from public.tenants t
where not exists (select 1 from public.tenant_settings s where s.tenant_id = t.id);

-- ─── 3) Backfill: tenants que já têm Admin Master ───────────────────────────
update public.tenant_settings s
   set admin_master_status        = 'defined',
       admin_master_defined_method = coalesce(s.admin_master_defined_method, 'self_elected'),
       admin_master_defined_at     = coalesce(s.admin_master_defined_at, now()),
       admin_master_defined_by     = coalesce(s.admin_master_defined_by, p.id)
  from public.profiles p
 where p.tenant_id = s.tenant_id
   and p.tenant_owner
   and s.admin_master_status is distinct from 'defined';

-- Conta de cadastro padrão: profile mais antigo do tenant, quando ainda nulo
update public.tenant_settings s
   set registrant_profile_id = c.id
  from (
    select distinct on (p.tenant_id) p.tenant_id, p.id
    from public.profiles p
    order by p.tenant_id, p.created_at asc nulls last, p.id asc
  ) c
 where c.tenant_id = s.tenant_id
   and s.registrant_profile_id is null;

-- Prazo de graça padrão a partir da criação do tenant
update public.tenant_settings s
   set admin_master_grace_until = t.created_at + make_interval(days => s.admin_master_grace_days)
  from public.tenants t
 where t.id = s.tenant_id
   and s.admin_master_grace_until is null
   and s.admin_master_status = 'pending';

-- ─── 4) Grants / RLS (mesmo padrão de protótipo já vigente) ─────────────────
grant select, insert, update, delete on public.tenant_settings to anon, authenticated;
grant all on public.tenant_settings to service_role;

alter table public.tenant_settings enable row level security;

drop policy if exists tenant_settings_inspection on public.tenant_settings;
create policy tenant_settings_inspection on public.tenant_settings
  for all using (true) with check (true);

commit;

-- Recarrega o cache de schema do PostgREST
notify pgrst, 'reload schema';
