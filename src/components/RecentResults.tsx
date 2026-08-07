import Link from "next/link";
import { STATUS_LABEL, type PropertyRow } from "@/lib/properties";

function formatPrice(n: number | null): string | null {
  if (n == null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

// The tile headline is the first line of the listing description, by
// convention: descriptions lead with the result ("Under contract. 521 Alta
// Loma Dr went live on a Thursday..."). Falls back to nothing if a
// description is missing, so the card still renders.
function headline(p: PropertyRow): string | null {
  const first = p.description?.split("\n")[0]?.trim();
  if (!first) return null;
  return first.length > 150 ? `${first.slice(0, 150).trimEnd()}…` : first;
}

function meta(p: PropertyRow): string {
  return [
    p.beds != null ? `${p.beds} bed` : null,
    p.baths != null ? `${p.baths} bath` : null,
    p.sqft != null ? `${p.sqft.toLocaleString("en-US")} sq ft` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function Photo({ p, className }: { p: PropertyRow; className: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[20px] bg-ink/5 shadow-[0_18px_50px_-14px_rgba(26,28,28,0.3)] transition-shadow duration-500 group-hover:shadow-[0_26px_64px_-14px_rgba(26,28,28,0.36)] ${className}`}
    >
      {p.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.photo_url}
          alt={p.address}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="h-full w-full" />
      )}
      <span className="absolute left-4 top-4 rounded-[10px] bg-accent px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.28em] text-cream">
        {STATUS_LABEL[p.status] ?? p.status}
      </span>
    </div>
  );
}

// Presentational: the home page fetches once and hands the hero the newest
// result, so this band renders only what the hero is not already showing.
export function RecentResults({ results }: { results: PropertyRow[] }) {
  if (results.length === 0) return null;

  const single = results.length === 1;

  return (
    <section
      aria-labelledby="recent-results-heading"
      className="border-b border-ink/10 bg-cream"
    >
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-12 md:py-20">
        <h2
          id="recent-results-heading"
          className="text-[10px] font-medium uppercase tracking-[0.32em] text-ink-soft/55"
        >
          Recent results
        </h2>

        <div
          className={
            single
              ? "mt-8"
              : "mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
          }
        >
          {results.map((p) => {
            const price = formatPrice(p.price);
            const locality = [p.city, p.state].filter(Boolean).join(", ");
            const stats = meta(p);
            const hook = headline(p);

            return (
              <Link
                key={p.slug}
                href={`/property/${p.slug}`}
                className={`group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-4 focus-visible:ring-offset-cream ${
                  single ? "md:grid md:grid-cols-12 md:gap-10" : ""
                }`}
              >
                <Photo
                  p={p}
                  className={
                    single
                      ? "aspect-[16/10] w-full md:col-span-7 md:aspect-[4/3]"
                      : "aspect-[4/3] w-full"
                  }
                />

                <div
                  className={
                    single ? "md:col-span-5 md:self-center" : undefined
                  }
                >
                  <h3
                    className={`mt-5 font-display font-semibold leading-[1.15] tracking-[-0.02em] md:mt-0 ${
                      single ? "text-[clamp(1.75rem,3vw,2.5rem)]" : "text-2xl"
                    }`}
                  >
                    {p.address}
                  </h3>

                  {locality && (
                    <p className="mt-2 text-[11px] uppercase tracking-[0.28em] text-ink/50">
                      {locality}
                    </p>
                  )}

                  {hook && single && (
                    <p className="mt-5 text-[15px] leading-[1.7] text-ink/70">
                      {hook}
                    </p>
                  )}

                  <div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    {price && (
                      <span className="font-display text-xl font-semibold">
                        {price}
                      </span>
                    )}
                    {stats && (
                      <span className="text-[13px] text-ink/60">{stats}</span>
                    )}
                  </div>

                  <span className="mt-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-ink/70 underline underline-offset-4 transition-colors group-hover:text-ink">
                    See the listing
                    <span
                      aria-hidden
                      className="transition-transform group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
