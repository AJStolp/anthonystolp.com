import { BadgeCheck, Building2, MapPin, Clock } from "lucide-react";

export function TrustStrip() {
  return (
    <section
      aria-label="Credibility"
      className="border-y border-ink/10 bg-cream"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-x-8 gap-y-7 px-6 py-10 sm:grid-cols-2 md:px-12 lg:grid-cols-4">
        <Item icon={BadgeCheck} label="Licensed">
          WI Real Estate License #114204-94
        </Item>
        <Item icon={Building2} label="Brokerage">
          ExSell Experts | Epique Realty
        </Item>
        <Item icon={MapPin} label="Service area">
          Ozaukee · Washington · Waukesha · Sheboygan
          <span className="mt-0.5 block text-[11px] text-ink-soft/55">
            Statewide when you need me
          </span>
        </Item>
        <Item icon={Clock} label="Response">
          Same-day replies
        </Item>
      </div>
    </section>
  );
}

function Item({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof BadgeCheck;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink/15 text-ink-soft"
      >
        <Icon className="h-5 w-5" strokeWidth={1.5} />
      </span>
      <div className="min-w-0">
        <span className="block text-[10px] font-medium uppercase tracking-[0.32em] text-ink-soft/55">
          {label}
        </span>
        <span className="mt-1 block text-[12px] leading-[1.4] text-ink md:text-[13px]">
          {children}
        </span>
      </div>
    </div>
  );
}
