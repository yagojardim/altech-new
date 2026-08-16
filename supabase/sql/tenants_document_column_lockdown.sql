-- Tenants: bloqueio em nível de coluna dos campos de documento (CPF/CNPJ).
-- Antes: a policy tenants_read_own permitia que QUALQUER membro do tenant
-- lesse a linha inteira, incluindo document_hash e document_last4.
-- Agora: authenticated só recebe SELECT nas colunas não sensíveis; os dados de
-- documento só saem via função SECURITY DEFINER restrita a admins do tenant.

do $$
declare cols text;
begin
  select string_agg(quote_ident(attname), ', ' order by attnum)
    into cols
  from pg_attribute
  where attrelid = 'public.tenants'::regclass
    and attnum > 0 and not attisdropped
    and attname not in ('document_hash', 'document_last4');

  execute 'revoke select on public.tenants from authenticated';
  execute 'revoke select on public.tenants from anon';
  execute format('grant select (%s) on public.tenants to authenticated', cols);
end $$;

grant all on public.tenants to service_role;

-- Acesso admin-only aos metadados do documento (nunca o documento completo).
create or replace function public.get_tenant_document_info()
returns table (document_last4 text, document_verification_status text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select t.document_last4, t.document_verification_status
  from public.tenants t
  where t.id = app.current_tenant_id()
    and app.is_tenant_admin()
$$;

revoke all on function public.get_tenant_document_info() from public;
revoke all on function public.get_tenant_document_info() from anon;
grant execute on function public.get_tenant_document_info() to authenticated, service_role;
