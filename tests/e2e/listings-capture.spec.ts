import { test, expect, type Page } from "@playwright/test";
import { testEmail } from "./test-email";

// T-078, from the 2026-11-24 handoff: a listing alert on each buy town page,
// Save this home (or Get homes like this one) and Anthony's call or text line
// on each property page. Listings stay open: no gate on /property/*.
//
// /api/lead is stubbed, so nothing here writes a lead, sends mail or reaches
// Lofty. Events are read from the beacons track() sends, as
// contact-paths.spec.ts does, because Playwright cannot read a beacon's body.

type Sent = { event: string; properties?: Record<string, unknown> };

async function watch(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __events: unknown[] };
    w.__events = [];
    const send = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url, data) => {
      if (String(url).endsWith("/api/track") && data instanceof Blob) {
        data.text().then((t) => w.__events.push(JSON.parse(t)));
      }
      return send(url, data);
    };
    document.addEventListener("click", (e) => {
      if ((e.target as Element).closest("a[href^='tel:'], a[href^='sms:']")) e.preventDefault();
    });
  });
  const leads: Record<string, unknown>[] = [];
  await page.route("**/api/lead", (route) => {
    leads.push(JSON.parse(route.request().postData() ?? "{}"));
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: '{"ok":true,"accepted":true}',
    });
  });
  const events = () =>
    page.evaluate(() => (window as unknown as { __events: Sent[] }).__events);
  return { leads, events };
}

test.describe("Listing alert on a town page", () => {
  test("is in the server HTML twice, on buy town pages only", async ({ request }) => {
    const town = await (await request.get("/search/cedarburg-homes-for-sale")).text();
    expect(town.match(/Get new Cedarburg listings first/g)?.length).toBe(2);
    expect(town).not.toContain('role="dialog"');

    const sell = await (await request.get("/search/cedarburg-home-value")).text();
    expect(sell).not.toContain("listings first");
  });

  test("signs up with the town, price and beds, and says so on the page", async ({ page }) => {
    const { leads, events } = await watch(page);
    await page.goto("/search/cedarburg-homes-for-sale");

    const card = page
      .getByRole("region", { name: "Get new Cedarburg listings first" })
      .first();
    await card.scrollIntoViewIfNeeded();
    await card.getByLabel("First name").fill("Jamie");
    await card.getByLabel("Last name").fill("Rivera");
    await card.getByLabel("Email").fill(testEmail("cedarburg-alert"));
    await card.getByLabel("Price range (optional)").selectOption("300k-500k");
    await card.getByLabel("Beds (optional)").selectOption("3");
    await card.getByLabel(/I agree to the/).check();
    await card.getByRole("button", { name: "Get Cedarburg listings" }).click();

    await expect(card.getByRole("status")).toContainText(
      "You're set. I'll set up your Cedarburg alert myself",
    );
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({
      source: "listing-alert",
      firstName: "Jamie",
      lastName: "Rivera",
      email: testEmail("cedarburg-alert"),
      town: "Cedarburg",
      priceRange: "300k-500k",
      beds: "3",
      termsConsent: true,
    });
    await expect
      .poll(async () => (await events()).find((e) => e.event === "listing_alert_lead")?.properties)
      .toMatchObject({
        town: "Cedarburg",
        price_range: "300k-500k",
        beds: "3",
        page_path: "/search/cedarburg-homes-for-sale",
      });
    await expect
      .poll(async () => (await events()).filter((e) => e.event === "listing_alert_view").length)
      .toBe(1);
  });

  test("needs the terms box before it sends anything", async ({ page }) => {
    const { leads } = await watch(page);
    await page.goto("/search/mequon-homes-for-sale");
    const card = page.getByRole("region", { name: "Get new Mequon listings first" }).first();
    await card.getByLabel("First name").fill("Jamie");
    await card.getByLabel("Last name").fill("Rivera");
    await card.getByLabel("Email").fill(testEmail("mequon-no-terms"));
    await card.getByRole("button", { name: "Get Mequon listings" }).click();
    await expect(card.getByRole("alert")).toContainText("You must agree to continue");
    expect(leads).toHaveLength(0);
  });

  test("needs a first and last name, because Lofty files the lead under them", async ({ page }) => {
    const { leads } = await watch(page);
    await page.goto("/search/grafton-homes-for-sale");
    const card = page.getByRole("region", { name: "Get new Grafton listings first" }).first();
    await card.getByLabel("Email").fill(testEmail("grafton-no-name"));
    await card.getByLabel(/I agree to the/).check();
    await card.getByRole("button", { name: "Get Grafton listings" }).click();
    await expect(card.getByText("First name is required")).toBeVisible();
    await expect(card.getByText("Last name is required")).toBeVisible();
    await expect(card.getByLabel("First name")).toHaveAttribute("aria-invalid", "true");
    expect(leads).toHaveLength(0);
  });
});

