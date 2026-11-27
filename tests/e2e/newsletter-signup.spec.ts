import { test, expect, type Page } from "@playwright/test";

// T-113: The River Report signup replaces the homepage zip report form. A
// card on the pages below, a compact row in every footer.
//
// `next dev` reads .env.local, so every write is stubbed in the browser:
// /api/lead answers as an accepted signup without reaching the server (so no
// row, no Resend mail), /api/track is fulfilled here, and the Google, Meta
// and Ahrefs loaders are aborted. gtag and fbq are recorders installed before the page's
// own scripts run, which is what track() mirrors each event to. The confirm
// route is not exercised here: it writes to Supabase, and is unit tested.

const CARD_PAGES = [
  ["/", "home"],
  ["/blog", "blog"],
  ["/blog/cedarburg-market-nov-2026", "blog_post"],
  ["/home-value", "home_value"],
] as const;
const STREET_CTA_PAGES = ["/blog", "/blog/cedarburg-market-nov-2026"];
const SMS = "sms:+12624837932?&body=Hi%20Anthony%2C%20my%20street%20is%20";
const TEL = "tel:+12624837932";

type Sent = { event: string; properties?: Record<string, unknown> };

async function watch(page: Page, leadAnswer: { status: number; body: string } = {
  status: 200,
  body: '{"ok":true,"leadId":"00000000-0000-0000-0000-000000000000","accepted":true}',
}) {
  await page.addInitScript(() => {
    const w = window as unknown as {
      __events: unknown[];
      __fbq: unknown[][];
      dataLayer: unknown[];
      gtag: (...a: unknown[]) => void;
      fbq: (...a: unknown[]) => void;
    };
    w.__events = [];
    w.__fbq = [];
    w.dataLayer = [];
    w.gtag = function () {
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer.push(arguments);
    };
    w.fbq = (...a: unknown[]) => void w.__fbq.push(a);
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
    return route.fulfill({ status: leadAnswer.status, contentType: "application/json", body: leadAnswer.body });
  });
  await page.route("**/api/track", (route) => route.fulfill({ status: 204 }));
  await page.route("https://www.googletagmanager.com/**", (r) => r.abort());
  await page.route("https://connect.facebook.net/**", (r) => r.abort());
  await page.route("https://analytics.ahrefs.com/**", (r) => r.abort());

  const events = () => page.evaluate(() => (window as unknown as { __events: Sent[] }).__events);
  const named = async (event: string) =>
    (await events()).filter((e) => e.event === event).map((e) => e.properties);
  const gtagEvents = () =>
    page.evaluate(() =>
      ((window as unknown as { dataLayer: ArrayLike<unknown>[] }).dataLayer ?? [])
        .map((a) => Array.from(a))
        .filter((a) => a[0] === "event")
        .map((a) => a[1] as string),
    );
  const fbqEvents = () =>
    page.evaluate(() =>
      (window as unknown as { __fbq: unknown[][] }).__fbq
        .filter((a) => a[0] === "trackCustom")
        .map((a) => a[1] as string),
    );
  return { leads, named, gtagEvents, fbqEvents };
}

const card = (page: Page) => page.getByRole("region", { name: "The River Report", exact: true });
const compact = (page: Page) =>
  page.locator("footer").getByRole("region", {
    name: "The River Report: Ozaukee and Washington County real estate, once a month.",
  });

// TrackingInit's page_view goes out from an effect, so once it is recorded
// the page has hydrated and the form handlers are attached.
async function gotoHydrated(page: Page, path: string) {
  await page.goto(path);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __events: Sent[] }).__events.length))
    .toBeGreaterThan(0);
}

