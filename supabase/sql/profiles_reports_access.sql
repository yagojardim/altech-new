-- Acesso à tela "Relatórios e Insights" por USUÁRIO (não mais por papel).
-- Admin Master (profiles.tenant_owner) sempre tem acesso, independente do flag.
alter table public.profiles
  add column if not exists reports_access boolean not null default false;

comment on column public.profiles.reports_access is
  'Libera a tela Relatórios e Insights para este usuário. Admin Master sempre tem acesso.';
