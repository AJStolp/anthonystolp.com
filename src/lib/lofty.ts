// Server-only Lofty CRM client. Creates leads via the Lofty Open API.
//
// Auth uses a personal API key (Lofty → Settings → Integrations → API) passed
// as `Authorization: token <key>`, which Lofty documents for server-side
// scripts. The create-lead docs mention a Bearer token, so if `token` is
// rejected we retry once with `Bearer` — this resolves the doc ambiguity
// automatically without a config change.
//
// Callers treat this as best-effort: a Lofty failure must never block a lead
// from being saved. Nothing here throws; failures return null and are logged.

const LOFTY_LEADS_URL = "https://api.lofty.com/v1.0/leads";

export type LoftyLeadInput = {
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  tags?: string[];
  note?: string | null;
};

function postLofty(
  body: Record<string, unknown>,
  auth: string,
): Promise<Response> {
  return fetch(LOFTY_LEADS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: JSON.stringify(body),
  });
}

// Creates a lead in Lofty. Returns the new lead id, or null when the API key
// is unset or the call fails. Lofty silently truncates firstName/lastName to
// 30 chars and tags to 64, so we pre-truncate to keep values intact.
export async function createLoftyLead(
  input: LoftyLeadInput,
): Promise<string | null> {
  const apiKey = process.env.LOFTY_API_KEY;
  if (!apiKey) {
    console.warn("[lofty] LOFTY_API_KEY not set; skipping Lofty push");
    return null;
  }

  const body: Record<string, unknown> = {
    firstName: input.firstName.slice(0, 30),
  };
  if (input.lastName) body.lastName = input.lastName.slice(0, 30);
  if (input.email) body.emails = [input.email];
  if (input.phone) body.phones = [input.phone];
  if (input.source) body.source = input.source;
  if (input.tags?.length) body.tags = input.tags.map((t) => t.slice(0, 64));
  if (input.note) body.content = input.note;

  try {
    let res = await postLofty(body, `token ${apiKey}`);
    if (res.status === 401) {
      res = await postLofty(body, `Bearer ${apiKey}`);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        `[lofty] create-lead non-2xx: ${res.status} ${text.slice(0, 300)}`,
      );
      return null;
    }
    const data = (await res.json().catch(() => null)) as
      | { id?: string; leadId?: string }
      | null;
    return data?.id ?? data?.leadId ?? null;
  } catch (err) {
    console.error("[lofty] create-lead request failed:", err);
    return null;
  }
}
