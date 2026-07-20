import Link from "next/link";

type AdminSection = "leads" | "pages" | "properties" | "reports";

export function AdminNavLinks({ current }: { current: AdminSection }) {
  return (
    <nav className="flex gap-6 text-[11px] uppercase tracking-[0.28em]">
      <Item href="/admin/leads" active={current === "leads"}>
        Leads
      </Item>
      <Item href="/admin/pages" active={current === "pages"}>
        Pages
      </Item>
      <Item href="/admin/properties" active={current === "properties"}>
        Properties
      </Item>
      <Item href="/admin/reports" active={current === "reports"}>
        Reports
      </Item>
    </nav>
  );
}

function Item({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "border-b-2 border-ink pb-1 text-ink"
          : "pb-1 text-ink-soft/55 hover:text-ink"
      }
    >
      {children}
    </Link>
  );
}
