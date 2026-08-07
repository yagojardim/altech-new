-- ============================================================================
-- Altech Project — domínio HORAS (Timesheet)
-- Cria 3 tabelas novas seguindo o padrão multi-tenant existente:
--   tenant_id em todas + FK composta tenant-safe onde aplicável,
--   created_at/by, updated_at/by, row_version, metadata jsonb, archived_at,
--   unique (tenant_id, id), trigger tg_touch_row, grants Data API,
--   RLS habilitado + policy permissiva de protótipo (*_inspection USING(true)).
-- NÃO altera nenhuma tabela existente. Idempotente: pode rodar várias vezes.
-- ============================================================================

begin;

-- ─── Helper: cria FK composta (tenant_id, <col>) -> <alvo>(tenant_id, id)
-- quando o alvo possui a chave única composta; caso contrário cai para a FK
-- simples em <alvo>(id). Não recria FKs já existentes.
create or replace function public.__hours_add_tenant_fk(
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

-- ─── 1) timesheets ──────────────────────────────────────────────────────────
create table if not exists public.timesheets (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id) on delete cascade,
  user_id       uuid not null,
  project_id    uuid not null,
  work_item_id  uuid,
  date          date not null default current_date,
  hours         numeric(6,2) not null default 0,
  description   text,
  status        text not null default 'draft',
  month         text,
  approver_id   uuid,
  created_at    timestamptz not null default now(),
  created_by    uuid,
  updated_at    timestamptz not null default now(),
  updated_by    uuid,
  archived_at   timestamptz,
  metadata      jsonb not null default '{}'::jsonb,
  row_version   bigint not null default 1,
  constraint timesheets_status_check
    check (status in ('draft', 'submitted', 'approved', 'rejected')),
  constraint timesheets_hours_check check (hours >= 0),
  constraint timesheets_tenant_id_id_key unique (tenant_id, id)
);

select public.__hours_add_tenant_fk('timesheets', 'user_id',      'profiles',   'timesheets_user_fk',     'cascade');
select public.__hours_add_tenant_fk('timesheets', 'project_id',   'projects',   'timesheets_project_fk',  'cascade');
select public.__hours_add_tenant_fk('timesheets', 'work_item_id', 'work_items', 'timesheets_item_fk',     'set null');
select public.__hours_add_tenant_fk('timesheets', 'approver_id',  'profiles',   'timesheets_approver_fk', 'set null');

create index if not exists timesheets_tenant_idx    on public.timesheets (tenant_id);
create index if not exists timesheets_project_idx   on public.timesheets (tenant_id, project_id);
create index if not exists timesheets_user_idx      on public.timesheets (tenant_id, user_id);
create index if not exists timesheets_month_idx     on public.timesheets (tenant_id, user_id, month);
create index if not exists timesheets_status_idx    on public.timesheets (tenant_id, status);
create index if not exists timesheets_date_idx      on public.timesheets (tenant_id, date desc);

-- ─── 2) timesheet_approvals ─────────────────────────────────────────────────
create table if not exists public.timesheet_approvals (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id) on delete cascade,
  timesheet_id  uuid not null,
  approver_id   uuid,
  decision      text not null,
  reason        text,
  created_at    timestamptz not null default now(),
  created_by    uuid,
  updated_at    timestamptz not null default now(),
  updated_by    uuid,
  archived_at   timestamptz,
  metadata      jsonb not null default '{}'::jsonb,
  row_version   bigint not null default 1,
  constraint timesheet_approvals_decision_check
    check (decision in ('approved', 'rejected')),
  constraint timesheet_approvals_tenant_id_id_key unique (tenant_id, id)
);

select public.__hours_add_tenant_fk(
  'timesheet_approvals', 'timesheet_id', 'timesheets', 'timesheet_approvals_timesheet_fk', 'cascade');
select public.__hours_add_tenant_fk(
  'timesheet_approvals', 'approver_id',  'profiles',   'timesheet_approvals_approver_fk',  'set null');

create index if not exists timesheet_approvals_tenant_idx    on public.timesheet_approvals (tenant_id);
create index if not exists timesheet_approvals_timesheet_idx on public.timesheet_approvals (tenant_id, timesheet_id);
create index if not exists timesheet_approvals_approver_idx  on public.timesheet_approvals (tenant_id, approver_id);

-- ─── 3) approver_squads ─────────────────────────────────────────────────────
create table if not exists public.approver_squads (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  approver_id  uuid not null,
  squad_id     uuid not null,
  created_at   timestamptz not null default now(),
  created_by   uuid,
  updated_at   timestamptz not null default now(),
  updated_by   uuid,
  archived_at  timestamptz,
  metadata     jsonb not null default '{}'::jsonb,
  row_version  bigint not null default 1,
  constraint approver_squads_tenant_id_id_key unique (tenant_id, id)
);

select public.__hours_add_tenant_fk('approver_squads', 'approver_id', 'profiles', 'approver_squads_approver_fk', 'cascade');
select public.__hours_add_tenant_fk('approver_squads', 'squad_id',    'squads',   'approver_squads_squad_fk',    'cascade');

create unique index if not exists approver_squads_uniq
  on public.approver_squads (tenant_id, approver_id, squad_id)
  where archived_at is null;
create index if not exists approver_squads_tenant_idx on public.approver_squads (tenant_id);
create index if not exists approver_squads_squad_idx  on public.approver_squads (tenant_id, squad_id);

-- ─── Triggers de updated_at / row_version (função já existente) ─────────────
drop trigger if exists tg_timesheets_touch on public.timesheets;
create trigger tg_timesheets_touch before update on public.timesheets
  for each row execute function public.tg_touch_row();

drop trigger if exists tg_timesheet_approvals_touch on public.timesheet_approvals;
create trigger tg_timesheet_approvals_touch before update on public.timesheet_approvals
  for each row execute function public.tg_touch_row();

drop trigger if exists tg_approver_squads_touch on public.approver_squads;
create trigger tg_approver_squads_touch before update on public.approver_squads
  for each row execute function public.tg_touch_row();

-- ─── Grants (Data API) ──────────────────────────────────────────────────────
grant select, insert, update, delete on public.timesheets          to anon, authenticated;
grant select, insert, update, delete on public.timesheet_approvals to anon, authenticated;
grant select, insert, update, delete on public.approver_squads     to anon, authenticated;
grant all on public.timesheets          to service_role;
grant all on public.timesheet_approvals to service_role;
grant all on public.approver_squads     to service_role;

-- ─── RLS + policies de protótipo (mesmo padrão *_inspection USING(true)) ────
alter table public.timesheets          enable row level security;
alter table public.timesheet_approvals enable row level security;
alter table public.approver_squads     enable row level security;

drop policy if exists timesheets_inspection on public.timesheets;
create policy timesheets_inspection on public.timesheets
  for all using (true) with check (true);

drop policy if exists timesheet_approvals_inspection on public.timesheet_approvals;
create policy timesheet_approvals_inspection on public.timesheet_approvals
  for all using (true) with check (true);

drop policy if exists approver_squads_inspection on public.approver_squads;
create policy approver_squads_inspection on public.approver_squads
  for all using (true) with check (true);

drop function if exists public.__hours_add_tenant_fk(text, text, text, text, text);

commit;
