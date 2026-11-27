// The towns and seller guides every page links to, so a crawler that starts on
// any page reaches all of the /search/ pages. Each slug must match an active
// niche_pages row; tests/e2e/internal-links.spec.ts checks every link is a 200.

export type Community = {
  name: string;
  // /search/{slug}-homes-for-sale and /search/{slug}-home-value
  slug: string;
  zip?: string;
};

export const COMMUNITIES: Community[] = [
  { name: "Cedarburg", slug: "cedarburg", zip: "53012" },
  { name: "Mequon", slug: "mequon", zip: "53092 · 53097" },
  { name: "Thiensville", slug: "thiensville", zip: "53092" },
  { name: "Grafton", slug: "grafton", zip: "53024" },
  { name: "Port Washington", slug: "port-washington", zip: "53074" },
  { name: "Saukville", slug: "saukville", zip: "53080" },
  { name: "Ozaukee County", slug: "ozaukee-county" },
];

// Kept apart from the Ozaukee set: the homepage shows them as their own
// cluster, and hot-lead.ts names them on its own.
export const WASHINGTON_COMMUNITIES: Community[] = [
  { name: "West Bend", slug: "west-bend", zip: "53090 · 53095" },
  { name: "Hartford", slug: "hartford", zip: "53027" },
  { name: "Germantown", slug: "germantown", zip: "53022" },
];

export const GUIDES: { label: string; href: string }[] = [
  { label: "Selling during a divorce", href: "/search/selling-a-house-during-divorce-wisconsin" },
  { label: "Selling an inherited house", href: "/search/selling-an-inherited-house-wisconsin" },
  { label: "Selling before foreclosure", href: "/search/selling-before-foreclosure-wisconsin" },
  { label: "Downsizing in Wisconsin", href: "/search/downsizing-in-wisconsin" },
];

export const homesHref = (slug: string) => `/search/${slug}-homes-for-sale`;
export const valueHref = (slug: string) => `/search/${slug}-home-value`;
