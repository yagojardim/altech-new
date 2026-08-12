-- ============================================================================
-- Segurança — endurecimento (v2) das funções expostas na Data API
--
-- Corrige os lints:
--   0011_function_search_path_mutable
--   0028_anon_security_definer_function_executable
--   0029_authenticated_security_definer_function_executable
--
-- Regras aplicadas:
--   1. Toda função em `public` e `app` recebe search_path imutável.
--   2. Nenhuma função SECURITY DEFINER em `public` (schema exposto pela Data
--      API) fica executável por `anon` ou `authenticated`.
--   3. Trigger functions e helpers de DDL não são chamáveis pela API.
--   4. Novas funções criadas em `public` não recebem EXECUTE automático.
--
-- Idempotente: pode ser reexecutado com segurança.
-- ============================================================================

create schema if not exists app;
revoke all on schema app from public, anon, authenticated;
grant usage on schema app to service_role;

-- ─── 1. search_path imutável em TODAS as funções de public e app ────────────
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'app')
      and p.prokind in ('f', 'p')
      and (p.proconfig is null or not exists (
        select 1 from unnest(p.proconfig) c where c like 'search\_path=%'
      ))
  loop
    execute format('alter function %s set search_path = public, pg_temp', r.sig);
  end loop;
end $$;

-- ─── 2. Nenhuma SECURITY DEFINER de public exposta a anon/authenticated ─────
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.prokind in ('f', 'p')
  loop
    execute format('revoke all on function %s from public', r.sig);
    execute format('revoke all on function %s from anon', r.sig);
    execute format('revoke all on function %s from authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;

-- ─── 3. Mesma regra para o schema privado app (não exposto na Data API) ─────
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app'
      and p.prokind in ('f', 'p')
  loop
    execute format('revoke all on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;

-- ─── 4. Trigger functions e helpers de DDL fora do alcance da API ───────────
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (p.prorettype = 'trigger'::regtype
           or p.proname in ('ensure_fk', '__act_add_tenant_fk'))
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;

-- ─── 5. Sem EXECUTE automático para funções futuras em public ───────────────
alter default privileges in schema public revoke execute on functions from anon;
alter default privileges in schema public revoke execute on functions from authenticated;
revoke usage on schema app from anon, authenticated;

-- ─── 6. Verificação (deve retornar zero linhas) ─────────────────────────────
-- select p.oid::regprocedure
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and (p.proconfig is null
--        or (p.prosecdef and (has_function_privilege('anon', p.oid, 'execute')
--                             or has_function_privilege('authenticated', p.oid, 'execute'))));
