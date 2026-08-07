-- ============================================================================
-- Altech Project — domínio PORTAL DO CLIENTE
-- Cria 4 tabelas novas seguindo o padrão multi-tenant existente:
--   tenant_id em todas + FK composta tenant-safe onde aplicável,
--   created_at/by, updated_at/by, row_version, metadata jsonb, archived_at,
--   RLS habilitado + policy permissiva de protótipo (*_inspection USING(true)).
-- NÃO altera nenhuma tabela existente. Idempotente: pode rodar várias vezes.
-- ============================================================================

begin;

-- ─── Helper: cria FK composta (tenant_id, <col>) -> <alvo>(tenant_id, id)
-- quando o alvo possui a chave única composta; caso contrário cai para a FK
-- simples em <alvo>(id). Não recria FKs já existentes.
create or replace function public.__portal_add_tenant_fk(
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
    having array_agg(a.attname order by k.ord) = array['tenant_id', 'id']
        or array_agg(a.attname order by k.ord) = array['id', 'tenant_id']
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

-- ─── 1) client_portal_users ─────────────────────────────────────────────────
create table if not exists public.client_portal_users (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references public.tenants (id) on delete cascade,
  project_id            uuid not null,
  name                  text not null,
  email                 text not null,
  portal_role           text not null default 'viewer',
  can_approve           boolean not null default false,
  can_preview           boolean not null default true,
  can_comment           boolean not null default true,
  password_must_change  boolean not null default true,
  status                text not null default 'invited',
  created_at            timestamptz not null default now(),
  created_by            uuid,
  updated_at            timestamptz not null default now(),
  updated_by            uuid,
  archived_at           timestamptz,
  metadata              jsonb not null default '{}'::jsonb,
  row_version           bigint not null default 1,
  constraint client_portal_users_portal_role_check
    check (portal_role in ('viewer', 'portal-admin')),
  constraint client_portal_users_status_check
    check (status in ('invited', 'pending', 'active', 'blocked', 'inactive')),
  constraint client_portal_users_tenant_id_id_key unique (tenant_id, id)
);

select public.__portal_add_tenant_fk(
  'client_portal_users', 'project_id', 'projects', 'client_portal_users_project_fk', 'cascade');

create unique index if not exists client_portal_users_project_email_uniq
  on public.client_portal_users (tenant_id, project_id, lower(email))
  where archived_at is null;
create index if not exists client_portal_users_tenant_idx  on public.client_portal_users (tenant_id);
create index if not exists client_portal_users_project_idx on public.client_portal_users (tenant_id, project_id);

-- ─── 2) client_signals ──────────────────────────────────────────────────────
create table if not exists public.client_signals (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references public.tenants (id) on delete cascade,
  project_id            uuid not null,
  type                  text not null,
  item_id               uuid,
  item_title            text,
  author                text,
  responsible_po        uuid,
  body                  text,
  po_reply              text,
  read_by_po            boolean not null default false,
  reply_read_by_client  boolean not null default false,
  created_at            timestamptz not null default now(),
  created_by            uuid,
  updated_at            timestamptz not null default now(),
  updated_by            uuid,
  archived_at           timestamptz,
  metadata              jsonb not null default '{}'::jsonb,
  row_version           bigint not null default 1,
  constraint client_signals_type_check check (type in ('comment', 'approval')),
  constraint client_signals_tenant_id_id_key unique (tenant_id, id)
);

select public.__portal_add_tenant_fk(
  'client_signals', 'project_id',     'projects',   'client_signals_project_fk',   'cascade');
select public.__portal_add_tenant_fk(
  'client_signals', 'item_id',        'work_items', 'client_signals_item_fk',      'set null');
select public.__portal_add_tenant_fk(
  'client_signals', 'responsible_po', 'profiles',   'client_signals_po_fk',        'set null');

create index if not exists client_signals_tenant_idx   on public.client_signals (tenant_id);
create index if not exists client_signals_project_idx  on public.client_signals (tenant_id, project_id);
create index if not exists client_signals_item_idx     on public.client_signals (tenant_id, item_id);
create index if not exists client_signals_unread_idx   on public.client_signals (tenant_id, project_id, read_by_po);
create index if not exists client_signals_created_idx  on public.client_signals (tenant_id, created_at desc);

-- ─── 3) client_approvals ────────────────────────────────────────────────────
create table if not exists public.client_approvals (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete cascade,
  project_id      uuid not null,
  work_item_id    uuid not null,
  client_user_id  uuid,
  status          text not null default 'pending',
  decided_at      timestamptz,
  created_at      timestamptz not null default now(),
  created_by      uuid,
  updated_at      timestamptz not null default now(),
  updated_by      uuid,
  archived_at     timestamptz,
  metadata        jsonb not null default '{}'::jsonb,
  row_version     bigint not null default 1,
  constraint client_approvals_status_check
    check (status in ('pending', 'approved', 'rejected', 'changes_requested')),
  constraint client_approvals_tenant_id_id_key unique (tenant_id, id)
);

