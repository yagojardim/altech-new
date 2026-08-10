-- ============================================================================
-- RLS LOCKDOWN — substitui as policies permissivas *_inspection (USING true)
-- por policies reais escopadas por tenant / dono / papel, usando Supabase Auth.
--
-- Pré-requisito: supabase/sql/auth_link.sql já aplicado (profiles.auth_user_id).
-- Idempotente: pode ser reexecutado.
--
-- ATENÇÃO: depois de rodar este arquivo o acesso anônimo (Inspection Mode sem
-- login) deixa de ler/escrever dados. É necessário estar autenticado e ter um
-- profile ligado (profiles.auth_user_id = auth.users.id).
-- ============================================================================

-- ─── 1. Schema privado de helpers (fora da API exposta) ─────────────────────
create schema if not exists app;
revoke all on schema app from public, anon, authenticated;
grant usage on schema app to authenticated, service_role;

create or replace function app.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id from public.profiles p
  where p.auth_user_id = auth.uid()
  limit 1
$$;

create or replace function app.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.tenant_id from public.profiles p
  where p.auth_user_id = auth.uid()
  limit 1
$$;

create or replace function app.is_tenant_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    left join public.user_roles ur on ur.profile_id = p.id and ur.tenant_id = p.tenant_id
    left join public.roles r on r.id = ur.role_id
    where p.auth_user_id = auth.uid()
      and (
        p.tenant_owner is true
        or lower(coalesce(p.primary_role, '')) in ('admin', 'admin_master', 'administrador')
        or lower(coalesce(r.key, r.name, '')) in ('admin', 'admin_master', 'administrador')
      )
  )
$$;

revoke all on function app.current_profile_id(), app.current_tenant_id(), app.is_tenant_admin() from public;
grant execute on function app.current_profile_id(), app.current_tenant_id(), app.is_tenant_admin()
  to authenticated, service_role;

-- ─── 2. Limpa TODAS as policies existentes do schema public ─────────────────
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Garante RLS ligado e sem bypass em todas as tabelas do public
do $$
declare r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format('alter table public.%I enable row level security', r.relname);
    execute format('alter table public.%I force row level security', r.relname);
  end loop;
end $$;

-- Nenhum acesso anônimo ao Data API
do $$
declare r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format('revoke all on public.%I from anon', r.relname);
    execute format('grant select, insert, update, delete on public.%I to authenticated', r.relname);
    execute format('grant all on public.%I to service_role', r.relname);
  end loop;
end $$;

-- ─── 3. Policy genérica por tenant p/ toda tabela com coluna tenant_id ──────
do $$
declare r record;
begin
  for r in
    select c.relname as tbl
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attname = 'tenant_id'
                        and a.attnum > 0 and not a.attisdropped
    where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format($f$
      create policy %I on public.%I
      for all to authenticated
      using (tenant_id = app.current_tenant_id())
      with check (tenant_id = app.current_tenant_id())
    $f$, r.tbl || '_tenant_scope', r.tbl);
  end loop;
end $$;

-- ─── 4. Overrides para tabelas sensíveis ────────────────────────────────────

-- audit_logs: leitura só admin do tenant; insert só do próprio tenant; sem update/delete
drop policy if exists audit_logs_tenant_scope on public.audit_logs;
create policy audit_logs_admin_read on public.audit_logs
  for select to authenticated
  using (tenant_id = app.current_tenant_id() and app.is_tenant_admin());
create policy audit_logs_insert on public.audit_logs
  for insert to authenticated
  with check (tenant_id = app.current_tenant_id());
revoke update, delete on public.audit_logs from authenticated;

-- profiles: leitura no próprio tenant; escrita só self ou admin
drop policy if exists profiles_tenant_scope on public.profiles;
create policy profiles_read_tenant on public.profiles
  for select to authenticated
  using (tenant_id = app.current_tenant_id());
