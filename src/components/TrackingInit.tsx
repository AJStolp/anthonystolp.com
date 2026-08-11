"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { persistAttribution } from "@/lib/attribution";
import { track } from "@/lib/track";
import { getOrCreateVisitorId } from "@/lib/visitor";

// Mounted once at the root layout. Mints the visitor cookie on first load
// and fires a page_view on every route change. Search params are captured
// in the track call via window.location, so we don't need useSearchParams
// (which would force a Suspense boundary).

export function TrackingInit() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    getOrCreateVisitorId();
    // Runs before the page_view below, so an ad click is banked even if the
    // visitor navigates away from the landing page before converting.
    persistAttribution();
  }, []);

  useEffect(() => {
    if (!pathname) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    track({ event: "page_view" });
  }, [pathname]);

  return null;
}
