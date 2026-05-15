import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Privacy Policy · Anthony Stolp Real Estate",
  description:
    "How Anthony Stolp Real Estate collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <main className="relative w-full overflow-x-hidden bg-cream text-ink">
      <Nav />
      <article className="mx-auto max-w-3xl px-6 pb-24 pt-40 md:pb-32 md:pt-48">
        <h1 className="font-display text-[clamp(2.5rem,5vw,4rem)] font-semibold leading-[1.05] tracking-[-0.025em]">
          Privacy Policy
        </h1>
        <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.38em] text-ink/55">
          Last updated: May 14, 2026
        </p>

        <div className="mt-12 space-y-10 text-[15px] leading-[1.75] text-ink/80">
          <section>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
              Who we are
            </h2>
            <p className="mt-3">
              Anthony Stolp is a licensed real estate agent in the State of
              Wisconsin (License #114204-94), affiliated with ExSell Experts at
              Epique Realty in Germantown, WI (&ldquo;we,&rdquo; &ldquo;us,&rdquo;
              or &ldquo;our&rdquo;). This Privacy Policy explains what
              information we collect through anthonystolp.com (the
              &ldquo;Site&rdquo;) and how we use it.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
              Information we collect
            </h2>
            <p className="mt-3">
              When you submit our contact form, we collect information you
              voluntarily provide, including:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li>Name</li>
              <li>Email address</li>
              <li>Phone number (optional)</li>
              <li>
                Your stated intent (buy, sell, both, or exploring)
              </li>
              <li>Any message you choose to share</li>
            </ul>
            <p className="mt-3">
              We may also automatically collect basic technical information
              through standard web logs (IP address, browser type, page visits)
              for security and analytics purposes.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
              How we use your information
            </h2>
            <p className="mt-3">We use your information to:</p>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li>Respond to your inquiry about real estate services</li>
              <li>
                Schedule appointments, showings, or consultations
              </li>
              <li>
                Send you information about properties or market updates
                relevant to your inquiry
              </li>
              <li>Comply with legal and regulatory requirements</li>
            </ul>
            <p className="mt-3">
              We will not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
              How we share your information
            </h2>
            <p className="mt-3">We may share your information with:</p>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li>
                Our brokerage (Epique Realty) for compliance and supervisory
                purposes
              </li>
              <li>
                Service providers who help us operate the website, email, and
                CRM systems (e.g., Lofty, Resend) under confidentiality
                obligations
              </li>
              <li>Government authorities if required by law</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
              SMS / Text Messaging
            </h2>
            <p className="mt-3">
              If you opt in to receive text messages from us by checking the
              SMS consent box on our contact form, you may receive messages
              regarding real estate services, property inquiries, scheduling,
              and related communications.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li>Message frequency varies.</li>
              <li>Message and data rates may apply.</li>
              <li>
                You can opt out of SMS messages at any time by replying STOP to
                any message we send.
              </li>
              <li>Reply HELP for assistance.</li>
            </ul>
            <p className="mt-3 font-medium text-ink">
              Text messaging originator opt-in data and consent will not be
              shared with any third parties.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
              Cookies and analytics
            </h2>
            <p className="mt-3">
              This website may use cookies and similar technologies to remember
              your preferences and analyze how visitors use the Site. You can
              disable cookies in your browser settings; some Site features may
              not work without them.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
              Your rights
            </h2>
            <p className="mt-3">
              You may request access to, correction of, or deletion of your
              personal information by emailing{" "}
              <a
                href="mailto:anthony@exsellexperts.com"
                className="underline underline-offset-2 hover:text-ink/60"
              >
                anthony@exsellexperts.com
              </a>
              . We&apos;ll respond within a reasonable time and as required by
              applicable law.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
              Children&apos;s privacy
            </h2>
            <p className="mt-3">
              This website is not intended for children under 13. We do not
              knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
              Changes to this policy
            </h2>
            <p className="mt-3">
              We may update this Privacy Policy from time to time. The
              &ldquo;Last updated&rdquo; date at the top reflects the most
              recent changes.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-ink">
              Contact
            </h2>
            <p className="mt-3">
              Questions about this Privacy Policy? Email{" "}
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

