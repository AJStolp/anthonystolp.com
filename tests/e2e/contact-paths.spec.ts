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

// The printed Marinette County flyers name Jay and Anthony, and point at
// /northwoods, so that page lists both of them (T-087). Every other page has
// one contact, Anthony.
const JAY_EMAIL = "jaystolp@exsellexperts.com";
const JAY_TEL = "tel:+14148072478";
const OFFICE_TEL = "tel:+12628853310";

test.describe("Northwoods lists Jay and Anthony", () => {
  test("both cards, both in the footer, and the we wording", async ({ page }) => {
    await page.goto("/northwoods");
    const team = page.locator("#team");
    await expect(team.getByRole("heading", { name: "Anthony and Jay." })).toBeVisible();
    await expect(team.getByRole("img", { name: "Jay Stolp" })).toHaveAttribute("src", "/images/northwoods/jay-headshot.png");
    await expect(team.getByRole("img", { name: "Anthony Stolp" })).toBeVisible();
    await expect(team.getByRole("link", { name: "(414) 807-2478" })).toHaveAttribute("href", JAY_TEL);
    await expect(team.getByRole("link", { name: JAY_EMAIL })).toHaveAttribute("href", `mailto:${JAY_EMAIL}`);
    await expect(team.getByRole("link", { name: "(262) 483-7932" })).toHaveAttribute("href", CELL_TEL);

    const footer = page.locator("footer");
    await expect(footer.getByText("Email Us", { exact: true })).toBeVisible();
    await expect(footer.getByText("Call Us", { exact: true })).toBeVisible();
    await expect(footer.getByRole("link", { name: JAY_EMAIL })).toHaveAttribute("href", `mailto:${JAY_EMAIL}`);
    await expect(footer.getByRole("link", { name: "anthony@exsellexperts.com" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Call or text Jay: (414) 807-2478" })).toHaveAttribute("href", JAY_TEL);
    await expect(footer.getByRole("link", { name: "Call or text Anthony: (262) 483-7932" })).toHaveAttribute("href", CELL_TEL);

    await expect(page.getByRole("link", { name: /Call or Text Us/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Tell us about your land/ })).toBeVisible();
    await expect(page.getByText(/Jay and Anthony both read every message/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Questions land owners ask us." })).toBeVisible();
    await expect(page.getByText(/Send us the coordinates or the parcel number/)).toBeVisible();
    await expect(page.getByText(/Tell us what you're after and we'll send listings/)).toBeVisible();
    await expect(page).toHaveTitle("Marinette County Land and Cabins · Jay and Anthony Stolp");
  });

  test("every call, text and email link goes to Jay or Anthony", async ({ page }) => {
    await page.goto("/northwoods");
    const hrefs = (sel: string) => page.locator(sel).evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
    const tels = await hrefs("a[href^='tel:']");
    for (const href of tels) expect([CELL_TEL, JAY_TEL, OFFICE_TEL]).toContain(href);
    expect(tels).toContain(JAY_TEL);
    expect(tels).toContain(CELL_TEL);
    const mails = await hrefs("a[href^='mailto:']");
    for (const href of mails) expect(["mailto:anthony@exsellexperts.com", `mailto:${JAY_EMAIL}`]).toContain(href);
    expect(mails).toContain(`mailto:${JAY_EMAIL}`);
    expect(mails).toContain("mailto:anthony@exsellexperts.com");
  });

  test("the structured data names both, with Anthony on the home page's id", async ({ page }) => {
    const html = await (await page.request.get("/northwoods")).text();
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)![1]);
    const graph = ld["@graph"] as { "@type": string; "@id": string; email?: string; provider?: unknown }[];
    const agents = graph.filter((n) => n["@type"] === "RealEstateAgent");
    expect(agents.map((a) => [a["@id"], a.email])).toEqual([
      ["https://anthonystolp.com/#agent", "anthony@exsellexperts.com"],
      ["https://anthonystolp.com/northwoods#jay", JAY_EMAIL],
    ]);
    const service = graph.find((n) => n["@type"] === "Service")!;
    expect(service.provider).toEqual([
      { "@id": "https://anthonystolp.com/#agent" },
      { "@id": "https://anthonystolp.com/northwoods#jay" },
    ]);
  });
});

test.describe("Every other page has one contact, Anthony", () => {
  for (const path of ["/", "/buy", "/home-value", "/about", "/search/cedarburg-homes-for-sale"]) {
    test(`${path} has no trace of Jay, and says Email Me`, async ({ page }) => {
      const html = await (await page.request.get(path)).text();
      expect(html).not.toContain("jaystolp@");
      expect(html).not.toMatch(/807[^0-9]*2478/);
      expect(html).not.toContain("jay-headshot");

      await page.goto(path);
      const footer = page.locator("footer");
      await expect(footer.getByText("Email Me", { exact: true })).toBeVisible();
      await expect(footer.getByText("Call Me", { exact: true })).toBeVisible();
      await expect(footer.getByText("Email Us", { exact: true })).toHaveCount(0);
    });
  }
});
