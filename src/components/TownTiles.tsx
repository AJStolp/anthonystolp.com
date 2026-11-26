"use client";

// A client module so a server page that renders TownPageTiles sends only the
// town's key in its RSC payload, not a second copy of every heading beside
// the one in the HTML. The homepage already loads it through HomesForSale.
import Link from "next/link";
import { ListingSearchLink } from "@/components/ListingSearchLink";
import { homesHref } from "@/lib/communities";
import type {
  ListingPlacement,
  ListingSearch,
  TownSearch,
} from "@/lib/listing-search";

// "Here are the homes": one tile per town, each a plain link to that town's
// live search on exsellexperts.com (T-089). No tile carries a home count. The
// site cannot read one, and a number kept by hand goes stale; the visitor
// sees the live list one click later.

// In the order the homepage shows them. Ozaukee County runs the full width
// under the six towns.
const TOWNS: { search: TownSearch; name: string }[] = [
  { search: "cedarburg", name: "Cedarburg" },
  { search: "mequon", name: "Mequon" },
  { search: "thiensville", name: "Thiensville" },
  { search: "grafton", name: "Grafton" },
  { search: "port-washington", name: "Port Washington" },
  { search: "saukville", name: "Saukville" },
];
const COUNTY = { search: "ozaukee-county", name: "Ozaukee County" } as const;

// The homepage's tiles are "home_tiles"; a town page's are "town_tiles".
type HomePlacement = Extract<ListingPlacement, "home_tiles">;
type TilePlacement = Extract<ListingPlacement, "home_tiles" | "town_tiles">;

const NAME = Object.fromEntries(
  [...TOWNS, COUNTY].map((t) => [t.search, t.name]),
) as Record<TownSearch, string>;

// The smaller tiles under a town page's own town, nearest first. The county
// page's are all six towns.
const NEIGHBORS: Record<TownSearch, TownSearch[]> = {
  cedarburg: ["grafton", "mequon", "thiensville"],
  mequon: ["thiensville", "cedarburg", "grafton"],
  thiensville: ["mequon", "cedarburg", "grafton"],
  grafton: ["cedarburg", "saukville", "port-washington"],
  "port-washington": ["saukville", "grafton", "cedarburg"],
  saukville: ["port-washington", "grafton", "cedarburg"],
  "ozaukee-county": TOWNS.map((t) => t.search),
};

const GUIDE_LINK =
  "mt-2 inline-block self-start py-1 text-[13px] text-ink/70 underline underline-offset-4 hover:text-ink";

function TownTile({
  search,
  name,
  placement,
  wide = false,
}: {
  search: ListingSearch;
  name: string;
  placement: TilePlacement;
  wide?: boolean;
}) {
  return (
    <ListingSearchLink
      search={search}
      placement={placement}
      className="group flex h-full flex-col border border-ink/15 bg-white transition-colors hover:border-ink"
    >
      {/* The photo slot: a plain color block until there are photos of our
          own. No stock images. */}
      <div
        aria-hidden="true"
        className={`w-full bg-sky-200 ${wide ? "h-28 md:h-36" : "aspect-[16/9]"}`}
      />
      <div className="flex flex-1 flex-col p-4 md:p-5">
        <h3
          className={`font-display font-semibold tracking-[-0.01em] text-ink ${
            wide ? "text-2xl md:text-3xl" : "text-xl md:text-2xl"
          }`}
        >
          {name}
        </h3>
        <span className="mt-auto pt-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-ink underline underline-offset-4 group-hover:no-underline">
          See homes
        </span>
      </div>
    </ListingSearchLink>
  );
}

// Not a town and not one link: homes and land are two searches, and the
// Northwoods guide is a page on this site.
function NorthwoodsTile({ placement }: { placement: HomePlacement }) {
  const link =
    "py-1 text-[12px] font-semibold uppercase tracking-[0.2em] text-ink underline underline-offset-4 hover:no-underline";
  return (
    <div className="flex flex-col gap-4 border border-ink/15 bg-cream-deep/40 p-5 md:flex-row md:items-center md:justify-between">
      <div>
        <h3 className="font-display text-xl font-semibold tracking-[-0.01em] text-ink">
          Northwoods
        </h3>
        <p className="mt-1 text-[14px] leading-[1.6] text-ink/70">
          Homes, cabins and land in Marinette County
        </p>
      </div>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-6">
        <ListingSearchLink search="marinette-homes" placement={placement} className={link}>
          See homes and cabins
        </ListingSearchLink>
        <ListingSearchLink search="marinette-land" placement={placement} className={link}>
          See land
        </ListingSearchLink>
        <Link
          href="/northwoods"
          className="py-1 text-[13px] text-ink/70 underline underline-offset-4 hover:text-ink"
        >
          Northwoods guide
        </Link>
      </div>
    </div>
  );
}

// Each town's buyer guide sits under its tile, outside the tile's link.
export function TownTiles({ placement }: { placement: HomePlacement }) {
  return (
    <ul className="mt-10 grid grid-cols-2 gap-x-3 gap-y-6 md:mt-12 md:gap-x-4 lg:grid-cols-3">
      {TOWNS.map((t) => (
        <li key={t.search} className="flex flex-col">
          <TownTile search={t.search} name={t.name} placement={placement} />
          <Link href={homesHref(t.search)} className={GUIDE_LINK}>
            {`${t.name} buyer guide`}
          </Link>
        </li>
      ))}
      <li className="col-span-2 flex flex-col lg:col-span-3">
        <TownTile search={COUNTY.search} name={COUNTY.name} placement={placement} wide />
        <Link href={homesHref(COUNTY.search)} className={GUIDE_LINK}>
          {`${COUNTY.name} buyer guide`}
        </Link>
      </li>
      <li className="col-span-2 lg:col-span-3">
        <NorthwoodsTile placement={placement} />
      </li>
    </ul>
  );
}

// "[Town] homes for sale now" on a town page (T-094): the page's own town
// across the full width, then its neighbors smaller. No buyer guide links and
// no Northwoods tile here; the page is already the town's guide.
export function TownPageTiles({ town }: { town: TownSearch }) {
  const name = NAME[town];
  return (
    <section aria-labelledby="town-tiles-heading" className="mt-16 w-full">
      <h2
        id="town-tiles-heading"
        className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink"
      >
        {`${name} homes for sale now`}
      </h2>
      <div className="mt-6">
        <TownTile search={town} name={name} placement="town_tiles" wide />
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {NEIGHBORS[town].map((t) => (
          <li key={t}>
            <TownTile search={t} name={NAME[t]} placement="town_tiles" />
          </li>
        ))}
      </ul>
    </section>
  );
}
