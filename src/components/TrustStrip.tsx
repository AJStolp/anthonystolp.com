export function TrustStrip() {
  return (
    <section
      aria-label="Credibility"
      className="border-y border-ink/10 bg-cream"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-y-3 px-6 py-6 md:flex-row md:items-center md:justify-between md:gap-6 md:px-12">
        <Item label="Licensed">WI Real Estate License #114204-94</Item>
        <Divider />
        <Item label="Brokerage">ExSell Experts | Epique Realty</Item>
        <Divider />
        <Item label="Service area">
          Ozaukee · Washington · Waukesha · Sheboygan
          <span className="mt-0.5 block text-[11px] text-ink-soft/55">
            Statewide when you need me
          </span>
        </Item>
        <Divider />
        <Item label="Turnaround">24 hour valuations</Item>
      </div>
    </section>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:items-center">
      <span className="text-[10px] font-medium uppercase tracking-[0.32em] text-ink-soft/55">
        {label}
      </span>
      <span className="mt-1 text-[12px] leading-[1.4] text-ink md:text-[13px]">
        {children}
      </span>
    </div>
  );
}

function Divider() {
  return <span aria-hidden className="hidden h-8 w-px bg-ink/10 md:inline-block" />;
}
