-- ============================================================================
-- Segurança — remove definitivamente as policies permissivas *_inspection
-- (USING true para anon/authenticated) que reapareceram no schema public,
-- e restaura o modelo tenant-scoped do rls_lockdown.sql.
-- Idempotente.
-- ============================================================================

-- 1) Drop de todas as policies *_inspection
do $$
declare r record;
begin
  for r in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public' and policyname like '%\_inspection'
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 2) RLS ligado + forçado, e nenhum acesso anônimo ao Data API
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
    execute format('revoke all on public.%I from anon', r.relname);
    execute format('grant all on public.%I to service_role', r.relname);
  end loop;
end $$;

revoke usage on schema public from public, anon;
grant usage on schema public to authenticated, service_role;
alter default privileges in schema public revoke execute on functions from anon;

-- 3) Toda tabela com tenant_id que ficou sem policy volta ao escopo de tenant
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
      and not exists (
        select 1 from pg_policies p
        where p.schemaname = 'public' and p.tablename = c.relname
      )
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', r.tbl);
    execute format($f$
      create policy %I on public.%I
      for all to authenticated
      using (tenant_id = app.current_tenant_id())
      with check (tenant_id = app.current_tenant_id())
    $f$, r.tbl || '_tenant_scope', r.tbl);
  end loop;
end $$;

-- 4) Catálogos globais sem tenant_id: leitura autenticada, escrita só admin
do $$
declare t text;
begin
  foreach t in array array['roles', 'permissions', 'catalogs', 'modules', 'reserved_slugs', 'dashboards'] loop
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t) then
      execute format('grant select, insert, update, delete on public.%I to authenticated', t);
      execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_read', t);
      execute format($f$
        create policy %I on public.%I for all to authenticated
        using (app.is_tenant_admin()) with check (app.is_tenant_admin())
      $f$, t || '_admin_write', t);
    end if;
  end loop;
end $$;

-- 5) app_user_connections: server-only (edge functions com service_role).
--    Sem policies e sem grants para anon/authenticated => o navegador nunca lê
--    a chave de conexão cifrada de terceiros.
revoke all on public.app_user_connections from anon, authenticated;
grant select, insert, update, delete on public.app_user_connections to service_role;

-- 6) activation_tokens: nunca anônimo; só admin do tenant e service_role,
--    e o token_hash deixa de ser legível pela API.
revoke all on public.activation_tokens from anon, authenticated;
grant select (id, tenant_id, profile_id, purpose, expires_at, used_at, created_at, created_by, metadata)
  on public.activation_tokens to authenticated;
grant insert, update, delete on public.activation_tokens to authenticated;
grant all on public.activation_tokens to service_role;

-- 7) public.current_tenant_id(): wrapper SECURITY DEFINER não executável pela API
revoke all on function public.current_tenant_id() from public, anon, authenticated;
grant execute on function public.current_tenant_id() to service_role;

-- 8) Nenhuma função SECURITY DEFINER em public executável por anon/authenticated
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;

notify pgrst, 'reload schema';
