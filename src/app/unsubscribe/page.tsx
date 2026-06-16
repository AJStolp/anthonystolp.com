import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Unsubscribe",
  description: "Unsubscribe from Anthony Stolp market-update emails.",
  robots: { index: false, follow: false },
};

// Confirmation page for the unsubscribe link in market-report emails. We never
// opt out on page load — only when the visitor presses the button, which POSTs
// to /api/unsubscribe. This keeps link-prefetchers and inbox security scanners
// from unsubscribing people without their intent.
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ lid?: string; t?: string }>;
}) {
  const { lid, t } = await searchParams;
  const hasLink = Boolean(lid && t);
  const action = `/api/unsubscribe?lid=${encodeURIComponent(lid ?? "")}&t=${encodeURIComponent(t ?? "")}`;

  return (
    <main className="relative w-full overflow-x-hidden bg-cream text-ink">
      <Nav />
      <article className="mx-auto max-w-xl px-6 pb-24 pt-40 md:pb-32 md:pt-48">
        <h1 className="font-display text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.025em]">
          Unsubscribe
        </h1>
        {hasLink ? (
          <>
            <p className="mt-6 text-[15px] leading-[1.75] text-ink/80">
              Click the button below to stop receiving local market-update
              emails. This will not affect anything else.
            </p>
            <form action={action} method="POST" className="mt-8">
              <button
                type="submit"
                className="rounded-full bg-ink px-7 py-3 text-sm font-medium text-cream transition-colors hover:bg-ink/85"
              >
                Unsubscribe me
              </button>
            </form>
          </>
        ) : (
          <p className="mt-6 text-[15px] leading-[1.75] text-ink/80">
            This unsubscribe link is missing its details. Please open the link
            directly from one of our emails, or reply to any email with
            &ldquo;unsubscribe&rdquo; and we will take you off the list.
          </p>
        )}
      </article>
      <Footer />
    </main>
  );
}
