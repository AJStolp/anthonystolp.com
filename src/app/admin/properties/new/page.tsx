import type { Metadata } from "next";
import Link from "next/link";
import { AdminNavLinks } from "@/components/admin/AdminNavLinks";
import { PropertyForm } from "@/components/admin/PropertyForm";

export const metadata: Metadata = {
  title: "New property",
  robots: { index: false, follow: false },
};

export default function NewPropertyPage() {
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
              New property
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
        <PropertyForm mode="create" />
      </div>
    </main>
  );
}