test.describe("A listing on the market", () => {
  const PATH = "/property/e2e-fixture-active";

  test("offers a tour by call or text, on Anthony's cell", async ({ page }) => {
    const { events } = await watch(page);
    await page.goto(PATH);
    await expect(page.getByText("Want a tour? Call or text me at (262) 483-7932")).toBeVisible();
    const call = page.getByRole("link", { name: "Call Anthony at (262) 483-7932" }).first();
    const text = page.getByRole("link", { name: "Text Anthony at (262) 483-7932" }).first();
    await expect(call).toHaveAttribute("href", "tel:+12624837932");
    await expect(text).toHaveAttribute(
      "href",
      `sms:+12624837932?&body=${encodeURIComponent("Hi Anthony, I'd like to tour 100 Fixture Lane.")}`,
    );
    await page.locator('a[data-placement="property_tour"][href^="tel:"]').click();
    await expect
      .poll(async () => (await events()).find((e) => e.event === "call_click")?.properties)
      .toMatchObject({ placement: "property_tour", property_slug: "e2e-fixture-active" });
  });

  test("saves the home with its address and status", async ({ page }) => {
    const { leads, events } = await watch(page);
    await page.goto(PATH);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "Save this home" }).click();
    await expect(page.getByText("I'll email you this home's details, plus similar homes nearby.")).toBeVisible();
    await expect(page.getByLabel("First name").last()).toBeFocused();
    await page.getByLabel("First name").last().fill("Pat");
    await page.getByLabel("Last name").last().fill("Lee");
    await page.locator("main").getByLabel("Email", { exact: true }).last().fill(testEmail("save-home"));
    await page.getByLabel(/I agree to the/).last().check();
    await page.getByRole("button", { name: "Save", exact: true }).click();

    await expect(page.getByText(/^Saved\. I'll email you this home's details soon/)).toBeVisible();
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({
      source: "save-home",
      firstName: "Pat",
      lastName: "Lee",
      email: testEmail("save-home"),
      propertySlug: "e2e-fixture-active",
      address: "100 Fixture Lane",
      propertyStatus: "active",
    });
    await expect
      .poll(async () => (await events()).map((e) => e.event))
      .toEqual(expect.arrayContaining(["save_home_click", "save_home_lead"]));
  });
});

test.describe("A sold listing", () => {
  const PATH = "/property/521-alta-loma";

  test("stays open to crawlers, with no gate", async ({ request }) => {
    const res = await request.get(PATH);
    expect(res.headers()["x-robots-tag"]).toBeUndefined();
    const html = await res.text();
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toMatch(/<meta name="robots" content="[^"]*noindex/);
    expect(html).toContain("Thinking about selling? Call or text me at (262) 483-7932");
    expect(html).toContain("Get homes like this one");
  });

  test("asks about selling, and sends homes like this one", async ({ page }) => {
    const { leads, events } = await watch(page);
    await page.goto(PATH);
    await expect(
      page.getByText("Thinking about selling? Call or text me at (262) 483-7932"),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Save this home" })).toHaveCount(0);

    await page.getByRole("button", { name: "Get homes like this one" }).click();
    await page.getByLabel("First name").last().fill("Sam");
    await page.getByLabel("Last name").last().fill("Ortiz");
    await page.locator("main").getByLabel("Email", { exact: true }).last().fill(testEmail("similar-homes"));
    await page.getByLabel(/I agree to the/).last().check();
    await page.getByRole("button", { name: "Send them to me" }).click();

    await expect(page.getByText(/^You're set\. I'll send homes like this one/)).toBeVisible();
    expect(leads[0]).toMatchObject({
      source: "similar-homes",
      firstName: "Sam",
      lastName: "Ortiz",
      propertySlug: "521-alta-loma",
      propertyStatus: "sold",
    });
    await expect
      .poll(async () => (await events()).find((e) => e.event === "similar_homes_lead")?.properties)
      .toMatchObject({ property_slug: "521-alta-loma" });
  });
});
