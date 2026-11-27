// Every email address a spec types into a form or posts to /api/lead comes
// from testEmail(). Do not write an address inline, and do not copy one from
// an old spec.
//
// Why: test leads used to be pw-<ms>+<label>@anthonystolp.com, which has no
// inbox. Rows that reached production funnel_leads were mailed by the monthly
// zip report cron, and every one hard bounced (92 between 2026-09-01 and
// 2026-11-01, T-128). Bounces count against the whole Resend account, which
// other businesses send through too.
//
// delivered@resend.dev is Resend's test inbox: a send to it is reported as
// delivered and does not damage the sender's reputation, and it accepts any
// label after a "+". https://resend.com/docs/dashboard/emails/send-test-emails
// and https://resend.com/docs/knowledge-base/what-email-addresses-to-use-for-testing
//
// This module imports nothing from Playwright, so bun can load it on its own.

// One stamp per worker process. With `workers: 1` that is one per run, so every
// row a run writes shares it and can be found together. Specs that type a name
// as well put this in it, so the name and the address carry the same stamp.
export const RUN_STAMP = `pw-${Date.now()}`;

const LABEL = /^[a-z0-9-]+$/;

/**
 * The address a test row is filed under: delivered+pw-<ms>-<label>@resend.dev.
 * The same label returns the same address for the rest of the run, so a test
 * can type it and then assert on it.
 */
export function testEmail(label: string): string {
  if (!LABEL.test(label)) {
    throw new Error(
      `testEmail label must be lowercase letters, digits and hyphens, got ${JSON.stringify(label)}`,
    );
  }
  return `delivered+${RUN_STAMP}-${label}@resend.dev`;
}

// Finds every row a Playwright run wrote. It reads the same as a JavaScript
// RegExp and as a Postgres `~` pattern, so a cleanup can use it directly:
//
//   select id, email, created_at from funnel_leads
//   where email ~ '^delivered\+pw-[0-9]+-[a-z0-9-]+@resend\.dev$';
//
// Retired, for rows written before T-128: ^pw-[0-9]+\+.*@anthonystolp\.com$
export const TEST_EMAIL_PATTERN = String.raw`^delivered\+pw-[0-9]+-[a-z0-9-]+@resend\.dev$`;
