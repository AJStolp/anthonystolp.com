import { ListingSearchLink } from "@/components/ListingSearchLink";

const DEFAULT_CLASS =
  "inline-flex w-full items-center justify-center border border-ink bg-ink px-8 py-4 text-center text-[12px] uppercase tracking-[0.28em] text-white transition-all hover:bg-transparent hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:w-auto";

type Props = {
  // Marinette County homes and cabins (Residential) or land. AgentFire files
  // them under different listing types, so each is its own search.
  kind: "homes" | "land";
  label: string;
  className?: string;
};

// A link straight to the Marinette County search for `kind` (T-088).
export function NorthwoodsSearch({ kind, label, className = DEFAULT_CLASS }: Props) {
  return (
    <ListingSearchLink
      search={kind === "land" ? "marinette-land" : "marinette-homes"}
      placement="northwoods"
      className={className}
    >
      {label}
    </ListingSearchLink>
  );
}
