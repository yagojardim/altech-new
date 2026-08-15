import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";

const SQL = await Deno.readTextFile(new URL("./lockdown.sql", import.meta.url));

Deno.serve(async () => {
  const url = Deno.env.get("SUPABASE_DB_URL")!;
  const sql = postgres(url, { prepare: false, ssl: "require" });
  try {
    await sql.unsafe(SQL);
    const policies = await sql`
      select policyname, roles from pg_policies
      where schemaname = 'storage' and tablename = 'objects'
    `;
    return new Response(JSON.stringify({ ok: true, policies }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  } finally {
    await sql.end();
  }
});
