import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Terms of Service · Anthony Stolp Real Estate",
  description:
    "Terms of Service governing your use of anthonystolp.com.",
};

export default function TermsPage() {
  return (
    <main className="relative w-full overflow-x-hidden bg-cream text-ink">
      <Nav />
      <article className="mx-auto max-w-3xl px-6 pb-24 pt-40 md:pb-32 md:pt-48">
        <h1 className="font-display text-[clamp(2.5rem,5vw,4rem)] font-semibold leading-[1.05] tracking-[-0.025em]">
          Terms of Service
        </h1>
        <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.38em] text-ink/55">
          Last updated: May 14, 2026
        </p>

        <div className="mt-12 space-y-10 text-[15px] leading-[1.75] text-ink/80">
          <section>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
              Acceptance of these terms
            </h2>
            <p className="mt-3">
              By using anthonystolp.com (the &ldquo;Site&rdquo;), you agree to
              these Terms of Service. If you do not agree, please do not use
              the Site.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
              About this site
            </h2>
            <p className="mt-3">
              The Site is operated by Anthony Stolp, a licensed real estate
              agent in the State of Wisconsin (License #114204-94), affiliated
              with ExSell Experts at Epique Realty in Germantown, WI.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
              Use of the site
            </h2>
            <p className="mt-3">
              You agree to use the Site only for lawful purposes and in a way
              that does not infringe the rights of others. Information on the
              Site is provided for general informational purposes and does not
              constitute legal, financial, or real estate advice. Real estate
              transactions involve risk and complexity; you should always
              consult licensed professionals before making decisions.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
              SMS / Text Messaging program
            </h2>
            <p className="mt-3">
              If you opt in to receive text messages from Anthony Stolp by
              checking the SMS consent box on our contact form:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li>
                You may receive messages regarding real estate services,
                property inquiries, scheduling, and related communications.
              </li>
              <li>Message and data rates may apply.</li>
              <li>Message frequency varies.</li>
              <li>Reply STOP to opt out of future messages.</li>
              <li>Reply HELP for help.</li>
              <li>
                Carriers are not liable for delayed or undelivered messages.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
              Intellectual property
            </h2>
            <p className="mt-3">
              All content on the Site (including text, design, images, and
              logos) is the property of Anthony Stolp or its licensors and is
              protected by applicable copyright and trademark law.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
              Disclaimers
            </h2>
            <p className="mt-3">
              The Site is provided &ldquo;as is&rdquo; without warranties of
              any kind. While we strive for accuracy, we make no guarantees
              about the completeness or timeliness of any information on the
              Site, including any property listings or market data.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
              Limitation of liability
            </h2>
            <p className="mt-3">
              To the fullest extent permitted by law, Anthony Stolp, ExSell
              Experts, and Epique Realty are not liable for any indirect,
              incidental, or consequential damages arising from your use of
              the Site.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
              Governing law
            </h2>
            <p className="mt-3">
              These Terms are governed by the laws of the State of Wisconsin,
              without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
              Changes to these terms
            </h2>
            <p className="mt-3">
              We may update these Terms at any time. Continued use of the Site
              after changes constitutes acceptance of the updated Terms.
            </p>
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

