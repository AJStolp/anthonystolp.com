// Where "See active listings" sends a visitor: the AgentFire search on
// exsellexperts.com for the area they were looking at, never the bio page,
// whose feed is the whole brokerage (Kenosha, Sheboygan, Franklin).
//
// Each URL was pulled from a real search and checked by hand on 2026-11-24
// (T-077). AgentFire's format varies, so never build one from a town name:
// Thiensville is a `place-` where the rest are `city-`, and Marinette must be
// the `county-` search, because Marinette Township is also labelled "Marinette
// County" in AgentFire's search box and returns a much smaller list.
//
// West Bend, Hartford and Germantown were added on 2026-11-26 (T-106) the same
// way: each town typed into AgentFire's own search box, its suggestion picked,
// the search run, then checked with status=Active to show "Properties in
// {Town}". Germantown is a `place-`, like Thiensville.

export const LISTING_SEARCH = {
  cedarburg:
    "https://exsellexperts.com/properties/city-Cedarburg,%20WI/?listingType=Residential&status=Active",
  mequon:
    "https://exsellexperts.com/properties/city-Mequon,%20WI/?listingType=Residential&status=Active",
  thiensville:
    "https://exsellexperts.com/properties/place-Thiensville,%20WI/?listingType=Residential&status=Active",
  grafton:
    "https://exsellexperts.com/properties/city-Grafton,%20WI/?listingType=Residential&status=Active",
  "port-washington":
    "https://exsellexperts.com/properties/city-Port%20Washington,%20WI/?listingType=Residential&status=Active",
  saukville:
    "https://exsellexperts.com/properties/city-Saukville,%20WI/?listingType=Residential&status=Active",
  "ozaukee-county":
    "https://exsellexperts.com/properties/county-Ozaukee,%20WI/?listingType=Residential&status=Active",
  "west-bend":
    "https://exsellexperts.com/properties/city-West%20Bend,%20WI/?listingType=Residential&status=Active",
  hartford:
    "https://exsellexperts.com/properties/city-Hartford,%20WI/?listingType=Residential&status=Active",
  germantown:
    "https://exsellexperts.com/properties/place-Germantown,%20WI/?listingType=Residential&status=Active",
  "marinette-homes":
    "https://exsellexperts.com/properties/county-Marinette,%20WI/?listingType=Residential&status=Active",
  "marinette-land":
    "https://exsellexperts.com/properties/county-Marinette,%20WI/?listingType=Land&status=Active",
} as const;

export type ListingSearch = keyof typeof LISTING_SEARCH;

// For a page with no one town: the homepage, /buy, and the guides.
export const FALLBACK_SEARCH: ListingSearch = "ozaukee-county";

function isListingSearch(key: string): key is ListingSearch {
  return Object.hasOwn(LISTING_SEARCH, key);
}

// "cedarburg-homes-for-sale" -> "cedarburg". A slug with no search of its own
// gets the fallback.
export function listingSearchForSlug(slug: string): ListingSearch {
  const town = slug.replace(/-homes-for-sale$/, "");
  return isListingSearch(town) ? town : FALLBACK_SEARCH;
}

// The ten towns with a /search/{town}-homes-for-sale page: every search but
// the two Northwoods ones.
export type TownSearch = Exclude<ListingSearch, "marinette-homes" | "marinette-land">;

// "cedarburg-homes-for-sale" -> "cedarburg", and null for every other page:
// home value pages, guides, and a town with no search. Unlike
// listingSearchForSlug there is no fallback, so only the ten town pages get
// the town tiles (T-094).
export function townSearchForSlug(slug: string): TownSearch | null {
  const match = /^(.+)-homes-for-sale$/.exec(slug);
  if (!match) return null;
  const town = match[1];
  if (!isListingSearch(town)) return null;
  if (town === "marinette-homes" || town === "marinette-land") return null;
  return town;
}

// Where on the site a listings link sits. It becomes the link's utm_term and
// the search_outbound event's placement, so the two always agree.
export type ListingPlacement =
  | "hero"
  | "buy"
  | "town_page"
  | "northwoods"
  | "home_tiles"
  | "town_tiles";

// Every AgentFire URL above already carries a query string, so the UTM
// parameters join it with "&".
export function listingSearchUrl(
  search: ListingSearch,
  placement: ListingPlacement,
): string {
  const utm = new URLSearchParams({
    utm_source: "anthonystolp",
    utm_medium: "referral",
    utm_campaign: "town-search",
    utm_content: search,
    utm_term: placement,
  });
  return `${LISTING_SEARCH[search]}&${utm.toString()}`;
}
