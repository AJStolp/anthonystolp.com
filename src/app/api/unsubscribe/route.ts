import { getSupabase } from "@/lib/supabase-server";
import { verifyUnsubscribeToken } from "@/lib/email-compliance";

// One-click + form-submit unsubscribe target for market-report emails.
//
// Reached two ways, both POST (per RFC 8058 we never mutate on GET, so link
// pre-fetchers and security scanners can't unsubscribe people by accident):
//   1. The confirm button on /unsubscribe (browser form submit)
//   2. Gmail/Apple native one-click via the List-Unsubscribe-Post header
//
// We opt out every market-report-subscribe row sharing the lead's email, since
// one person can subscribe to multiple zips. Idempotent.

export const runtime = "nodejs";

function page(title: string, body: string, status: number): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${title}</title>
<style>body{font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;background:#faf6ef;color:#1a1a1a;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px}main{max-width:30rem;text-align:center}h1{font-size:1.5rem;margin:0 0 .75rem}p{color:#555;line-height:1.6;margin:0}</style>
</head><body><main><h1>${title}</h1><p>${body}</p></main></body></html>`;
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function POST(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const lid = url.searchParams.get("lid");
  const token = url.searchParams.get("t");

  if (!lid || !token || !verifyUnsubscribeToken(lid, token)) {
    return page(
      "Invalid unsubscribe link",
      "This link is missing or invalid. Reply to any of our emails with “unsubscribe” and we will take you off the list.",
      400,
    );
  }

  const supabase = getSupabase();
  const { data: lead } = await supabase
    .from("funnel_leads")
    .select("id,email")
    .eq("id", lid)
    .maybeSingle();

  // Opt out by email across all of this person's market-report subscriptions;
  // fall back to the single row if we somehow have no email on file.
  const now = new Date().toISOString();
  if (lead?.email) {
    await supabase
      .from("funnel_leads")
      .update({ unsubscribed_at: now })
      .eq("source", "market-report-subscribe")
      .eq("email", lead.email)
      .is("unsubscribed_at", null);
  } else {
    await supabase
      .from("funnel_leads")
      .update({ unsubscribed_at: now })
      .eq("id", lid)
      .is("unsubscribed_at", null);
  }

  return page(
    "You’re unsubscribed",
    "You will no longer receive market-update emails from Anthony Stolp. It can take a moment to take effect across already-queued sends.",
    200,
  );
}
