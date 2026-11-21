import { GOOGLE_REVIEWS_URL, REVIEWS, type Review } from "@/lib/reviews";

// Up to three real client quotes, under the trust row on the homepage.
// Renders nothing until src/lib/reviews.ts has an approved quote.
export function Reviews({ reviews = REVIEWS }: { reviews?: Review[] }) {
  if (reviews.length === 0) return null;

  return (
    <section aria-labelledby="reviews-heading" className="border-b border-ink/10 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-12 md:py-20">
        <h2
          id="reviews-heading"
          className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold tracking-[-0.02em] text-ink"
        >
          What clients say
        </h2>
        <ul className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-3">
          {reviews.slice(0, 3).map((r) => (
            <li key={`${r.name}-${r.detail}`}>
              <blockquote className="text-[16px] leading-[1.7] text-ink">{r.quote}</blockquote>
              <p className="mt-4 text-[12px] uppercase tracking-[0.24em] text-ink-soft/80">
                {r.name}, {r.detail}
              </p>
            </li>
          ))}
        </ul>
        {GOOGLE_REVIEWS_URL ? (
          <a
            href={GOOGLE_REVIEWS_URL}
            className="mt-10 inline-block text-[14px] text-ink underline underline-offset-4"
          >
            Read more reviews on Google
          </a>
        ) : null}
      </div>
    </section>
  );
}
