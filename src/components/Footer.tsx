"use client";

import { ArrowUp } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();

  const scrollTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

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
                <p className="text-[11px] uppercase tracking-[0.32em] text-ink/50">
                  Head Office
                </p>
                <p className="mt-4 text-sm leading-[1.7] text-ink/75">
                  ExSell Experts
                  <br />
                  Epique Realty
                  <br />
                  Germantown, WI
                  <br />
                  <span className="text-ink/55">WI Lic. #114204-94</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-ink/50">
                  Email Us
                </p>
                <a
                  href="mailto:anthony@exsellexperts.com"
                  className="mt-4 block text-sm text-ink/75 transition-colors hover:text-ink"
                >
                  anthony@exsellexperts.com
                </a>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-ink/50">
                  Call Us
                </p>
                <a
                  href="tel:+12628853310"
                  className="mt-4 block text-sm text-ink/75 transition-colors hover:text-ink"
                >
                  (262) 885-3310
                </a>
              </div>
            </div>
          </div>

          {/* RIGHT: site nav */}
          <div className="md:col-span-5 lg:col-span-4 md:text-right">
            <h3 className="sr-only">Site</h3>
            <ul className="space-y-3 text-sm text-ink/75">
              <li>
                <a href="#" className="transition-colors hover:text-ink">
                  Home
                </a>
              </li>
              <li>
                <a href="#approach" className="transition-colors hover:text-ink">
                  Approach
                </a>
              </li>
              <li>
                <a href="#contact" className="transition-colors hover:text-ink">
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Huge wordmark */}
        <div className="relative mt-20 md:mt-28">
          <h2
            className="font-display text-ink leading-none tracking-[-0.045em] font-bold"
            style={{ fontSize: "clamp(2.5rem, 8vw, 7rem)" }}
          >
            HOMEWARD
          </h2>
        </div>

        {/* Small credits — AJ's other projects + partner shoutouts */}
        <div className="mt-12 flex flex-col gap-3 text-[10px] uppercase tracking-[0.28em] text-ink/45">
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
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] uppercase tracking-[0.28em] text-ink/50">
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

          <button
            onClick={scrollTop}
            aria-label="Back to top"
            className="group flex h-10 w-10 items-center justify-center self-end rounded-full border border-ink/20 text-ink/65 transition-all hover:border-ink hover:text-ink md:self-auto"
          >
            <ArrowUp className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
      </div>
    </footer>
  );
}
