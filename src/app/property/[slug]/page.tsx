import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicBySlug, getPublicSlugs } from "@/lib/properties";
import { PropertySignInForm } from "@/components/PropertySignInForm";

// Public property page: showcase + open-house sign-in. ISR so edits (price,
// status, open-house time) refresh without a redeploy.
export const revalidate = 300;

type RouteParams = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const slugs = await getPublicSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: RouteParams;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPublicBySlug(slug);
  if (!p) return { title: "Property not found" };
  const title = `${p.address} | Open House`;
  const description =
    p.description?.slice(0, 160) ?? `Open house at ${p.address}.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: p.photo_url ? [p.photo_url] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: { canonical: `/property/${slug}` },
  };
}

function formatPrice(n: number | null): string | null {
  if (n == null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatOpenHouse(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  }).format(d);
}

const STATUS_LABEL: Record<string, string> = {
  coming_soon: "Coming Soon",
  active: "Active",
  closed: "Closed",
};

export default async function PropertyPage({
  params,
}: {
  params: RouteParams;
}) {
  const { slug } = await params;
  const p = await getPublicBySlug(slug);
  if (!p) notFound();

  const price = formatPrice(p.price);
  const openHouse = formatOpenHouse(p.open_house_at);
  const locality = [p.city, p.state].filter(Boolean).join(", ");
  const stats = (
    [
      p.beds != null ? { label: "Beds", value: String(p.beds) } : null,
      p.baths != null ? { label: "Baths", value: String(p.baths) } : null,
      p.sqft != null
        ? { label: "Sq Ft", value: p.sqft.toLocaleString("en-US") }
        : null,
    ] as ({ label: string; value: string } | null)[]
  ).filter((s): s is { label: string; value: string } => s !== null);

  return (
    <main className="min-h-screen bg-cream text-ink">
      {/* Hero photo */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-ink/5 md:aspect-[21/9]">
        {p.photo_url ? (
          // Plain img so any URL (local /public now, S3 later) renders without
          // per-host next/image config. Optimization can come with S3.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.photo_url}
            alt={p.address}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink/30">
            <span className="text-[11px] uppercase tracking-[0.32em]">
              Photos coming soon
            </span>
          </div>
        )}
        <span className="absolute left-6 top-6 bg-ink px-4 py-2 text-[11px] font-medium uppercase tracking-[0.28em] text-cream">
          {STATUS_LABEL[p.status] ?? p.status}
        </span>
      </div>

      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-16 px-6 py-16 md:grid-cols-12 md:px-12 md:py-24">
        {/* Details */}
        <div className="md:col-span-7">
          <h1 className="font-display text-[clamp(2.25rem,4.5vw,3.75rem)] font-semibold leading-[1.04] tracking-[-0.025em]">
            {p.address}
          </h1>
          {locality && (
            <p className="mt-3 text-[15px] uppercase tracking-[0.28em] text-ink/50">
              {locality}
            </p>
          )}

          {price && (
            <p className="mt-8 font-display text-4xl font-semibold tracking-[-0.02em]">
              {price}
            </p>
          )}

          {stats.length > 0 && (
            <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-6 border-t border-ink/10 pt-8">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="text-[11px] uppercase tracking-[0.28em] text-ink/50">
                    {s.label}
                  </dt>
                  <dd className="mt-2 font-display text-2xl font-semibold">
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {openHouse && (
            <div className="mt-10 border-l-2 border-accent-soft pl-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-ink/50">
                Open House
              </p>
              <p className="mt-2 text-lg font-medium">{openHouse}</p>
            </div>
          )}

          {p.description && (
            <div className="mt-12 max-w-2xl whitespace-pre-line text-[16px] leading-[1.8] text-ink/80">
              {p.description}
            </div>
          )}

          {p.lender_name && (
            <div className="mt-12 flex items-center gap-5 border-t border-ink/10 pt-8">
              {p.lender_photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.lender_photo_url}
                  alt={p.lender_name}
                  className="h-16 w-16 rounded-full object-cover"
                />
              )}
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-ink/50">
                  Financing partner
                </p>
                <p className="mt-1 text-lg font-medium">{p.lender_name}</p>
                {p.lender_contact && (
                  <p className="text-[14px] text-ink/60">{p.lender_contact}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sign-in */}
        <div className="md:col-span-5">
          <div className="md:sticky md:top-12">
            <PropertySignInForm propertySlug={p.slug} />
          </div>
        </div>
      </div>
    </main>
  );
}