select public.__portal_add_tenant_fk(
  'client_approvals', 'project_id',     'projects',            'client_approvals_project_fk',  'cascade');
select public.__portal_add_tenant_fk(
  'client_approvals', 'work_item_id',   'work_items',          'client_approvals_item_fk',     'cascade');
select public.__portal_add_tenant_fk(
  'client_approvals', 'client_user_id', 'client_portal_users', 'client_approvals_user_fk',     'set null');

create index if not exists client_approvals_tenant_idx  on public.client_approvals (tenant_id);
create index if not exists client_approvals_project_idx on public.client_approvals (tenant_id, project_id);
create index if not exists client_approvals_item_idx    on public.client_approvals (tenant_id, work_item_id);
create index if not exists client_approvals_status_idx  on public.client_approvals (tenant_id, status);

-- ─── 4) shared_project_items ────────────────────────────────────────────────
create table if not exists public.shared_project_items (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants (id) on delete cascade,
  project_id          uuid not null,
  shared_entity_type  text not null,
  shared_entity_id    uuid not null,
  visibility          text not null default 'client',
  created_at          timestamptz not null default now(),
  created_by          uuid,
  updated_at          timestamptz not null default now(),
  updated_by          uuid,
  archived_at         timestamptz,
  metadata            jsonb not null default '{}'::jsonb,
  row_version         bigint not null default 1,
  constraint shared_project_items_visibility_check
    check (visibility in ('internal', 'client', 'public')),
  constraint shared_project_items_tenant_id_id_key unique (tenant_id, id)
);

select public.__portal_add_tenant_fk(
  'shared_project_items', 'project_id', 'projects', 'shared_project_items_project_fk', 'cascade');

create unique index if not exists shared_project_items_uniq
  on public.shared_project_items (tenant_id, project_id, shared_entity_type, shared_entity_id)
  where archived_at is null;
create index if not exists shared_project_items_tenant_idx  on public.shared_project_items (tenant_id);
create index if not exists shared_project_items_project_idx on public.shared_project_items (tenant_id, project_id);

-- ─── Triggers de updated_at / row_version (função já existente) ─────────────
drop trigger if exists tg_client_portal_users_touch  on public.client_portal_users;
create trigger tg_client_portal_users_touch  before update on public.client_portal_users
  for each row execute function public.tg_touch_row();

drop trigger if exists tg_client_signals_touch on public.client_signals;
create trigger tg_client_signals_touch before update on public.client_signals
  for each row execute function public.tg_touch_row();

drop trigger if exists tg_client_approvals_touch on public.client_approvals;
create trigger tg_client_approvals_touch before update on public.client_approvals
  for each row execute function public.tg_touch_row();

drop trigger if exists tg_shared_project_items_touch on public.shared_project_items;
create trigger tg_shared_project_items_touch before update on public.shared_project_items
  for each row execute function public.tg_touch_row();

-- ─── Grants (Data API) ──────────────────────────────────────────────────────
grant select, insert, update, delete on public.client_portal_users    to anon, authenticated;
grant select, insert, update, delete on public.client_signals         to anon, authenticated;
grant select, insert, update, delete on public.client_approvals       to anon, authenticated;
grant select, insert, update, delete on public.shared_project_items   to anon, authenticated;
grant all on public.client_portal_users  to service_role;
grant all on public.client_signals       to service_role;
grant all on public.client_approvals     to service_role;
grant all on public.shared_project_items to service_role;

-- ─── RLS + policies de protótipo (mesmo padrão *_inspection USING(true)) ────
alter table public.client_portal_users   enable row level security;
alter table public.client_signals        enable row level security;
alter table public.client_approvals      enable row level security;
alter table public.shared_project_items  enable row level security;

drop policy if exists client_portal_users_inspection  on public.client_portal_users;
create policy client_portal_users_inspection  on public.client_portal_users
  for all using (true) with check (true);

drop policy if exists client_signals_inspection on public.client_signals;
create policy client_signals_inspection on public.client_signals
  for all using (true) with check (true);

drop policy if exists client_approvals_inspection on public.client_approvals;
create policy client_approvals_inspection on public.client_approvals
  for all using (true) with check (true);

drop policy if exists shared_project_items_inspection on public.shared_project_items;
create policy shared_project_items_inspection on public.shared_project_items
  for all using (true) with check (true);

drop function if exists public.__portal_add_tenant_fk(text, text, text, text, text);

commit;
