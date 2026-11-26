import { test, expect, type APIRequestContext } from "@playwright/test";

// T-091: /buy and /northwoods carry one description each, between 70 and 160
// characters, and the same text in the meta, Open Graph and Twitter tags.
// Reads the raw server HTML, which is what a crawler and a share preview see.

const PAGES = [
  {
    path: "/buy",
    description:
      "Buying in Cedarburg, Mequon, Grafton or anywhere in Ozaukee County? Get local advice, new listings first, and a straight answer. Call or text (262) 483-7932.",
    title: "Buy a Home in Cedarburg and Ozaukee County · Anthony Stolp",
  },
  {
    path: "/northwoods",
    // "We'll", not "I'll": this is Jay and Anthony's page.
    description:
      "Rural land with no address, just coordinates? We'll get out there, walk it, fly it, and market it right. Land, cabins, and lake homes in Marinette County, WI.",
    title: "Marinette County Land and Cabins · Jay and Anthony Stolp",
  },
];

async function html(request: APIRequestContext, path: string): Promise<string> {
  const res = await request.get(path);
  expect(res.status(), `GET ${path}`).toBe(200);
  return res.text();
}

// Next escapes attribute values, so compare against the decoded text.
function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function meta(doc: string, attr: "name" | "property", key: string): string[] {
  const re = new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`, "g");
  return [...doc.matchAll(re)].map((m) => decode(m[1]));
}

for (const page of PAGES) {
  test.describe(`${page.path} description`, () => {
    test("meta, og and twitter descriptions are the one new text", async ({ request }) => {
      const doc = await html(request, page.path);
      expect(meta(doc, "name", "description")).toEqual([page.description]);
      expect(meta(doc, "property", "og:description")).toEqual([page.description]);
      expect(meta(doc, "name", "twitter:description")).toEqual([page.description]);
    });

    test("description is between 70 and 160 characters", async ({ request }) => {
      const doc = await html(request, page.path);
      const [description] = meta(doc, "name", "description");
      expect(description.length).toBeGreaterThanOrEqual(70);
      expect(description.length).toBeLessThanOrEqual(160);
    });

    test("title is unchanged", async ({ request }) => {
      const doc = await html(request, page.path);
      const titles = [...doc.matchAll(/<title>([^<]*)<\/title>/g)].map((m) => decode(m[1]));
      expect(titles).toEqual([page.title]);
    });
  });
}
