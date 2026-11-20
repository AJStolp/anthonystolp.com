import Link from "next/link";

import { BackToTop } from "./BackToTop";
import { getAgentProfile } from "@/lib/agent-profile";
import { telHref } from "@/lib/phone";
import { COMMUNITIES, GUIDES, homesHref, valueHref } from "@/lib/communities";

type Props = {
  // The large name across the bottom. Team pages pass their own.
  wordmark?: string;
  // Optional line under the wordmark.
  tagline?: string;
  // Team pages list each person's email and cell in place of the office line.
  contacts?: { name: string; email: string; phone: string }[];
};

export function Footer({ wordmark = "ANTHONY STOLP", tagline, contacts }: Props = {}) {
  const year = new Date().getFullYear();
  const cell = getAgentProfile().mobilePhone;

  return (
    <footer className="relative w-full">
      {/* Footer proper — cream */}
      <div className="bg-cream text-ink">
      <div className="mx-auto w-full max-w-[1600px] px-6 pt-20 pb-8 md:px-12 md:pt-24">
        {/* Top grid — left: contact row; right: nav columns */}
        <div className="grid grid-cols-1 gap-16 md:grid-cols-12 md:gap-12">
          {/* LEFT: three contact blocks */}
          <div className="md:col-span-7 lg:col-span-8">
            <div className="grid max-w-2xl grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-ink/65">
                  Head Office
                </p>
                <p className="mt-4 text-sm leading-[1.7] text-ink/75">
                  ExSell Experts
                  <br />
                  Epique Realty
                  <br />
                  Germantown, WI
                  <br />
                  <span className="text-ink/65">WI Lic. #114204-94</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-ink/65">
                  Email Us
                </p>
                {contacts ? (
                  <ul className="mt-4 space-y-2">
                    {contacts.map((c) => (
                      <li key={c.email}>
                        <a
                          href={`mailto:${c.email}`}
                          className="block break-all text-sm text-ink/75 transition-colors hover:text-ink"
                        >
                          {c.email}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <a
                    href="mailto:anthony@exsellexperts.com"
                    className="mt-4 block text-sm text-ink/75 transition-colors hover:text-ink"
                  >
                    anthony@exsellexperts.com
                  </a>
                )}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-ink/65">
                  Call Us
                </p>
                {contacts ? (
                  <ul className="mt-4 space-y-2">
                    {contacts.map((c) => (
                      <li key={c.phone}>
                        <a
                          href={`tel:+1${c.phone.replace(/\D/g, "")}`}
                          className="block text-sm text-ink/75 transition-colors hover:text-ink"
                        >
                          <span className="text-ink/65">{c.name.split(" ")[0]}</span>{" "}
                          {c.phone}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <>
                    <a
                      href={telHref(cell)}
                      className="mt-4 block text-sm text-ink/75 transition-colors hover:text-ink"
                    >
                      Call or text Anthony:{" "}
                      <span className="whitespace-nowrap">{cell}</span>
                    </a>
                    <a
                      href="tel:+12628853310"
                      className="mt-2 block text-sm text-ink/75 transition-colors hover:text-ink"
                    >
                      (262) 885-3310
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: site nav */}
          <div className="md:col-span-5 lg:col-span-4 md:text-right">
            <h3 className="sr-only">Site</h3>
            <ul className="space-y-3 text-sm text-ink/75">
              <li>
                <Link href="/" className="transition-colors hover:text-ink">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/#approach" className="transition-colors hover:text-ink">
                  Approach
                </Link>
              </li>
              <li>
                <Link href="/#contact" className="transition-colors hover:text-ink">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Every city page and seller guide, so a crawler starting on any page reaches them all */}
        <div className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-12">
          <nav aria-label="Communities" className="md:col-span-2">
            <p className="text-[11px] uppercase tracking-[0.32em] text-ink/65">
              Communities
            </p>
            <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2 text-sm text-ink/75 sm:grid-cols-2">
              {COMMUNITIES.flatMap((c) => [
                <li key={homesHref(c.slug)}>
                  <Link href={homesHref(c.slug)} className="transition-colors hover:text-ink">
                    {c.name} homes for sale
                  </Link>
                </li>,
                <li key={valueHref(c.slug)}>
                  <Link href={valueHref(c.slug)} className="transition-colors hover:text-ink">
                    {c.name} home values
                  </Link>
                </li>,
              ])}
            </ul>
          </nav>
          <nav aria-label="Seller guides">
            <p className="text-[11px] uppercase tracking-[0.32em] text-ink/65">
              Seller guides
            </p>
            <ul className="mt-4 space-y-2 text-sm text-ink/75">
              {GUIDES.map((g) => (
                <li key={g.href}>
                  <Link href={g.href} className="transition-colors hover:text-ink">
                    {g.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Huge wordmark */}
        <div className="relative mt-20 md:mt-28">
          <div
            aria-hidden="true"
            className="font-display text-ink leading-none tracking-[-0.045em] font-bold"
            style={{ fontSize: "clamp(2.5rem, 8vw, 7rem)" }}
          >
            {wordmark}
          </div>
          {tagline ? (
            <p className="mt-4 text-[11px] uppercase tracking-[0.32em] text-ink/65">
              {tagline}
            </p>
          ) : null}
        </div>

        {/* Small credits — AJ's other projects + partner shoutouts */}
        <div className="mt-12 flex flex-col gap-3 text-[10px] uppercase tracking-[0.28em] text-ink/65">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
            <span>Also by me</span>
            <a
              href="https://unchonk.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-ink/80"
            >
              unChonk
              <span aria-hidden>→</span>
            </a>
            {/* BndryIQ — drop in once it's live */}
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
            <span>Drone + 3D + photo</span>
            <a
              href="https://polarlightsimaging.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-ink/80"
            >
              Polar Lights Imaging
              <span aria-hidden>→</span>
            </a>
          </div>
        </div>

        {/* Legal row */}
        <div className="mt-6 flex flex-col gap-4 border-t border-ink/10 pt-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] uppercase tracking-[0.28em] text-ink/65">
            <span>© {year} Anthony Stolp</span>
            <a href="/privacy" className="hover:text-ink">
              Privacy
            </a>
            <a href="/terms" className="hover:text-ink">
              Terms
            </a>
            <a href="/fair-housing" className="hover:text-ink">
              Fair Housing Notice
            </a>
            <span>Equal Housing Opportunity</span>
          </div>

          <BackToTop />
        </div>
      </div>
      </div>
    </footer>
  );
}
