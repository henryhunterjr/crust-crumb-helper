// Crust & Crumb Helper — nurture-unsubscribe
//
// One-click unsubscribe target. Hit from email footer links AND from
// RFC 8058 List-Unsubscribe-Post one-click POSTs by inbox providers.
// Sets members.nurture_status = 'opted_out' on the row whose
// unsubscribe_token matches.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function htmlPage(title: string, body: string, status = 200) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#faf7f2;color:#222;
       margin:0;padding:48px 20px;display:flex;justify-content:center}
  .card{max-width:520px;background:#fff;border:1px solid #e7e1d5;border-radius:12px;
        padding:32px;box-shadow:0 1px 2px rgba(0,0,0,.04)}
  h1{font-family:"Libre Caslon Text",Georgia,serif;font-size:22px;margin:0 0 12px}
  p{line-height:1.5;margin:0 0 12px}
  .muted{color:#666;font-size:13px}
</style></head><body><div class="card">
<h1>${title}</h1>${body}
<p class="muted">Crust & Crumb / Henry Hunter</p>
</div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

async function optOut(token: string) {
  if (!token) return { ok: false, reason: "missing_token" };
  const { data, error } = await supabase
    .from("members")
    .update({ nurture_status: "opted_out" })
    .eq("unsubscribe_token", token)
    .select("id, email")
    .maybeSingle();
  if (error) return { ok: false, reason: "db_error", detail: error.message };
  if (!data) return { ok: false, reason: "not_found" };
  return { ok: true, email: data.email };
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";

  // One-click POST per RFC 8058
  if (req.method === "POST") {
    const result = await optOut(token);
    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method !== "GET") {
    return new Response("method not allowed", { status: 405 });
  }

  const result = await optOut(token);

  if (!result.ok && result.reason === "not_found") {
    return htmlPage(
      "Already unsubscribed",
      `<p>This link doesn't match an active subscriber. You're already off the list, or the link is from an old email.</p>`,
      200,
    );
  }
  if (!result.ok) {
    return htmlPage(
      "Something went wrong",
      `<p>We couldn't process that unsubscribe right now. Reply to any email from Henry and he'll handle it manually.</p>`,
      400,
    );
  }

  return htmlPage(
    "You're unsubscribed",
    `<p>Done. <strong>${result.email ?? "Your address"}</strong> won't get any more nurture emails from this list.</p>
     <p>If you change your mind, just reply to one of Henry's emails.</p>`,
  );
});