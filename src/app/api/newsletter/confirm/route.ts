import { NextResponse } from "next/server";
import { z } from "zod";
import { getAgentProfile } from "@/lib/agent-profile";
import { NEWSLETTER_NAME } from "@/lib/newsletter";
import { confirmNewsletter, type ConfirmResult } from "@/lib/newsletter-mail";
import { getSupabase } from "@/lib/supabase-server";

// The link in the River Report confirm email (T-113). A good token confirms
// the signup, sends the welcome email and lands on /newsletter/confirmed. A
// bad one, including an unsubscribe token, gets an error page and changes
// nothing.

export const runtime = "nodejs";

const params = z.object({
  lid: z.string().uuid(),
  t: z.string().regex(/^[0-9a-f]{32}$/),
});

function page(title: string, body: string, status: number): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${title}</title>
<style>body{font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;background:#ffffff;color:#1a1a1a;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px}main{max-width:30rem;text-align:center}h1{font-size:1.5rem;margin:0 0 .75rem}p{color:#555;line-height:1.6;margin:0}a{color:#1a1a1a}</style>
</head><body><main><h1>${title}</h1><p>${body}</p></main></body></html>`;
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parsed = params.safeParse({
    lid: url.searchParams.get("lid"),
    t: url.searchParams.get("t"),
  });

  let result: ConfirmResult = "invalid";
  if (parsed.success) {
    try {
      result = await confirmNewsletter(getSupabase(), parsed.data.lid, parsed.data.t);
    } catch (err) {
      console.error("[newsletter/confirm] failed:", err);
      result = "error";
    }
  }

  if (result === "confirmed") {
    return NextResponse.redirect(new URL("/newsletter/confirmed", url), 303);
  }
  if (result === "invalid") {
    return page(
      "This confirm link doesn't work",
      `It may be incomplete or copied wrong. Open the link straight from your ${NEWSLETTER_NAME} confirm email, or <a href="/#market-report">sign up again</a>.`,
      400,
    );
  }
  return page(
    "Something went wrong on my end",
    `Try the link again in a minute, or text me at ${getAgentProfile().mobilePhone}.`,
    500,
  );
}
