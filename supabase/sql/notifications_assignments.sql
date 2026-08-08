-- ============================================================================
-- Altech Project — domínios NOTIFICAÇÕES e ATRIBUIÇÃO DE CARDS
-- Cria 2 tabelas novas seguindo o padrão existente
-- (client_portal.sql / timesheets.sql / modules.sql):
--   notifications          → caixa de entrada / sino do Header, por usuário
--   dashboard_assignments  → cards de relatório fixados por usuário/dashboard
-- tenant_id em todas + FK composta tenant-safe (helper com ::text),
-- created_at/by, updated_at/by, row_version, metadata jsonb, archived_at,
-- unique (tenant_id, id), trigger tg_touch_row, grants Data API,
-- RLS habilitado + policies de protótipo (*_inspection USING(true)).
-- NÃO altera nenhuma tabela existente. Idempotente: pode rodar várias vezes.
-- ============================================================================

begin;

-- ─── Helper: FK composta (tenant_id, <col>) -> <alvo>(tenant_id, id) ────────
create or replace function public.__notif_add_tenant_fk(
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

-- ─── 1) notifications ───────────────────────────────────────────────────────
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  user_id     uuid not null,
  type        text not null default 'info',
  entity_type text,
  entity_id   text,
  title       text not null,
  body        text,
  read        boolean not null default false,
  created_at  timestamptz not null default now(),
  created_by  uuid,
  updated_at  timestamptz not null default now(),
  updated_by  uuid,
  archived_at timestamptz,
  metadata    jsonb not null default '{}'::jsonb,
  row_version bigint not null default 1,
  constraint notifications_tenant_id_id_key unique (tenant_id, id)
);

select public.__notif_add_tenant_fk('notifications', 'user_id', 'profiles', 'notifications_user_id_fk', 'cascade');

create index if not exists notifications_tenant_idx      on public.notifications (tenant_id);
create index if not exists notifications_tenant_user_idx on public.notifications (tenant_id, user_id);
create index if not exists notifications_unread_idx      on public.notifications (tenant_id, user_id, read);
create index if not exists notifications_entity_idx      on public.notifications (tenant_id, entity_type, entity_id);

-- ─── 2) dashboard_assignments ───────────────────────────────────────────────
create table if not exists public.dashboard_assignments (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id) on delete cascade,
  user_id       uuid not null,
  dashboard_key text not null,
  card_id       text not null,
  card_title    text not null,
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  created_by    uuid,
  updated_at    timestamptz not null default now(),
  updated_by    uuid,
  archived_at   timestamptz,
  metadata      jsonb not null default '{}'::jsonb,
  row_version   bigint not null default 1,
  constraint dashboard_assignments_tenant_id_id_key unique (tenant_id, id)
);

select public.__notif_add_tenant_fk('dashboard_assignments', 'user_id', 'profiles', 'dashboard_assignments_user_id_fk', 'cascade');

create unique index if not exists dashboard_assignments_uniq
  on public.dashboard_assignments (tenant_id, user_id, dashboard_key, card_id)
  where archived_at is null;
create index if not exists dashboard_assignments_tenant_idx on public.dashboard_assignments (tenant_id);
create index if not exists dashboard_assignments_user_idx   on public.dashboard_assignments (tenant_id, user_id);
create index if not exists dashboard_assignments_dash_idx   on public.dashboard_assignments (tenant_id, dashboard_key);

-- ─── Triggers de updated_at / row_version ───────────────────────────────────
drop trigger if exists tg_notifications_touch on public.notifications;
create trigger tg_notifications_touch before update on public.notifications
  for each row execute function public.tg_touch_row();

drop trigger if exists tg_dashboard_assignments_touch on public.dashboard_assignments;
create trigger tg_dashboard_assignments_touch before update on public.dashboard_assignments
  for each row execute function public.tg_touch_row();

-- ─── Grants (Data API) ──────────────────────────────────────────────────────
grant select, insert, update, delete on public.notifications          to anon, authenticated;
grant select, insert, update, delete on public.dashboard_assignments  to anon, authenticated;
grant all on public.notifications         to service_role;
grant all on public.dashboard_assignments to service_role;

-- ─── RLS + policies (protótipo) ─────────────────────────────────────────────
alter table public.notifications         enable row level security;
alter table public.dashboard_assignments enable row level security;

drop policy if exists notifications_inspection on public.notifications;
create policy notifications_inspection on public.notifications
  for all using (true) with check (true);

drop policy if exists dashboard_assignments_inspection on public.dashboard_assignments;
create policy dashboard_assignments_inspection on public.dashboard_assignments
  for all using (true) with check (true);

drop function if exists public.__notif_add_tenant_fk(text, text, text, text, text);

commit;
