"use client";

import { useState } from "react";
import Image from "next/image";
import { HouseIllustration } from "./HouseIllustration";

// To use a transparent-background PNG of just the home:
//   1. Drop the file at /public/images/hero-house.png
//   2. The component auto-detects it via the LOCAL_HOUSE constant below
//      (if the file is present at that path, set USE_LOCAL = true).
// Until then, falls back to the stock Unsplash photo + edge-vignette.
const USE_LOCAL = true;
const LOCAL_HOUSE = "/images/hero-alpha.png";
const HERO_HOUSE =
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=85&auto=format&fit=crop";

type Props = {
  className?: string;
};

export function HeroHouse({ className }: Props) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return <HouseIllustration className={className} />;
  }

  // Local transparent PNG path — no mask needed, the asset itself
  // has the cutout. This is the right path; vignette is the stopgap.
  if (USE_LOCAL) {
    return (
      <div className={`relative ${className ?? ""}`}>
        <Image
          src={LOCAL_HOUSE}
          alt="Modern luxury home"
          width={1920}
          height={1280}
          priority
          onError={() => setErrored(true)}
          className="h-auto w-full select-none object-contain"
        />
      </div>
    );
  }

  // Stopgap: stock photo with soft vignette mask to fade the JPEG edges.
  const mask =
    "radial-gradient(ellipse 60% 62% at 50% 56%, black 0%, black 38%, rgba(0,0,0,0.75) 62%, rgba(0,0,0,0.3) 84%, transparent 100%)";

  return (
    <div
      className={`relative ${className ?? ""}`}
      style={{ WebkitMaskImage: mask, maskImage: mask }}
    >
      <Image
        src={HERO_HOUSE}
        alt="Modern luxury home"
        width={1920}
        height={1280}
        priority
        onError={() => setErrored(true)}
        className="h-auto w-full select-none object-contain"
      />
    </div>
  );
}
