-- ============================================================================
-- Segurança — revoga EXECUTE de funções SECURITY DEFINER no schema `public`
-- Lint: 0029_authenticated_security_definer_function_executable
--
-- As policies de RLS usam app.current_tenant_id()/app.is_tenant_admin()
-- (schema privado, executado com privilégios do owner via SECURITY DEFINER),
-- portanto revogar EXECUTE dos wrappers em `public` não afeta o app.
-- Idempotente.
-- ============================================================================

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

-- Novas funções em public não recebem EXECUTE automático
alter default privileges in schema public revoke execute on functions from anon;
alter default privileges in schema public revoke execute on functions from authenticated;

notify pgrst, 'reload schema';