test.describe("Where the signup appears", () => {
  for (const [path] of CARD_PAGES) {
    test(`${path} has the card and the footer row`, async ({ page }) => {
      await watch(page);
      await page.goto(path);
      const c = card(page);
      await expect(c).toHaveCount(1);
      await expect(c.getByText("Monthly newsletter", { exact: true })).toBeVisible();
      await expect(c.getByLabel("Email", { exact: true })).toBeVisible();
      await expect(c.getByLabel("First name (optional)")).toBeVisible();
      const zip = c.getByLabel("Your zip (optional)");
      await expect(zip.locator("option")).toHaveText([
        "Pick a zip for your local numbers",
        "Cedarburg (53012)",
        "Mequon / Thiensville (53092)",
        "Mequon (53097)",
        "Grafton (53024)",
        "Port Washington (53074)",
        "Saukville (53080)",
        "West Bend (53090)",
        "West Bend (53095)",
        "Hartford (53027)",
        "Germantown (53022)",
        "Jackson (53037)",
        "Slinger (53086)",
      ]);
      await expect(c.getByRole("button", { name: "Send me The River Report" })).toBeVisible();

      const row = compact(page);
      await expect(row).toHaveCount(1);
      await expect(row.getByPlaceholder("Your email")).toBeVisible();
      await expect(row.getByRole("button", { name: "Sign up" })).toBeVisible();
      await expect(row.locator("select")).toHaveCount(0);

      // No em or en dashes, and no arrows, anywhere in the new copy.
      const text = `${await c.innerText()}\n${await row.innerText()}`;
      expect(text).not.toMatch(/[–—→]/);
    });
  }

  test("the footer row is on a page without the card too", async ({ page }) => {
    await watch(page);
    await page.goto("/about");
    await expect(card(page)).toHaveCount(0);
    await expect(compact(page)).toHaveCount(1);
  });

  test("the homepage has exactly one signup card, at #market-report, and none of the old zip report form", async ({
    request,
  }) => {
    const html = (await (await request.get("/")).text()).replace(/<!-- -->/g, "");
    expect(html.match(/id="market-report"/g)).toHaveLength(1);
    expect(html.match(/Monthly newsletter/g)).toHaveLength(1);
    expect(html.match(/Send me The River Report<\/button>/g)).toHaveLength(1);
    expect(html).toMatch(/<section[^>]*id="market-report"[^>]*>[\s\S]*?The River Report<\/h2>/);
    for (const old of [
      "A short monthly report on your zip code",
      "Monthly market report",
      "Send me the report",
      'id="mr-email"',
    ]) {
      expect(html).not.toContain(old);
    }
    // Only the homepage card carries the anchor.
    for (const path of ["/blog", "/home-value"]) {
      expect(await (await request.get(path)).text()).not.toContain('id="market-report"');
    }
  });

  test("/home-value shows the home value form above the card", async ({ page }) => {
    await watch(page);
    await page.goto("/home-value");
    const c = card(page);
    await expect(c).toBeVisible();
    // The home value form renders in the browser, inside a Suspense boundary.
    const address = page.getByLabel(/home address/i);
    await expect(address).toBeVisible();
    expect(await c.getByLabel(/home address/i).count()).toBe(0);
    const order = await page.evaluate(() => {
      const section = [...document.querySelectorAll("section")].find(
        (s) => s.querySelector("h2")?.textContent === "The River Report",
      )!;
      const homeValue = [...document.querySelectorAll("main form")].find(
        (f) => !section.contains(f) && !f.closest("footer"),
      );
      if (!homeValue) return null;
      return {
        follows: Boolean(
          homeValue.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
        above: homeValue.getBoundingClientRect().top < section.getBoundingClientRect().top,
        afterFaq:
          (document.getElementById("faq")!.compareDocumentPosition(section) &
            Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
      };
    });
    expect(order).toEqual({ follows: true, above: true, afterFaq: true });
  });

  for (const path of STREET_CTA_PAGES) {
    test(`${path} has the text your street block with the right sms and tel links`, async ({ page }) => {
      await watch(page);
      await page.goto(path);
      const c = card(page);
      await expect(c.getByRole("heading", { name: "Curious what your neighbors sold for?" })).toBeVisible();
      const sms = c.getByRole("link", { name: "Text me your street" });
      await expect(sms).toHaveAttribute("href", SMS);
      await expect(sms).toHaveAttribute("data-placement", "newsletter_street_sms");
      const call = c.getByRole("link", { name: "Call (262) 483-7932" });
      await expect(call).toHaveAttribute("href", TEL);
      await expect(call).toHaveAttribute("data-placement", "newsletter_street_call");
      await expect(c.getByRole("link", { name: "free home value" })).toHaveAttribute("href", "/home-value");
    });
  }

  test("the homepage and /home-value cards have no street block", async ({ page }) => {
    await watch(page);
    for (const path of ["/", "/home-value"]) {
      await page.goto(path);
      await expect(card(page).getByRole("link", { name: "Text me your street" })).toHaveCount(0);
    }
  });
});

test.describe("Signing up", () => {
  test("the card needs the consent box before it sends anything", async ({ page }) => {
    const { leads } = await watch(page);
    await gotoHydrated(page, "/blog");
    const c = card(page);
    await c.getByLabel("Email", { exact: true }).fill("sam@example.com");
    await c.getByRole("button", { name: "Send me The River Report" }).click();
    const consent = c.getByLabel(/Send me The River Report once a month/);
    await expect(c.getByRole("alert")).toHaveText("Check the box so I know it's OK to email you.");
    await expect(consent).toHaveAttribute("aria-invalid", "true");
    const describedBy = await consent.getAttribute("aria-describedby");
    await expect(page.locator(`[id="${describedBy}"]`)).toHaveText(
      "Check the box so I know it's OK to email you.",
    );
    expect(leads).toHaveLength(0);
  });

  test("the card refuses a bad email", async ({ page }) => {
    const { leads } = await watch(page);
    await gotoHydrated(page, "/blog");
    const c = card(page);
    await c.getByLabel("Email", { exact: true }).fill("sam@");
    await c.getByLabel(/Send me The River Report once a month/).check();
    await c.getByRole("button", { name: "Send me The River Report" }).click();
    await expect(c.getByRole("alert")).toHaveText("That email doesn't look right. Mind checking it?");
    await expect(c.getByLabel("Email", { exact: true })).toHaveAttribute("aria-invalid", "true");
    expect(leads).toHaveLength(0);
  });

  test("the card signs up with the zip and says check your email", async ({ page }) => {
    const { leads, named, gtagEvents, fbqEvents } = await watch(page);
    await page.goto("/?gclid=pw-river");
    await expect
      .poll(() => page.evaluate(() => document.cookie.includes("anthonystolp_attr")))
      .toBe(true);
    const c = card(page);
    await c.scrollIntoViewIfNeeded();
    await c.getByLabel("Email", { exact: true }).fill("sam@example.com");
    await c.getByLabel("First name (optional)").fill("Sam");
    await c.getByLabel("Your zip (optional)").selectOption("53012");
    await c.getByLabel(/Send me The River Report once a month/).check();
    await c.getByRole("button", { name: "Send me The River Report" }).click();

    await expect(c.getByRole("status")).toContainText("Almost done. Check your email.");
    await expect(c.getByRole("status")).toContainText(
      "I just sent a confirm link to sam@example.com. Click it and you're on the list. The River Report goes out the first Tuesday of the month.",
    );
    await expect(c.getByRole("status")).toContainText(
      "Don't see it? Check promotions or spam, or text me at (262) 483-7932.",
    );
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({
      source: "market-report-subscribe",
      funnelStep: "completed",
      intent: "exploring",
      email: "sam@example.com",
      firstName: "Sam",
      postalCode: "53012",
      termsConsent: true,
      hp_company: "",
      placement: "home",
      click: { gclid: "pw-river" },
    });
    expect(leads[0].visitorId).toBeTruthy();
    expect(String(leads[0].landingPage)).toContain("gclid=pw-river");

    await expect.poll(() => named("market_report_lead")).toEqual([{ zip: "53012", placement: "home" }]);
    expect(await gtagEvents()).toContain("market_report_lead");
    await expect.poll(() => named("newsletter_view")).toEqual([{ placement: "home", page_path: "/" }]);
    expect(await gtagEvents()).toContain("newsletter_view");
    expect(await fbqEvents()).toContain("newsletter_view");
  });

  test("the footer row signs up with only an email", async ({ page }) => {
    const { leads, named } = await watch(page);
    await gotoHydrated(page, "/about");
    const row = compact(page);
    await row.scrollIntoViewIfNeeded();
    await row.getByLabel("Email", { exact: true }).fill("pat@example.com");
    await row.getByRole("button", { name: "Sign up" }).click();
    await expect(row.getByRole("alert")).toHaveText("Check the box so I know it's OK to email you.");
    expect(leads).toHaveLength(0);

    await row.getByLabel(/Send me the monthly newsletter/).check();
    await row.getByRole("button", { name: "Sign up" }).click();
    await expect(row.getByRole("status")).toHaveText("Check your email for a confirm link.");
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({
      source: "market-report-subscribe",
      email: "pat@example.com",
      termsConsent: true,
      placement: "footer",
    });
    expect(leads[0]).not.toHaveProperty("postalCode");
    expect(leads[0]).not.toHaveProperty("firstName");
    await expect.poll(() => named("market_report_lead")).toEqual([{ placement: "footer" }]);
  });

  test("the honeypot's silent 200 shows success but fires no market_report_lead", async ({ page }) => {
    const { leads, named, gtagEvents } = await watch(page, { status: 200, body: '{"ok":true}' });
    await gotoHydrated(page, "/blog");
    const c = card(page);
    await c.getByLabel("Email", { exact: true }).fill("sam@example.com");
    await c.getByLabel(/Send me The River Report once a month/).check();
    await c.getByRole("button", { name: "Send me The River Report" }).click();
    await expect(c.getByRole("status")).toContainText("Check your email");
    expect(leads).toHaveLength(1);
    await page.waitForTimeout(500);
    expect(await named("market_report_lead")).toEqual([]);
    expect(await gtagEvents()).not.toContain("market_report_lead");
  });

  test("a server error says so, with Anthony's number", async ({ page }) => {
    await watch(page, { status: 502, body: '{"error":"Failed to send email"}' });
    await gotoHydrated(page, "/blog");
    const c = card(page);
    await c.getByLabel("Email", { exact: true }).fill("sam@example.com");
    await c.getByLabel(/Send me The River Report once a month/).check();
    await c.getByRole("button", { name: "Send me The River Report" }).click();
    await expect(c.getByRole("alert")).toHaveText(
      "Something went wrong on my end. Try again, or text me at (262) 483-7932.",
    );
    await expect(c.getByRole("status")).toHaveText("");
  });

  test("newsletter_view is sent once a page view, however many signups it has", async ({ page }) => {
    const { named } = await watch(page);
    await gotoHydrated(page, "/blog");
    await card(page).scrollIntoViewIfNeeded();
    await compact(page).scrollIntoViewIfNeeded();
    await expect.poll(async () => (await named("newsletter_view")).length).toBe(1);
    await page.waitForTimeout(500);
    expect(await named("newsletter_view")).toEqual([{ placement: "blog", page_path: "/blog" }]);
  });
});

test.describe("/newsletter/confirmed", () => {
  test("is noindex, with one h1, the draft's copy and no signup", async ({ request }) => {
    const res = await request.get("/newsletter/confirmed");
    expect(res.status()).toBe(200);
    const html = (await res.text()).replace(/<!-- -->/g, "");
    expect(html).toMatch(/<meta name="robots" content="noindex, nofollow"\/?>/);
    const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => m[1]);
    expect(h1s).toEqual(["You&#x27;re on the list."]);
    const text = html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ");
    expect(text).toContain(
      "The River Report goes out the first Tuesday of the month. While you're here, read the Cedarburg market update , or get a free home value . Questions? Call or text me at (262) 483-7932 .",
    );
    // They just signed up, so the page offers no second signup.
    expect(html).not.toContain("Send me The River Report");
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).not.toContain("/newsletter/confirmed");
  });
});
