-- Preferências de UI por usuário (Timeline: zoom, agrupamento, filtros, grupos colapsados).
-- Rodar no SQL Editor do Supabase.

create table if not exists public.user_prefs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  user_id uuid not null,
  pref_key text not null,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  row_version integer not null default 0,
  unique (tenant_id, user_id, pref_key)
);

grant select, insert, update, delete on public.user_prefs to authenticated;
grant select, insert, update, delete on public.user_prefs to anon;
grant all on public.user_prefs to service_role;

alter table public.user_prefs enable row level security;

-- INSPECTION MODE: mesma política permissiva das demais tabelas do E2E.
drop policy if exists user_prefs_inspection on public.user_prefs;
create policy user_prefs_inspection on public.user_prefs
  for all to anon, authenticated
  using (true) with check (true);

drop trigger if exists tg_user_prefs_touch on public.user_prefs;
create trigger tg_user_prefs_touch before update on public.user_prefs
  for each row execute function public.tg_touch_row();
