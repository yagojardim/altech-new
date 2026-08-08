-- ─────────────────────────────────────────────────────────────────────────────
-- Altech Project · AUTH LINK (idempotente)
-- Liga public.profiles ao Supabase Auth (auth.users) sem tocar em RLS.
-- As policies seguem as *_inspection existentes — a virada de RLS é passo à parte.
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper de FK tenant-safe (mesmo template das migrations anteriores).
create or replace function public.ensure_fk(
  p_table       text,
  p_constraint  text,
  p_columns     text[],
  p_ref_table   text,
  p_ref_columns text[],
  p_on_delete   text default 'no action'
) returns void
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_exists boolean;
begin
  select exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = p_table
      and c.conname = p_constraint
  ) into v_exists;

  if v_exists then
    return;
  end if;

  -- valida que as colunas existem antes de criar a constraint
  if not exists (
    select 1
    from (
      select array_agg(a.attname::text order by a.attname::text) as cols
      from pg_attribute a
      join pg_class t on t.oid = a.attrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = p_table
        and a.attname::text = any (p_columns)
        and a.attnum > 0
        and not a.attisdropped
    ) s
    where s.cols is not null
      and array_length(s.cols, 1) = array_length(p_columns, 1)
  ) then
    raise notice 'ensure_fk: colunas ausentes em %, constraint % ignorada', p_table, p_constraint;
    return;
  end if;

  execute format(
    'alter table public.%I add constraint %I foreign key (%s) references public.%I (%s) on delete %s',
    p_table, p_constraint,
    (select string_agg(quote_ident(c), ', ') from unnest(p_columns) c),
    p_ref_table,
    (select string_agg(quote_ident(c), ', ') from unnest(p_ref_columns) c),
    p_on_delete
  );
end;
$$;

-- ─── profiles.auth_user_id ────────────────────────────────────────────────────
alter table public.profiles add column if not exists auth_user_id uuid;
alter table public.profiles add column if not exists password_must_change boolean not null default false;

comment on column public.profiles.auth_user_id is
  'FK lógica para auth.users.id — identidade do Supabase Auth deste profile.';

-- Um profile por usuário de auth (índice único parcial: NULL permitido para seeds).
create unique index if not exists profiles_auth_user_id_uidx
  on public.profiles (auth_user_id)
  where auth_user_id is not null;

-- FK real para auth.users (schema reservado: apenas referência, sem trigger).
do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname = 'profiles'
      and c.conname = 'profiles_auth_user_id_fkey'
  ) then
    begin
      alter table public.profiles
        add constraint profiles_auth_user_id_fkey
        foreign key (auth_user_id) references auth.users (id) on delete set null;
    exception when others then
      raise notice 'profiles_auth_user_id_fkey não criada: %', sqlerrm;
    end;
  end if;
end $$;

-- ─── email não-nulo ───────────────────────────────────────────────────────────
-- Preenche placeholders determinísticos antes de aplicar o NOT NULL (idempotente).
update public.profiles
   set email = lower(coalesce(nullif(trim(email), ''), 'user-' || id::text || '@invalid.local'))
 where email is null or trim(email) = '';

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'email' and is_nullable = 'YES'
  ) then
    alter table public.profiles alter column email set not null;
  end if;
end $$;

create index if not exists profiles_email_lower_idx on public.profiles (lower(email));
create index if not exists profiles_tenant_auth_idx on public.profiles (tenant_id, auth_user_id);

-- ─── Grants Data API (sem alterar policies) ───────────────────────────────────
grant select, insert, update on public.profiles to authenticated;
grant select on public.profiles to anon;
grant all on public.profiles to service_role;
