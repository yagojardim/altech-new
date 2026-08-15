-- ============================================================================
-- Segurança — Storage (bucket "attachments") e wrapper public.current_tenant_id
--
-- Corrige:
--   * attachments_bucket_public_policies — policies *_insp_* em storage.objects
--     valiam para anon/authenticated apenas por bucket_id, permitindo leitura,
--     upload, alteração e exclusão cross-tenant (policies permissivas são OR).
--   * current_tenant_id_public_wrapper — public.current_tenant_id() é SECURITY
--     DEFINER e estava potencialmente executável por anon/public.
--
-- Idempotente.
-- ============================================================================

-- ─── 1. Remove TODAS as policies permissivas de inspeção do bucket ──────────
do $$
declare r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (policyname like '%insp%' or policyname like '%inspection%')
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;

-- Remove qualquer policy do bucket attachments que alcance anon
do $$
declare r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and ('anon' = any (roles) or 'public' = any (roles))
      and coalesce(qual, '') || coalesce(with_check, '') like '%attachments%'
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;

-- ─── 2. Policies escopadas por tenant (recriadas de forma determinística) ───
-- Convenção de path: <tenant_id>/<...>
drop policy if exists attachments_tenant_select on storage.objects;
drop policy if exists attachments_tenant_insert on storage.objects;
drop policy if exists attachments_tenant_update on storage.objects;
drop policy if exists attachments_tenant_delete on storage.objects;

create policy attachments_tenant_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = app.current_tenant_id()::text
  );

create policy attachments_tenant_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = app.current_tenant_id()::text
  );

create policy attachments_tenant_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = app.current_tenant_id()::text
  )
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = app.current_tenant_id()::text
  );

create policy attachments_tenant_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = app.current_tenant_id()::text
  );

-- ─── 3. Wrapper público current_tenant_id() fora do alcance de anon ─────────
revoke all on function public.current_tenant_id() from public, anon;
grant execute on function public.current_tenant_id() to authenticated, service_role;

notify pgrst, 'reload schema';
