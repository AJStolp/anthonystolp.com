import Link from "next/link";
import { COMMUNITIES, homesHref, valueHref } from "@/lib/communities";

// A server component so the links are in the HTML a crawler fetches, not
// added after JavaScript runs.
export function Communities() {
  return (
    <section
      id="communities"
      aria-labelledby="communities-heading"
      className="border-b border-ink/10 bg-cream"
    >
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-12 md:py-20">
        <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-ink-soft/70">
          Communities I serve
        </p>
        <h2
          id="communities-heading"
          className="mt-3 max-w-xl font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-[1.15] tracking-[-0.02em]"
        >
          Cedarburg and the Ozaukee County north shore.
        </h2>
        <p className="mt-4 max-w-xl text-[15px] leading-[1.7] text-ink/70">
          Pick your town to see what is for sale, or find out what your home is
          worth.
        </p>

        {/* Each card draws its own right and bottom edge, so the empty cells
            after the seventh town stay cream instead of showing a grey block. */}
        <ul className="mt-10 grid grid-cols-1 border-t border-l border-ink/10 sm:grid-cols-2 lg:grid-cols-3 md:mt-12">
          {COMMUNITIES.map((c) => (
            <li key={c.slug} className="border-r border-b border-ink/10 p-6">
              <p className="font-display text-xl font-semibold tracking-[-0.01em] text-ink">
                {c.name}
              </p>
              {c.zip ? (
                <p className="mt-1 text-[11px] uppercase tracking-[0.28em] text-ink-soft/70">
                  {c.zip}
                </p>
              ) : null}
              <div className="mt-4 flex flex-col gap-1 text-[14px]">
                <Link
                  href={homesHref(c.slug)}
                  className="py-1 text-ink underline-offset-4 hover:underline"
                >
                  {c.name} homes for sale
                </Link>
                <Link
                  href={valueHref(c.slug)}
                  className="py-1 text-ink/70 underline-offset-4 hover:text-ink hover:underline"
                >
                  {c.name} home values
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
