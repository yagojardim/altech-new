-- ============================================================================
-- Segurança — endurecimento de funções do schema `public`
--
-- Corrige os lints do Supabase:
--   0011_function_search_path_mutable
--   0028_anon_security_definer_function_executable
--   0029_authenticated_security_definer_function_executable
--
-- Estratégia:
--   1. Toda função em `public` recebe search_path imutável (public, pg_temp).
--   2. Lógica privilegiada (SECURITY DEFINER) vive no schema privado `app`,
--      que não é exposto pela Data API.
--   3. `public.check_slug` vira um wrapper SECURITY INVOKER.
--   4. Nenhuma função SECURITY DEFINER em `public` permanece executável por
--      `anon` ou `authenticated`.
--   5. Helpers de DDL e trigger functions não são chamáveis pela API.
--
-- Idempotente: pode ser reexecutado com segurança.
-- ============================================================================

-- ─── 1. Schema privado para lógica privilegiada ─────────────────────────────
create schema if not exists app;
revoke all on schema app from public, anon, authenticated;
grant usage on schema app to authenticated, service_role;

-- ─── 2. check_slug: DEFINER no schema privado + wrapper INVOKER em public ───
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

revoke all on function app.check_slug(text) from public, anon;
grant execute on function app.check_slug(text) to authenticated, service_role;

-- Wrapper exposto na API: SECURITY INVOKER, sem privilégios elevados
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

-- ─── 3. Trigger functions: SECURITY INVOKER + search_path fixo ──────────────
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

-- ─── 4. search_path imutável em TODAS as funções restantes de public ────────
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind in ('f', 'p')
      and (p.proconfig is null or not exists (
        select 1 from unnest(p.proconfig) c where c like 'search\_path=%'
      ))
  loop
    execute format('alter function %s set search_path = public, pg_temp', r.sig);
  end loop;
end $$;

-- Mesma garantia para as funções do schema privado `app`
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app'
      and p.prokind in ('f', 'p')
      and (p.proconfig is null or not exists (
        select 1 from unnest(p.proconfig) c where c like 'search\_path=%'
      ))
  loop
    execute format('alter function %s set search_path = public, pg_temp', r.sig);
  end loop;
end $$;

-- ─── 5. Nenhuma função SECURITY DEFINER de public exposta na API ────────────
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;

-- ─── 6. Trigger functions e helpers de DDL não são chamáveis pela API ───────
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

-- ─── 7. Sem execução automática de funções novas por anon ───────────────────
alter default privileges in schema public revoke execute on functions from anon;
revoke usage on schema app from anon;
