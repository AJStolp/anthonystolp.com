import type { Metadata } from "next";
import Link from "next/link";
import { AdminNavLinks } from "@/components/admin/AdminNavLinks";
import { listAll } from "@/lib/properties";

export const metadata: Metadata = {
  title: "Properties",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  coming_soon: "Coming Soon",
  active: "Active",
  closed: "Closed",
};

export default async function AdminPropertiesIndex() {
  const properties = await listAll();

  return (
    <main className="min-h-dvh bg-cream pb-32">
      <header className="border-b border-ink/10 bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 pt-4 pb-3">
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
        <div className="mx-auto flex max-w-5xl items-baseline justify-between px-6 pb-6 md:pb-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-ink-soft/60">
              Admin
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-[-0.02em] text-ink md:text-3xl">
              Properties
            </h1>
          </div>
          <Link
            href="/admin/properties/new"
            className="border border-ink px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-ink hover:bg-ink hover:text-cream"
          >
            New property
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        {properties.length === 0 ? (
          <p className="text-ink-soft/60">
            No properties yet.{" "}
            <Link
              href="/admin/properties/new"
              className="underline underline-offset-4"
            >
              Create the first one.
            </Link>
          </p>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-ink/15 text-left text-[11px] uppercase tracking-[0.24em] text-ink-soft/60">
                <th className="py-3 pr-4">Slug</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Address</th>
                <th className="py-3 pr-4">Price</th>
                <th className="py-3 pr-4">Updated</th>
                <th className="py-3"></th>
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => (
                <tr key={p.slug} className="border-b border-ink/10">
                  <td className="py-3 pr-4 font-mono text-ink">{p.slug}</td>
                  <td className="py-3 pr-4 text-ink-soft/80">
                    {STATUS_LABEL[p.status] ?? p.status}
                  </td>
                  <td className="py-3 pr-4 text-ink-soft/80">{p.address}</td>
                  <td className="py-3 pr-4 text-ink-soft/80">
                    {p.price != null
                      ? `$${p.price.toLocaleString("en-US")}`
                      : "—"}
                  </td>
                  <td className="py-3 pr-4 text-ink-soft/60">
                    {new Date(p.updated_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-right">
                    <Link
                      href={`/admin/properties/${p.slug}`}
                      className="text-[11px] uppercase tracking-[0.24em] text-ink underline-offset-4 hover:underline"
                    >
                      Edit
                    </Link>
                    <span className="mx-2 text-ink-soft/30">·</span>
                    <Link
                      href={`/property/${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] uppercase tracking-[0.24em] text-ink-soft/70 underline-offset-4 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
