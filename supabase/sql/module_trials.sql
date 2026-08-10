-- ============================================================================
-- Altech Project — J4: MÓDULOS · Trial + Entitlements
--   modules.trial_duration_days           → override de duração do teste
--   tenant_modules.contract_status        → status COMERCIAL
--   tenant_modules.technical_health       → SAÚDE TÉCNICA (não misturar)
--   module_trials                         → períodos de teste por tenant
--   module_entitlements                   → a "chave" que libera o módulo
-- RLS habilitada + policies de protótipo (*_inspection USING(true)).
-- Sem billing / checkout (isso é Altech Control). Idempotente.
-- ============================================================================

begin;

-- ─── 1) modules.trial_duration_days ─────────────────────────────────────────
alter table public.modules
  add column if not exists trial_duration_days integer not null default 30;

update public.modules set trial_duration_days = 30 where trial_duration_days is null;

-- ─── 2) tenant_modules: status comercial x saúde técnica ────────────────────
alter table public.tenant_modules
  add column if not exists contract_status text not null default 'not_contracted';

alter table public.tenant_modules
  add column if not exists technical_health text not null default 'operational';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tenant_modules_contract_status_chk'
      and connamespace = 'public'::regnamespace
  ) then
    alter table public.tenant_modules
      add constraint tenant_modules_contract_status_chk
      check (contract_status in (
        'included','trial_available','trialing','trial_expired','pending_activation',
        'active','past_due','suspended','not_contracted','planned'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'tenant_modules_technical_health_chk'
      and connamespace = 'public'::regnamespace
  ) then
    alter table public.tenant_modules
      add constraint tenant_modules_technical_health_chk
      check (technical_health in ('operational','degraded','maintenance','unavailable'));
  end if;
end$$;

-- ─── 3) module_trials ───────────────────────────────────────────────────────
create table if not exists public.module_trials (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id) on delete cascade,
  module_id     uuid not null references public.modules (id) on delete cascade,
  started_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  status        text not null default 'active'
                check (status in ('available','active','expiring','expired','converted','cancelled')),
  activated_by  uuid,
  converted_at  timestamptz,
  cancelled_at  timestamptz,
  created_at    timestamptz not null default now(),
  metadata      jsonb not null default '{}'::jsonb
);

create unique index if not exists module_trials_one_active_idx
  on public.module_trials (tenant_id, module_id) where status = 'active';
create index if not exists module_trials_tenant_module_idx
  on public.module_trials (tenant_id, module_id);

alter table public.module_trials enable row level security;
drop policy if exists module_trials_inspection on public.module_trials;
create policy module_trials_inspection on public.module_trials
  for all using (true) with check (true);

grant select, insert, update, delete on public.module_trials to authenticated;
grant all on public.module_trials to service_role;

-- ─── 4) module_entitlements ─────────────────────────────────────────────────
create table if not exists public.module_entitlements (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  module_id   uuid not null references public.modules (id) on delete cascade,
  source      text not null check (source in ('trial','contract')),
  status      text not null default 'active' check (status in ('active','expired','revoked')),
  granted_at  timestamptz not null default now(),
  expires_at  timestamptz,
  trial_id    uuid references public.module_trials (id) on delete set null,
  created_by  uuid,
  metadata    jsonb not null default '{}'::jsonb
);

create index if not exists module_entitlements_lookup_idx
  on public.module_entitlements (tenant_id, module_id, status);

alter table public.module_entitlements enable row level security;
drop policy if exists module_entitlements_inspection on public.module_entitlements;
create policy module_entitlements_inspection on public.module_entitlements
  for all using (true) with check (true);

grant select, insert, update, delete on public.module_entitlements to authenticated;
grant all on public.module_entitlements to service_role;

commit;

-- Recarregar o cache de schema do PostgREST:
notify pgrst, 'reload schema';
