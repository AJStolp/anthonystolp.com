"use client";

import { usePathname } from "next/navigation";
import { smsHref, telHref } from "@/lib/phone";

const SMS_BODY = "Hi Anthony, I found you on your website.";

// Pages with their own call and text buttons, or no visitors to convert.
const HIDDEN_ON = ["/admin", "/card"];

// One thumb tap to call or text Anthony, on phones only (hidden from md up).
// ContactClickTracking reports the taps as call_click and text_click with
// placement sticky_bar. The spacer keeps the bar from covering the bottom of
// the footer and the consent checkboxes.
export function MobileContactBar({ cell }: { cell: string }) {
  const pathname = usePathname() ?? "";
  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }

  return (
    <>
      <div
        aria-hidden
        className="md:hidden"
        style={{ height: "calc(3.25rem + env(safe-area-inset-bottom))" }}
      />
      <nav
        aria-label="Call or text Anthony"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-ink/10 bg-white/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <a
          href={telHref(cell)}
          data-placement="sticky_bar"
          aria-label={`Call Anthony at ${cell}`}
          className="flex items-center justify-center py-4 text-[12px] uppercase tracking-[0.28em] text-ink"
        >
          Call Anthony
        </a>
        <a
          href={smsHref(cell, SMS_BODY)}
          data-placement="sticky_bar"
          aria-label={`Text Anthony at ${cell}`}
          className="flex items-center justify-center bg-ink py-4 text-[12px] uppercase tracking-[0.28em] text-white"
        >
          Text Anthony
        </a>
      </nav>
    </>
  );
}
