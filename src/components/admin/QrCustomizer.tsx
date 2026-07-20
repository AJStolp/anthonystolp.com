"use client";

import { useState } from "react";

function hex(color: string): string {
  return color.replace(/^#/, "");
}

// Interactive QR customizer for the admin property page. Picks module color,
// background color, or transparent, with a live preview and downloads that
// honor the choices. All rendering happens server-side in /property/[slug]/qr;
// this just builds the query string.
export function QrCustomizer({ slug }: { slug: string }) {
  const [dark, setDark] = useState("#000000");
  const [light, setLight] = useState("#ffffff");
  const [transparent, setTransparent] = useState(false);

  function query(extra: Record<string, string>): string {
    const p = new URLSearchParams();
    p.set("dark", hex(dark));
    if (transparent) p.set("transparent", "1");
    else p.set("light", hex(light));
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
    return p.toString();
  }

  const previewUrl = `/property/${slug}/qr?${query({ size: "512" })}`;
  const pngUrl = `/property/${slug}/qr?${query({ size: "2048", download: "1" })}`;
  const svgUrl = `/property/${slug}/qr?${query({ format: "svg", download: "1" })}`;

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      {/* Preview on a checkerboard so transparency is visible */}
      <div className="shrink-0">
        <div
          className="border border-ink/10 p-2"
          style={{
            backgroundImage:
              "conic-gradient(#e6e6e6 25%, #ffffff 0 50%, #e6e6e6 0 75%, #ffffff 0)",
            backgroundSize: "14px 14px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="QR preview" className="h-40 w-40" />
        </div>
      </div>

      {/* Controls */}
      <div className="flex-1 space-y-5">
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-3 text-[11px] uppercase tracking-[0.24em] text-ink-soft/70">
            <input
              type="color"
              value={dark}
              onChange={(e) => setDark(e.target.value)}
              className="h-8 w-10 cursor-pointer border border-ink/20 bg-transparent"
              aria-label="Module color"
            />
            Module color
          </label>

          <label
            className={`flex items-center gap-3 text-[11px] uppercase tracking-[0.24em] ${
              transparent ? "text-ink-soft/30" : "text-ink-soft/70"
            }`}
          >
            <input
              type="color"
              value={light}
              disabled={transparent}
              onChange={(e) => setLight(e.target.value)}
              className="h-8 w-10 cursor-pointer border border-ink/20 bg-transparent disabled:opacity-40"
              aria-label="Background color"
            />
            Background
          </label>
        </div>

        <label className="flex items-center gap-3 text-[13px] text-ink">
          <input
            type="checkbox"
            checked={transparent}
            onChange={(e) => setTransparent(e.target.checked)}
            className="h-4 w-4 accent-ink"
          />
          Transparent background (no fill)
        </label>

        <div className="flex flex-wrap gap-3 pt-1">
          <a
            href={pngUrl}
            download={`qr-${slug}.png`}
            className="border border-ink px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-ink hover:bg-ink hover:text-cream"
          >
            Download PNG (2048px)
          </a>
          <a
            href={svgUrl}
            download={`qr-${slug}.svg`}
            className="border border-ink px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-ink hover:bg-ink hover:text-cream"
          >
            Download SVG
          </a>
        </div>

        <p className="text-[11px] leading-[1.6] text-ink-soft/50">
          A QR needs contrast to scan: keep the modules dark against a light
          backing, and place a transparent code on a light part of your design.
        </p>
      </div>
    </div>
  );
}
