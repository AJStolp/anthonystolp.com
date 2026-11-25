import { test, expect, type Page } from "@playwright/test";

// v4 handoff (2026-11-20): every page reaches Anthony in one tap on a phone,
// city pages show his number near the top, and each tap is counted.

const CELL_TEL = "tel:+12624837932";
const CELL_SMS = "sms:+12624837932?&body=Hi%20Anthony%2C%20I%20found%20you%20on%20your%20website.";
const TOWNS = ["cedarburg", "mequon", "thiensville", "grafton", "port-washington", "saukville", "ozaukee-county"];

const isMobile = () => test.info().project.name.includes("mobile");

// Records call_click and text_click events as track() sends them (Playwright
// cannot read a beacon's body), and keeps tel: and sms: taps on the page.
// Call before page.goto.
async function watchContactEvents(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __contact: unknown[] };
    w.__contact = [];
    const send = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url, data) => {
      if (String(url).endsWith("/api/track") && data instanceof Blob) {
        data.text().then((t) => {
          const body = JSON.parse(t);
          if (body.event === "call_click" || body.event === "text_click") w.__contact.push(body);
        });
      }
      return send(url, data);
    };
    document.addEventListener("click", (e) => {
      if ((e.target as Element).closest("a[href^='tel:'], a[href^='sms:']")) e.preventDefault();
    });
  });
  return () =>
    page.evaluate(() =>
      ((window as unknown as { __contact: { event: string; properties: { page: string; placement: string } }[] }).__contact).map(
        (e) => `${e.event}:${e.properties.placement}:${e.properties.page}`,
      ),
    );
}

test.describe("/privacy names the brokerage with the pipe", () => {
  test("ExSell Experts | Epique Realty, never 'at Epique'", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByText(/affiliated with ExSell Experts \| Epique Realty in Germantown, WI/)).toBeVisible();
    expect(await page.content()).not.toContain("ExSell Experts at");
  });
});

test.describe("Sticky Call and Text bar", () => {
  for (const path of ["/", "/search/cedarburg-homes-for-sale", "/home-value", "/about", "/northwoods", "/buy"]) {
    test(`${path} shows it on phones only`, async ({ page }) => {
      await page.goto(path);
      const bar = page.getByRole("navigation", { name: "Call or text Anthony" });
      if (!isMobile()) {
        await expect(bar).toBeHidden();
        return;
      }
      await expect(bar).toBeVisible();
      await expect(bar.getByRole("link", { name: "Call Anthony at (262) 483-7932" })).toHaveAttribute("href", CELL_TEL);
      await expect(bar.getByRole("link", { name: "Text Anthony at (262) 483-7932" })).toHaveAttribute("href", CELL_SMS);
    });
  }

  test("is not on the business card page, which has its own buttons", async ({ page }) => {
    await page.goto("/card");
    await expect(page.getByRole("navigation", { name: "Call or text Anthony" })).toHaveCount(0);
  });

  test("taps are counted as call_click and text_click", async ({ page }) => {
    test.skip(!isMobile(), "the bar is phone only");
    const events = await watchContactEvents(page);
    await page.goto("/search/cedarburg-homes-for-sale");
    const bar = page.getByRole("navigation", { name: "Call or text Anthony" });
    await bar.getByRole("link", { name: /^Call Anthony/ }).click();
    await bar.getByRole("link", { name: /^Text Anthony/ }).click();
    await expect.poll(events).toEqual([
      "call_click:sticky_bar:/search/cedarburg-homes-for-sale",
      "text_click:sticky_bar:/search/cedarburg-homes-for-sale",
    ]);
  });

  test("never covers the bottom of the footer", async ({ page }) => {
    test.skip(!isMobile(), "the bar is phone only");
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const bar = await page.getByRole("navigation", { name: "Call or text Anthony" }).boundingBox();
    const footerBottom = await page.locator("footer").evaluate((f) => f.getBoundingClientRect().bottom);
    expect(bar).not.toBeNull();
    expect(footerBottom).toBeLessThanOrEqual(bar!.y + 1);
  });
});

test.describe("Phone line near the top of the city pages", () => {
  for (const town of TOWNS) {
    for (const kind of ["homes-for-sale", "home-value"]) {
      test(`${town}-${kind}`, async ({ page }) => {
        await page.goto(`/search/${town}-${kind}`);
        const line = page.locator("p", { hasText: "Rather talk it through? Call or text me at" });
        await expect(line).toHaveText("Rather talk it through? Call or text me at (262) 483-7932. You'll get me, not a call center.");
        await expect(line.getByRole("link")).toHaveAttribute("href", CELL_TEL);
        // Above the page's body copy, so it is near the main action.
        const lineY = (await line.boundingBox())!.y;
        const firstH2Y = (await page.locator("main h2").first().boundingBox())!.y;
        expect(lineY).toBeLessThan(firstH2Y);
      });
    }
  }

  test("is not on the seller guides", async ({ page }) => {
    await page.goto("/search/selling-an-inherited-house-wisconsin");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Rather talk it through?")).toHaveCount(0);
  });

  test("a tap is counted with placement city_top", async ({ page }) => {
    const events = await watchContactEvents(page);
    await page.goto("/search/grafton-home-value");
    await page.locator("p", { hasText: "Rather talk it through?" }).getByRole("link").click();
    await expect.poll(events).toEqual(["call_click:city_top:/search/grafton-home-value"]);
  });
});

test.describe("Homepage", () => {
  test("hero has the year end line under the buttons, above the phone line", async ({ page }) => {
    await page.goto("/");
    const line = page.getByText(
      "Want to buy or sell before the new year? Call or text me this week and I'll let you know if the timing works for you.",
    );
    await expect(line).toBeVisible();
    const phone = page.locator("a[data-placement=hero]");
    await expect(phone).toHaveText("Call or text Anthony: (262) 483-7932");
    expect((await line.boundingBox())!.y).toBeLessThan((await phone.boundingBox())!.y);
  });

  test("the hero phone link is counted with placement hero", async ({ page }) => {
    const events = await watchContactEvents(page);
    await page.goto("/");
    await page.locator("a[data-placement=hero]").click();
    await expect.poll(events).toEqual(["call_click:hero:/"]);
  });

  test("shows no reviews strip until Anthony sends real quotes", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "What clients say" })).toHaveCount(0);
    expect(await page.content()).not.toMatch(/\[REAL QUOTE|\[FIRST NAME|\[GOOGLE REVIEW/);
  });
});

test.describe("Northwoods has one contact, Anthony", () => {
  test("no trace of Jay's email or phone, and every link reaches Anthony", async ({ page }) => {
    const res = await page.request.get("/northwoods");
    const html = await res.text();
    expect(html).not.toContain("jaystolp@exsellexperts.com");
    expect(html).not.toMatch(/807[^0-9]*2478/);

    await page.goto("/northwoods");
    await expect(page.getByRole("link", { name: "Tell me about your land" })).toBeVisible();
    const tels = await page.locator("a[href^='tel:']").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    const office = "tel:+12628853310";
    expect(tels.length).toBeGreaterThan(0);
    for (const href of tels) expect([CELL_TEL, office]).toContain(href);
    const mails = await page.locator("a[href^='mailto:']").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    expect(mails.length).toBeGreaterThan(0);
    for (const href of mails) expect(href).toBe("mailto:anthony@exsellexperts.com");
    await expect(page.getByText(/\bJay and Anthony both read\b|Anthony and Jay\./)).toHaveCount(0);
  });
});
