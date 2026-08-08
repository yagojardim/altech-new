-- ============================================================================
-- Altech Project — ADMIN MASTER (dono do tenant)
--   ALTER  profiles → tenant_owner, primary_role, first_access_at, last_access_at
--   Índice único parcial: no máximo 1 owner por tenant
--   UPDATE idempotente: promove o Admin atual de cada tenant a ADMIN_MASTER
-- Admin Master é o dono do TENANT — NÃO é o SUPER_ADMIN da Altech (Control).
-- Sem billing. Idempotente: pode rodar várias vezes.
-- ============================================================================

begin;

-- ─── 1) Colunas ─────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists tenant_owner         boolean not null default false;
alter table public.profiles add column if not exists primary_role         text;
alter table public.profiles add column if not exists first_access_at      timestamptz;
alter table public.profiles add column if not exists last_access_at       timestamptz;
alter table public.profiles add column if not exists password_must_change boolean not null default false;

-- ─── 2) No máximo 1 Admin Master por tenant ─────────────────────────────────
create unique index if not exists profiles_tenant_owner_uniq
  on public.profiles (tenant_id)
  where tenant_owner;

create index if not exists profiles_primary_role_idx on public.profiles (tenant_id, primary_role);

-- ─── 3) Promoção idempotente do Admin atual de cada tenant ──────────────────
-- Escolhe 1 profile Admin por tenant (menor created_at) e marca como owner,
-- apenas se o tenant ainda não tiver um owner. Nunca duplica.
with existing as (
  select tenant_id from public.profiles where tenant_owner
),
candidate as (
  select distinct on (p.tenant_id) p.id, p.tenant_id
  from public.profiles p
  where p.tenant_id not in (select tenant_id from existing)
    and exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = p.id
        and ur.tenant_id = p.tenant_id
        and (r.key ilike 'admin%' or r.label ilike 'admin%')
    )
  order by p.tenant_id, p.created_at asc nulls last, p.id asc
)
update public.profiles p
   set tenant_owner = true,
       primary_role = 'ADMIN_MASTER'
  from candidate c
 where p.id = c.id
   and p.tenant_owner is distinct from true;

-- Trilha de auditoria da promoção (idempotente: só grava o que mudou agora)
insert into public.audit_logs (tenant_id, entity_type, entity_id, action, actor_name, before, after)
select p.tenant_id, 'profile', p.id::text, 'admin_master_activated', 'system', null,
       jsonb_build_object('primary_role', 'ADMIN_MASTER', 'tenant_owner', true)
from public.profiles p
where p.tenant_owner
  and p.primary_role = 'ADMIN_MASTER'
  and not exists (
    select 1 from public.audit_logs a
    where a.entity_type = 'profile'
      and a.entity_id = p.id::text
      and a.action = 'admin_master_activated'
  );

commit;
