import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Result } from "axe-core";

// The accessibility lane: axe-core against the rendered pages, tagged to
// WCAG 2.2 AA, which is what headspace's `gates.yml` says this lane must
// prove. It runs on both device projects, because the mobile nav collapses
// behind a hamburger and that is where keyboard and label problems hide.
//
// Only the public pages are scanned. Everything under /admin is behind a login
// this suite spends rate-limited attempts on, and /property and /search are
// dynamic slugs whose content comes from Supabase rows a local run has no
// guarantee of holding.
//
// axe reports what it can prove from the DOM and stays quiet about the rest,
// so this finding nothing would not mean the page is accessible to a person.
// It would mean nothing machine-checkable is wrong.
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const PAGES = [
  ["the home page", "/"],
  ["about", "/about"],
  ["the digital card", "/card"],
  ["privacy", "/privacy"],
  ["terms", "/terms"],
  ["fair housing", "/fair-housing"],
  ["unsubscribe", "/unsubscribe"],
] as const;

// WCAG 2.2 AA: 4.5:1 for body text, 3:1 for large text. axe already knows
// which a node is and reports the threshold it applied, so read that rather
// than deciding here what counts as large.
type ContrastData = { contrastRatio?: number; expectedContrastRatio?: string };

/**
 * axe puts a contrast result it could not be sure about into `incomplete`
 * rather than `violations` — a background it could not resolve, text over an
 * image. Most of those are genuinely unknowable and saying so is right. But
 * when it did measure a ratio and that ratio is below the threshold it
 * applied, the failure is known and only the confidence is not. Reading
 * `violations` alone hides those behind a short label.
 */
function measuredContrastFailures(incomplete: Result[]): Result[] {
  const out: Result[] = [];
  for (const rule of incomplete) {
    if (rule.id !== "color-contrast") continue;
    const nodes = rule.nodes.filter((node) =>
      [...node.any, ...node.all, ...node.none].some((check) => {
        const data = check.data as ContrastData | undefined;
        const got = data?.contrastRatio;
        const want = parseFloat(data?.expectedContrastRatio ?? "");
        return typeof got === "number" && !Number.isNaN(want) && got < want;
      }),
    );
    if (nodes.length) out.push({ ...rule, nodes });
  }
  return out;
}

function describe(rules: Result[]): string[] {
  // The default message is an object dump, which says nothing in a lane
  // artifact. Name the rule, how many nodes it hit, and one selector.
  return rules.map(
    (rule) =>
      `${rule.id} (${rule.impact}): ${rule.help}\n` +
      `  ${rule.nodes.length} element(s), e.g. ${rule.nodes[0]?.target.join(" ")}\n` +
      `  ${rule.helpUrl}`,
  );
}

for (const [name, path] of PAGES) {
  test(`${name} has no WCAG 2.2 AA violations`, async ({ page }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" });

    // GSAP and Lenis animate content in, and an element mid-tween reports a
    // contrast ratio it will not have once it lands. Wait for the page to
    // settle rather than scanning a frame of an animation.
    await page.waitForLoadState("networkidle");

    const { violations, incomplete } = await new AxeBuilder({ page })
      .withTags([...TAGS])
      .analyze();

    const failures = [...violations, ...measuredContrastFailures(incomplete)];
    const said = describe(failures);
    expect(said, `${path}\n\n${said.join("\n\n")}`).toEqual([]);
  });
}
