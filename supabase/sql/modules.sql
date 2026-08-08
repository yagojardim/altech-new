-- ============================================================================
-- Altech Project — domínio MÓDULOS PREMIUM
-- Cria 3 tabelas novas seguindo o padrão existente (client_portal.sql / timesheets.sql):
--   modules            → CATÁLOGO GLOBAL (sem tenant_id, compartilhado)
--   tenant_modules     → estado de ativação por tenant
--   module_activation_requests → solicitações de ativação por tenant
-- tenant_id nas operacionais + FK composta tenant-safe (helper com ::text),
-- created_at/by, updated_at/by, row_version, metadata jsonb, archived_at,
-- unique (tenant_id, id), trigger tg_touch_row, grants Data API,
-- RLS habilitado + policies de protótipo (*_inspection USING(true)).
-- NÃO altera nenhuma tabela existente. Idempotente: pode rodar várias vezes.
-- ============================================================================

begin;

-- ─── Helper: FK composta (tenant_id, <col>) -> <alvo>(tenant_id, id) ────────
create or replace function public.__modules_add_tenant_fk(
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

-- ─── 1) modules — catálogo global (sem tenant_id) ───────────────────────────
create table if not exists public.modules (
  id             uuid primary key default gen_random_uuid(),
  key            text not null unique,
  name           text not null,
  description    text,
  category       text,
  module_type    text,
  is_premium     boolean not null default false,
  is_future      boolean not null default false,
  is_preview     boolean not null default false,
  default_status text not null default 'not-contracted',
  display_order  integer not null default 0,
  icon           text,
  created_at     timestamptz not null default now(),
  created_by     uuid,
  updated_at     timestamptz not null default now(),
  updated_by     uuid,
  archived_at    timestamptz,
  metadata       jsonb not null default '{}'::jsonb,
  row_version    bigint not null default 1
);

create index if not exists modules_category_idx on public.modules (category);
create index if not exists modules_order_idx    on public.modules (display_order);

-- ─── 2) tenant_modules ──────────────────────────────────────────────────────
create table if not exists public.tenant_modules (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants (id) on delete cascade,
  module_id         uuid not null references public.modules (id) on delete cascade,
  status            text not null default 'not-contracted',
  activation_status text,
  contract_status   text,
  enabled_at        timestamptz,
  requested_at      timestamptz,
  requested_by      uuid,
  approved_at       timestamptz,
  approved_by       uuid,
  suspended_at      timestamptz,
  suspended_reason  text,
  created_at        timestamptz not null default now(),
  created_by        uuid,
  updated_at        timestamptz not null default now(),
  updated_by        uuid,
  archived_at       timestamptz,
  metadata          jsonb not null default '{}'::jsonb,
  row_version       bigint not null default 1,
  constraint tenant_modules_tenant_id_id_key unique (tenant_id, id)
);

select public.__modules_add_tenant_fk('tenant_modules', 'requested_by', 'profiles', 'tenant_modules_requested_by_fk', 'set null');
select public.__modules_add_tenant_fk('tenant_modules', 'approved_by',  'profiles', 'tenant_modules_approved_by_fk',  'set null');

create unique index if not exists tenant_modules_uniq
  on public.tenant_modules (tenant_id, module_id)
  where archived_at is null;
create index if not exists tenant_modules_tenant_idx on public.tenant_modules (tenant_id);
create index if not exists tenant_modules_module_idx on public.tenant_modules (tenant_id, module_id);
create index if not exists tenant_modules_status_idx on public.tenant_modules (tenant_id, status);

-- ─── 3) module_activation_requests ──────────────────────────────────────────
create table if not exists public.module_activation_requests (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete cascade,
  module_id       uuid not null references public.modules (id) on delete cascade,
  requested_by    uuid,
  request_status  text not null default 'pending',
  business_reason text,
  expected_use    text,
  priority        text not null default 'medium',
  notes           text,
  reviewed_at     timestamptz,
  reviewed_by     uuid,
  created_at      timestamptz not null default now(),
  created_by      uuid,
  updated_at      timestamptz not null default now(),
  updated_by      uuid,
  archived_at     timestamptz,
  metadata        jsonb not null default '{}'::jsonb,
  row_version     bigint not null default 1,
  constraint module_activation_requests_status_check
    check (request_status in ('pending', 'in-review', 'approved', 'rejected', 'cancelled')),
  constraint module_activation_requests_priority_check
    check (priority in ('low', 'medium', 'high', 'critical')),
  constraint module_activation_requests_tenant_id_id_key unique (tenant_id, id)
);

select public.__modules_add_tenant_fk('module_activation_requests', 'requested_by', 'profiles', 'module_activation_requests_requested_by_fk', 'set null');
select public.__modules_add_tenant_fk('module_activation_requests', 'reviewed_by',  'profiles', 'module_activation_requests_reviewed_by_fk',  'set null');

