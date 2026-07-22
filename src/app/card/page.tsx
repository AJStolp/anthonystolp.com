import type { Metadata } from "next";
import Link from "next/link";
import { Phone, MessageSquare, Mail, Download, ArrowUpRight } from "lucide-react";
import { getAgentProfile } from "@/lib/agent-profile";
import { OG_IMAGES } from "@/lib/og";

export const metadata: Metadata = {
  title: "Anthony Stolp · Save my contact",
  description:
    "Anthony Stolp, Realtor with ExSell Experts at Epique Realty, serving Ozaukee County, Wisconsin. Save my contact or reach me directly.",
  alternates: { canonical: "/card" },
  openGraph: {
    title: "Anthony Stolp · Realtor",
    description:
      "ExSell Experts at Epique Realty. Serving Ozaukee County, Wisconsin. Save my contact or reach me directly.",
    type: "profile",
    images: OG_IMAGES,
  },
};

export default function CardPage() {
  const p = getAgentProfile();
  const digits = p.mobilePhone.replace(/\D/g, "");
  const telHref = `tel:+1${digits}`;
  const smsHref = `sms:+1${digits}`;
  const mailHref = `mailto:${p.replyToEmail}`;

  const quickAction =
    "flex flex-col items-center gap-2 rounded-2xl border border-cream/20 py-4 text-[11px] uppercase tracking-[0.16em] text-cream/90 transition-colors hover:border-cream/50 hover:bg-cream hover:text-ink";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-cream px-5 py-12 text-ink">
      <div className="w-full max-w-sm">
        <div className="overflow-hidden rounded-[28px] bg-ink text-cream shadow-2xl shadow-ink/20">
          {/* Portrait — transparent cutout sits on the ink panel */}
          <div className="flex justify-center bg-gradient-to-b from-sky-400/15 via-ink to-ink px-6 pt-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/anthony-headshot.png"
              alt="Anthony Stolp"
              width={224}
              height={224}
              className="h-56 w-auto object-contain"
            />
          </div>

          <div className="px-7 pb-8 text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.38em] text-cream/50">
              Realtor · Greater Milwaukee
            </p>
            <h1 className="mt-3 font-display text-[2rem] font-semibold leading-tight tracking-[-0.02em]">
              {p.name}
            </h1>
            <p className="mt-2 text-sm text-cream/70">Brokered by Epique Realty</p>
            <p className="mt-1 text-sm text-cream/70">
              Serving {p.serviceArea}
            </p>

            {/* Primary: save contact */}
            <a
              href="/card/vcard"
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-cream px-6 py-4 text-[12px] font-semibold uppercase tracking-[0.2em] text-ink transition-colors hover:bg-white"
            >
              <Download className="h-4 w-4" aria-hidden />
              Save my contact
            </a>

            {/* Quick actions */}
            <div className="mt-3 grid grid-cols-3 gap-3">
              <a href={telHref} className={quickAction}>
                <Phone className="h-5 w-5" aria-hidden />
                Call
              </a>
              <a href={smsHref} className={quickAction}>
                <MessageSquare className="h-5 w-5" aria-hidden />
                Text
              </a>
              <a href={mailHref} className={quickAction}>
                <Mail className="h-5 w-5" aria-hidden />
                Email
              </a>
            </div>

            {/* Funnel into the site */}
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.24em] text-cream/60 transition-colors hover:text-cream"
            >
              Search homes on {p.websiteDomain}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>

        {/* Brokerage disclosure for WI advertising compliance */}
        <p className="mt-5 text-center text-[10px] uppercase tracking-[0.24em] text-ink-soft/50">
          {p.brokerage} · {p.licenseState} #{p.licenseNumber}
        </p>
      </div>
    </main>
  );
}
