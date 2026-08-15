// Temporary admin SQL runner — deleted right after the security hardening run.
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";

const KEY = Deno.env.get("TMP_SQL_TOKEN")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("no", { status: 405 });
  if (req.headers.get("x-admin-key") !== KEY) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }
  const { sql: text, mode } = await req.json();
  const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false });
  try {
    const rows = mode === "query"
      ? await sql.unsafe(text)
      : (await sql.unsafe(text), [{ ok: true }]);
    return new Response(JSON.stringify({ rows }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  } finally {
    await sql.end();
  }
});
