import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Fair Housing Notice",
  description:
    "Anthony Stolp and ExSell Experts at Epique Realty support equal housing opportunity and comply with federal and Wisconsin fair housing laws.",
  alternates: { canonical: "/fair-housing" },
  openGraph: {
    title: "Fair Housing Notice · Anthony Stolp",
    description:
      "Anthony Stolp and ExSell Experts at Epique Realty support equal housing opportunity and comply with federal and Wisconsin fair housing laws.",
    url: "/fair-housing",
    type: "article",
  },
};

export default function FairHousingPage() {
  return (
    <main className="relative w-full overflow-x-hidden bg-cream text-ink">
      <Nav />
      <article className="mx-auto max-w-3xl px-6 pb-24 pt-40 md:pb-32 md:pt-48">
        <h1 className="font-display text-[clamp(2.5rem,5vw,4rem)] font-semibold leading-[1.05] tracking-[-0.025em]">
          Fair Housing Notice
        </h1>
        <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.38em] text-ink/55">
          Equal Housing Opportunity
        </p>

        <div className="mt-12 space-y-10 text-[15px] leading-[1.75] text-ink/80">
          <section>
            <p>
              Anthony Stolp and ExSell Experts at Epique Realty are committed
              to complying with the federal Fair Housing Act and the Wisconsin
              Open Housing Law. We do not discriminate in the sale, rental, or
              financing of housing on the basis of:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li>
                Race, color, religion, sex, national origin, familial status,
                or disability (federal protected classes)
              </li>
              <li>
                Ancestry, age, marital status, lawful source of income, or
                sexual orientation (Wisconsin protected classes)
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
              Equal Housing Opportunity
            </h2>
            <p className="mt-3">
              We support the principles of equal housing opportunity and
              welcome inquiries from all qualified prospective buyers and
              renters.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
              Reporting discrimination
            </h2>
            <p className="mt-3">
              If you believe you have experienced housing discrimination, you
              may file a complaint with:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                The U.S. Department of Housing and Urban Development (HUD):
                1-800-669-9777 or{" "}
                <a
                  href="https://www.hud.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-ink/60"
                >
                  hud.gov
                </a>
              </li>
              <li>
                The Wisconsin Department of Workforce Development, Equal
                Rights Division: 608-266-6860 or{" "}
                <a
                  href="https://dwd.wisconsin.gov/er"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-ink/60"
                >
                  dwd.wisconsin.gov/er
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
              Contact
            </h2>
            <p className="mt-3">
              Questions? Email{" "}
              <a
                href="mailto:anthony@exsellexperts.com"
                className="underline underline-offset-2 hover:text-ink/60"
              >
                anthony@exsellexperts.com
              </a>{" "}
              or call (262) 885-3310.
            </p>
          </section>
        </div>
      </article>
      <Footer />
    </main>
  );
}

