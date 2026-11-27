import { expect, test, type Page } from "@playwright/test";
import { testEmail } from "./test-email";

// T-106: the six Washington County pages (West Bend, Hartford, Germantown,
// homes for sale and home value) went live as niche_pages rows on 2026-11-26.
// These check what the code adds around them: the market snapshot, each buy
// page's own AgentFire search, and the alert cards.
//
// Everything is written out here rather than read from the code, so a wrong
// entry in the code cannot also be the expectation.
//
// /api/track and /api/lead are always stubbed in the browser tests: `next dev`
// reads .env.local, which is the live Supabase and Lofty.

const TOWNS: [slug: string, name: string, searchPath: string][] = [
  ["west-bend", "West Bend", "/properties/city-West%20Bend,%20WI/"],
  ["hartford", "Hartford", "/properties/city-Hartford,%20WI/"],
  ["germantown", "Germantown", "/properties/place-Germantown,%20WI/"],
];

// What the snapshot says it covers. Germantown has no note: whether 53022 runs
// past the village is unconfirmed.
const SNAPSHOT: Record<string, { heading: string; note: RegExp | null }> = {
  "west-bend": {
    heading: "West Bend and nearby (53090 and 53095) market snapshot",
    note: /Redfin reports the 53090 and 53095 zip codes, which cover West Bend and some of the surrounding area, not the city limits alone\./,
  },
  hartford: {
    heading: "Hartford and nearby (53027) market snapshot",
    note: /Redfin reports the 53027 zip code, which reaches past the city into the Town of Hartford and nearby areas\./,
  },
  germantown: { heading: "Germantown market snapshot", note: null },
};

const count = (html: string, s: string) => html.split(s).length - 1;

async function stubWrites(page: Page) {
  const leads: Record<string, unknown>[] = [];
  await page.route("**/api/track", (route) => route.fulfill({ status: 204 }));
  await page.route("**/api/lead", (route) => {
    leads.push(JSON.parse(route.request().postData() ?? "{}"));
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: '{"ok":true,"accepted":true}',
    });
  });
  await page.route("https://www.googletagmanager.com/**", (r) => r.abort());
  await page.route("https://connect.facebook.net/**", (r) => r.abort());
  return leads;
}

async function gotoHydrated(page: Page, path: string) {
  const pageView = page.waitForRequest((r) => r.url().endsWith("/api/track"));
  await page.goto(path);
  await pageView;
}

test.describe("Washington County pages, market snapshot", () => {
  for (const [slug, name] of TOWNS) {
    for (const suffix of ["homes-for-sale", "home-value"]) {
      test(`/search/${slug}-${suffix} shows the ${name} snapshot and says what it covers`, async ({
        page,
      }) => {
        const res = await page.goto(`/search/${slug}-${suffix}`);
        expect(res?.status()).toBe(200);
        const { heading, note } = SNAPSHOT[slug];
        await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
        if (note) {
          await expect(page.getByText(note)).toBeVisible();
        } else {
          await expect(page.getByText(/Redfin reports the/)).toHaveCount(0);
        }
      });
    }
  }
});

test.describe("Washington County buy pages, in the server HTML", () => {
  for (const [slug, name, searchPath] of TOWNS) {
    test(`${slug}: the hero opens the ${name} search, never Ozaukee County's`, async ({
      request,
    }) => {
      const html = await (await request.get(`/search/${slug}-homes-for-sale`)).text();
      const hero = [...html.matchAll(/href="([^"]*utm_term=town_page[^"]*)"/g)].map((m) =>
        m[1].replace(/&amp;/g, "&"),
      );
      expect(hero).toHaveLength(1);
      const url = new URL(hero[0]);
      expect(url.origin).toBe("https://exsellexperts.com");
      expect(url.pathname).toBe(searchPath);
      expect(url.searchParams.get("utm_content")).toBe(slug);
      expect(html).not.toContain("county-Ozaukee");
      // The town page's card is fixed to the town: no dropdown.
      expect(count(html, `Get new ${name} listings first`)).toBeGreaterThanOrEqual(1);
      expect(html).not.toContain("Choose a town");
    });
  }
});

test.describe("Washington County alert cards", () => {
  test("the West Bend page's card signs up for West Bend, with the lead stubbed", async ({
    page,
  }) => {
    const leads = await stubWrites(page);
    await gotoHydrated(page, "/search/west-bend-homes-for-sale");
    const card = page
      .locator("#alerts")
      .getByRole("region", { name: "Get new West Bend listings first" });
    await card.scrollIntoViewIfNeeded();
    await card.getByLabel("First name").fill("Jamie");
    await card.getByLabel("Last name").fill("Rivera");
    await card.getByLabel("Email").fill(testEmail("west-bend"));
    await card.getByLabel(/I agree to the/).check();
    await card.getByRole("button", { name: /Get West Bend listings/ }).click();

    await expect(card.getByRole("status")).toContainText("West Bend");
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({ source: "listing-alert", town: "West Bend" });
  });

  test("the homepage dropdown signs up for Germantown, with the lead stubbed", async ({
    page,
  }) => {
    const leads = await stubWrites(page);
    await gotoHydrated(page, "/");
    const card = page
      .locator("section#homes")
      .getByRole("region", { name: "Get new Ozaukee County listings first" });
    await card.scrollIntoViewIfNeeded();
    await card.getByLabel("Town", { exact: true }).selectOption("Germantown");
    await card.getByLabel("First name").fill("Jamie");
    await card.getByLabel("Last name").fill("Rivera");
    await card.getByLabel("Email").fill(testEmail("home-germantown"));
    await card.getByLabel(/I agree to the/).check();
    await card.getByRole("button", { name: "Get Ozaukee County listings" }).click();

    await expect(card.getByRole("status")).toContainText(
      "You're set. I'll set up your Germantown alert myself",
    );
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({ source: "listing-alert", town: "Germantown" });
  });
});