create policy profiles_update_self_or_admin on public.profiles
  for update to authenticated
  using (tenant_id = app.current_tenant_id() and (auth_user_id = auth.uid() or app.is_tenant_admin()))
  with check (tenant_id = app.current_tenant_id() and (auth_user_id = auth.uid() or app.is_tenant_admin()));
create policy profiles_admin_insert on public.profiles
  for insert to authenticated
  with check (tenant_id = app.current_tenant_id() and app.is_tenant_admin());
create policy profiles_admin_delete on public.profiles
  for delete to authenticated
  using (tenant_id = app.current_tenant_id() and app.is_tenant_admin());

-- tenants: sem tenant_id — leitura do próprio tenant, update só admin
create policy tenants_read_own on public.tenants
  for select to authenticated
  using (id = app.current_tenant_id());
create policy tenants_admin_update on public.tenants
  for update to authenticated
  using (id = app.current_tenant_id() and app.is_tenant_admin())
  with check (id = app.current_tenant_id() and app.is_tenant_admin());

-- Controle de acesso (privilege escalation): leitura escopada, escrita só admin
do $$
declare t text;
begin
  foreach t in array array['user_roles', 'permission_overrides', 'role_permissions'] loop
    execute format('drop policy if exists %I on public.%I', t || '_tenant_scope', t);
    execute format($f$
      create policy %I on public.%I for select to authenticated
      using (%s)
    $f$, t || '_read', t,
      case when t = 'role_permissions' then 'true' else 'tenant_id = app.current_tenant_id()' end);
    execute format($f$
      create policy %I on public.%I for all to authenticated
      using (app.is_tenant_admin() and %s)
      with check (app.is_tenant_admin() and %s)
    $f$, t || '_admin_write', t,
      case when t = 'role_permissions' then 'true' else 'tenant_id = app.current_tenant_id()' end,
      case when t = 'role_permissions' then 'true' else 'tenant_id = app.current_tenant_id()' end);
  end loop;
end $$;

