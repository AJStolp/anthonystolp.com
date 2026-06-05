import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Admin login",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ next?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-cream px-6">
      <div className="w-full max-w-sm">
        <p className="text-[11px] uppercase tracking-[0.32em] text-ink-soft/60">
          Admin
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.02em] text-ink">
          Sign in.
        </h1>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
