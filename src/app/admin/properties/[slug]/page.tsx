import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNavLinks } from "@/components/admin/AdminNavLinks";
import { PropertyForm } from "@/components/admin/PropertyForm";
import { QrCustomizer } from "@/components/admin/QrCustomizer";
import { getBySlug } from "@/lib/properties";

export const metadata: Metadata = {
  title: "Edit property",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type RouteParams = Promise<{ slug: string }>;

// Convert a stored UTC instant to a datetime-local value in Central time, so
// the form shows the wall-clock time the admin entered. Deterministic on the
// server (fixed timeZone), so it hydrates cleanly.
function isoToCentralInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export default async function EditPropertyPage({
  params,
}: {
  params: RouteParams;
}) {
  const { slug } = await params;
  const property = await getBySlug(slug);
  if (!property) notFound();

  const siteUrl = (process.env.SITE_URL ?? "https://anthonystolp.com").replace(
    /\/$/,
    "",
  );
  const publicUrl = `${siteUrl}/property/${property.slug}`;

  return (
    <main className="min-h-dvh bg-cream pb-32">
      <header className="border-b border-ink/10 bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 pt-4 pb-3">
          <AdminNavLinks current="properties" />
          <form action="/api/admin/logout" method="POST">
            <button
              type="submit"
              className="text-[11px] uppercase tracking-[0.28em] text-ink-soft/60 underline-offset-4 hover:underline"
            >
              Sign out
            </button>
          </form>
        </div>
        <div className="mx-auto flex max-w-3xl items-baseline justify-between px-6 pb-6 md:pb-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-ink-soft/60">
              Admin / Properties
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-[-0.02em] text-ink md:text-3xl">
              Edit{" "}
              <span className="font-mono text-xl">
                /property/{property.slug}
              </span>
            </h1>
          </div>
          <Link
            href="/admin/properties"
            className="text-[11px] uppercase tracking-[0.28em] text-ink-soft/70 hover:text-ink"
          >
            ← Back
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Share: live URL + QR for the poster */}
        <section className="mb-12 border border-ink/15 p-6">
          <p className="text-[11px] uppercase tracking-[0.28em] text-ink-soft/60">
            Share
          </p>
          <div className="mt-4">
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all font-mono text-[13px] text-ink underline underline-offset-4"
            >
              {publicUrl}
            </a>
            <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.24em]">
              <a
                href={`/property/${property.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink underline-offset-4 hover:underline"
              >
                View page
              </a>
              <a
                href={`/property/${property.slug}/qr`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink underline-offset-4 hover:underline"
              >
                View QR
              </a>
            </p>
            <div className="mt-6">
              <QrCustomizer slug={property.slug} />
            </div>
          </div>
        </section>

        <PropertyForm
          mode="edit"
          slug={property.slug}
          initial={{
            slug: property.slug,
            status: property.status,
            address: property.address,
            city: property.city ?? "",
            state: property.state ?? "",
            postal_code: property.postal_code ?? "",
            price: property.price?.toString() ?? "",
            beds: property.beds?.toString() ?? "",
            baths: property.baths?.toString() ?? "",
            sqft: property.sqft?.toString() ?? "",
            description: property.description ?? "",
            photo_url: property.photo_url ?? "",
            open_house_at: isoToCentralInput(property.open_house_at),
            open_house_end: isoToCentralInput(property.open_house_end),
            lender_name: property.lender_name ?? "",
            lender_photo_url: property.lender_photo_url ?? "",
            lender_contact: property.lender_contact ?? "",
          }}
        />
      </div>
    </main>
  );
}
