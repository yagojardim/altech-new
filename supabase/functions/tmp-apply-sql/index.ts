import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const SQL = `
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
alter default privileges in schema public revoke execute on functions from anon;
alter default privileges in schema public revoke execute on functions from authenticated;
notify pgrst, 'reload schema';
`;

const VERIFY = `
select p.oid::regprocedure::text as sig,
       has_function_privilege('authenticated', p.oid, 'execute') as auth_exec,
       has_function_privilege('anon', p.oid, 'execute') as anon_exec
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef;
`;

Deno.serve(async () => {
  const client = new Client(Deno.env.get("SUPABASE_DB_URL")!);
  try {
    await client.connect();
    await client.queryArray(SQL);
    const res = await client.queryObject(VERIFY);
    return new Response(JSON.stringify({ ok: true, functions: res.rows }, null, 2), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  } finally {
    try { await client.end(); } catch { /* noop */ }
  }
});
