"use client";

import { SearchGate, useSearchGate } from "@/components/SearchGate";
import { NORTHWOODS_SOURCES } from "@/lib/northwoods";

const DEFAULT_CLASS =
  "group inline-flex w-full items-center justify-center gap-3 border border-ink bg-ink px-8 py-4 text-[12px] uppercase tracking-[0.28em] text-white transition-all hover:bg-transparent hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:w-auto";

type Props = {
  // Marinette County homes and cabins (Residential) or land. AgentFire files
  // them under different listing types, so each is its own search.
  kind: "homes" | "land";
  label: string;
  className?: string;
};

// Opens the listings email gate, then the Marinette County search for `kind`.
export function NorthwoodsSearch({ kind, label, className = DEFAULT_CLASS }: Props) {
  const search = kind === "land" ? "marinette-land" : "marinette-homes";
  const gate = useSearchGate(search);

  return (
    <>
      <button type="button" onClick={gate.request} className={className}>
        {label}
        <span aria-hidden className="transition-transform group-hover:translate-x-1">
          →
        </span>
      </button>
      <SearchGate
        open={gate.open}
        onClose={gate.close}
        search={search}
        source={NORTHWOODS_SOURCES.search}
        campaignContext={{ niche_slug: "northwoods" }}
      />
    </>
  );
}
