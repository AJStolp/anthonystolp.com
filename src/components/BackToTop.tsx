"use client";

import { ArrowUp } from "lucide-react";

// The footer's only interactive piece, kept apart so the footer itself renders
// on the server and can read the agent profile there.
export function BackToTop() {
  const scrollTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <button
      onClick={scrollTop}
      aria-label="Back to top"
      className="group flex h-10 w-10 items-center justify-center self-end rounded-full border border-ink/20 text-ink/65 transition-all hover:border-ink hover:text-ink md:self-auto"
    >
      <ArrowUp className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" strokeWidth={1.5} />
    </button>
  );
}
