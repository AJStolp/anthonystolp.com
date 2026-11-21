"use client";

import { useEffect } from "react";
import { track } from "@/lib/track";

// Mounted once at the root layout. Any tap on a tel: or sms: link anywhere on
// the site fires call_click or text_click, so a phone link needs no click
// handler of its own, and server components can carry one. A link says where
// it sits with data-placement; one without it reports "inline".
export function ContactClickTracking() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      const href = link.getAttribute("href") ?? "";
      const event = href.startsWith("tel:")
        ? "call_click"
        : href.startsWith("sms:")
          ? "text_click"
          : null;
      if (!event) return;
      track({
        event,
        properties: {
          page: window.location.pathname,
          placement: link.dataset.placement ?? "inline",
        },
      });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
