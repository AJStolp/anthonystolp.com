import Link from "next/link";
import { getAgentProfile } from "@/lib/agent-profile";
import { COMMUNITIES, homesHref, valueHref } from "@/lib/communities";
import { telHref } from "@/lib/phone";

// A server component so the links are in the HTML a crawler fetches, not
// added after JavaScript runs.
export function Communities() {
  const cell = getAgentProfile().mobilePhone;
  return (
    <section
      id="communities"
      aria-labelledby="communities-heading"
      className="border-b border-ink/10 bg-white"
    >
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-12 md:py-20">
        <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-ink-soft/70">
          Communities I serve
        </p>
        <h2
          id="communities-heading"
          className="mt-3 max-w-xl font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-[1.15] tracking-[-0.02em]"
        >
          Cedarburg, the Ozaukee County North Shore, and nearby Washington County.
        </h2>
        <p className="mt-4 max-w-xl text-[15px] leading-[1.7] text-ink/70">
          Pick your town to see what&apos;s for sale, or find out what your home
          is worth.
        </p>

        {/* Each card draws its own right and bottom edge, so the empty cells
            after the seventh town stay white instead of showing a grey block. */}
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

        {/* Plain text until Washington County has pages of its own. */}
        <p className="mt-8 max-w-2xl text-[15px] leading-[1.7] text-ink/70">
          Also serving Washington County: West Bend, Hartford, Germantown,
          Jackson, and Slinger. Call or text me at{" "}
          <a
            href={telHref(cell)}
            data-placement="communities"
            className="text-ink underline underline-offset-4"
          >
            {cell}
          </a>{" "}
          for listings or a home value in any of them.
        </p>
      </div>
    </section>
  );
}