-- Catálogos globais e definições: leitura autenticada, escrita só admin
do $$
declare t text;
begin
  foreach t in array array['roles', 'permissions', 'catalogs', 'modules', 'reserved_slugs', 'dashboards'] loop
    execute format('drop policy if exists %I on public.%I', t || '_tenant_scope', t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_read', t);
    execute format($f$
      create policy %I on public.%I for all to authenticated
      using (app.is_tenant_admin()) with check (app.is_tenant_admin())
    $f$, t || '_admin_write', t);
  end loop;
end $$;

-- catalog_values: tenant_id pode ser null (valor global) → leitura ampla, escrita admin
drop policy if exists catalog_values_tenant_scope on public.catalog_values;
create policy catalog_values_read on public.catalog_values
  for select to authenticated
  using (tenant_id is null or tenant_id = app.current_tenant_id());
create policy catalog_values_admin_write on public.catalog_values
  for all to authenticated
  using (app.is_tenant_admin() and (tenant_id is null or tenant_id = app.current_tenant_id()))
  with check (app.is_tenant_admin() and (tenant_id is null or tenant_id = app.current_tenant_id()));

-- Convites e eventos de reset: só admin do tenant
do $$
declare t text;
begin
  foreach t in array array['invitations', 'password_reset_events'] loop
    execute format('drop policy if exists %I on public.%I', t || '_tenant_scope', t);
    execute format($f$
      create policy %I on public.%I for all to authenticated
      using (tenant_id = app.current_tenant_id() and app.is_tenant_admin())
      with check (tenant_id = app.current_tenant_id() and app.is_tenant_admin())
    $f$, t || '_admin_only', t);
  end loop;
end $$;

-- Módulos do tenant / pedidos de ativação: leitura no tenant, escrita admin
do $$
declare t text;
begin
  foreach t in array array['tenant_modules', 'module_activation_requests'] loop
    execute format('drop policy if exists %I on public.%I', t || '_tenant_scope', t);
    execute format($f$
      create policy %I on public.%I for select to authenticated
      using (tenant_id = app.current_tenant_id())
    $f$, t || '_read', t);
    execute format($f$
      create policy %I on public.%I for all to authenticated
      using (tenant_id = app.current_tenant_id() and app.is_tenant_admin())
      with check (tenant_id = app.current_tenant_id() and app.is_tenant_admin())
    $f$, t || '_admin_write', t);
  end loop;
end $$;

-- Notificações: apenas do próprio usuário
drop policy if exists notifications_tenant_scope on public.notifications;
create policy notifications_own on public.notifications
  for all to authenticated
  using (tenant_id = app.current_tenant_id() and user_id = app.current_profile_id())
  with check (tenant_id = app.current_tenant_id() and user_id = app.current_profile_id());

-- Timesheets: dono, aprovador ou admin
drop policy if exists timesheets_tenant_scope on public.timesheets;
create policy timesheets_scope on public.timesheets
  for all to authenticated
  using (
    tenant_id = app.current_tenant_id()
    and (user_id = app.current_profile_id() or approver_id = app.current_profile_id() or app.is_tenant_admin())
  )
  with check (
    tenant_id = app.current_tenant_id()
    and (user_id = app.current_profile_id() or approver_id = app.current_profile_id() or app.is_tenant_admin())
  );

drop policy if exists timesheet_approvals_tenant_scope on public.timesheet_approvals;
create policy timesheet_approvals_scope on public.timesheet_approvals
  for all to authenticated
  using (
    tenant_id = app.current_tenant_id()
    and (
      approver_id = app.current_profile_id()
      or app.is_tenant_admin()
      or exists (
        select 1 from public.timesheets t
        where t.id = timesheet_id and t.tenant_id = timesheet_approvals.tenant_id
          and t.user_id = app.current_profile_id()
      )
    )
  )
  with check (
    tenant_id = app.current_tenant_id()
    and (approver_id = app.current_profile_id() or app.is_tenant_admin())
  );

-- Portal do cliente: contas do portal só admin escreve; leitura no tenant
drop policy if exists client_portal_users_tenant_scope on public.client_portal_users;
create policy client_portal_users_read on public.client_portal_users
  for select to authenticated
  using (tenant_id = app.current_tenant_id());
create policy client_portal_users_admin_write on public.client_portal_users
  for all to authenticated
  using (tenant_id = app.current_tenant_id() and app.is_tenant_admin())
  with check (tenant_id = app.current_tenant_id() and app.is_tenant_admin());

-- ─── 5. Funções SECURITY DEFINER expostas no schema public ──────────────────
-- check_slug: lógica movida para o schema privado; wrapper público é INVOKER.
create or replace function app.check_slug(p_slug text)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
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
$function$;

revoke all on function app.check_slug(text) from public;
grant execute on function app.check_slug(text) to authenticated, service_role;

create or replace function public.check_slug(p_slug text)
returns text
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select app.check_slug(p_slug)
$$;

revoke all on function public.check_slug(text) from public, anon;
grant execute on function public.check_slug(text) to authenticated, service_role;

-- ensure_fk é helper de DDL — não deve ser chamável pela API
revoke all on function public.ensure_fk(text, text, text[], text, text[], text) from public, anon, authenticated;

-- ─── 6. search_path imutável nas funções restantes ──────────────────────────
create or replace function public.tg_touch_row()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
begin
  new.updated_at  := now();
  new.row_version := coalesce(old.row_version, 0) + 1;
  return new;
end;
$function$;

-- Garante search_path em qualquer outra função public que ainda não tenha
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and (p.proconfig is null or not exists (
        select 1 from unnest(p.proconfig) c where c like 'search_path=%'
      ))
  loop
    execute format('alter function %s set search_path = public, pg_temp', r.sig);
  end loop;
end $$;

-- Trigger functions não precisam ser chamáveis via API
revoke all on function public.tg_touch_row() from public, anon, authenticated;
revoke all on function public.tg_tenants_validate() from public, anon, authenticated;