create index if not exists module_activation_requests_tenant_idx on public.module_activation_requests (tenant_id);
create index if not exists module_activation_requests_module_idx on public.module_activation_requests (tenant_id, module_id);
create index if not exists module_activation_requests_status_idx on public.module_activation_requests (tenant_id, request_status);

-- ─── Triggers de updated_at / row_version ───────────────────────────────────
drop trigger if exists tg_modules_touch on public.modules;
create trigger tg_modules_touch before update on public.modules
  for each row execute function public.tg_touch_row();

drop trigger if exists tg_tenant_modules_touch on public.tenant_modules;
create trigger tg_tenant_modules_touch before update on public.tenant_modules
  for each row execute function public.tg_touch_row();

drop trigger if exists tg_module_activation_requests_touch on public.module_activation_requests;
create trigger tg_module_activation_requests_touch before update on public.module_activation_requests
  for each row execute function public.tg_touch_row();

-- ─── Grants (Data API) ──────────────────────────────────────────────────────
grant select on public.modules to anon, authenticated;
grant select, insert, update, delete on public.tenant_modules             to anon, authenticated;
grant select, insert, update, delete on public.module_activation_requests to anon, authenticated;
grant all on public.modules                    to service_role;
grant all on public.tenant_modules             to service_role;
grant all on public.module_activation_requests to service_role;

-- ─── RLS + policies ─────────────────────────────────────────────────────────
alter table public.modules                    enable row level security;
alter table public.tenant_modules             enable row level security;
alter table public.module_activation_requests enable row level security;

-- catálogo global: leitura liberada
drop policy if exists modules_read_all on public.modules;
create policy modules_read_all on public.modules
  for select using (true);

drop policy if exists tenant_modules_inspection on public.tenant_modules;
create policy tenant_modules_inspection on public.tenant_modules
  for all using (true) with check (true);

drop policy if exists module_activation_requests_inspection on public.module_activation_requests;
create policy module_activation_requests_inspection on public.module_activation_requests
  for all using (true) with check (true);

-- ─── Seed do catálogo global (idempotente por key) ──────────────────────────
insert into public.modules
  (key, name, description, category, module_type, is_premium, is_future, is_preview, default_status, display_order, icon)
values
  ('MEETING_INTELLIGENCE', 'Meeting Intelligence',
   'Transcrição automática, resumo executivo por IA e extração de action items vinculados às issues do board.',
   'intelligence', 'premium', true, false, false, 'not-contracted', 10, '🎙️'),
  ('AI_INSIGHTS', 'AI Insights',
   'Análise preditiva de riscos, previsão de entrega, padrões de velocity e recomendações para o portfólio.',
   'intelligence', 'premium', true, true, false, 'planned', 20, '🧠'),
  ('AGENDA_INTEGRADA', 'Agenda Integrada',
   'Calendário unificado de sprints, entregas, reuniões e marcos, com sincronização Google Calendar / Outlook.',
   'integration', 'standard', false, false, true, 'preview', 30, '📅'),
  ('CLIENT_PORTAL', 'Client Portal / Altech View',
   'Portal de transparência para clientes: status do projeto, validação de entregas e comunicação com o time.',
   'external', 'standard', false, false, false, 'implementado', 40, '🌐'),
  ('COMMUNITY', 'Community',
   'Rede de times e partilha de práticas, templates e retrospectivas entre tenants do ecossistema Altech.',
   'community', 'standard', false, true, false, 'coming-soon', 50, '🤝'),
  ('ACADEMY', 'Academy',
   'Trilhas de aprendizado e micro-certificações em Agile, Produto e Engenharia integradas ao contexto do time.',
   'community', 'premium', true, true, false, 'planned', 60, '🎓'),
  ('FINANCIAL_USER', 'Financial User',
   'Perfil financeiro com budget por projeto, aprovações de custo e relatórios de horas × custo.',
   'governance', 'premium', true, false, false, 'not-contracted', 70, '💼'),
  ('BACKUP_PREMIUM', 'Backup Premium',
   'Backup automatizado com retenção configurável, histórico versionado e restauração pontual do tenant.',
   'security', 'premium', true, false, false, 'not-contracted', 80, '🔒')
on conflict (key) do update set
  name           = excluded.name,
  description    = excluded.description,
  category       = excluded.category,
  module_type    = excluded.module_type,
  is_premium     = excluded.is_premium,
  is_future      = excluded.is_future,
  is_preview     = excluded.is_preview,
  default_status = excluded.default_status,
  display_order  = excluded.display_order,
  icon           = excluded.icon;

drop function if exists public.__modules_add_tenant_fk(text, text, text, text, text);

commit;
