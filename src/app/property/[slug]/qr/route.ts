import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { slugExists } from "@/lib/properties";

// Per-property QR code for the open-house poster. Points at the public
// property page. Query params:
//   format=svg       → vector SVG (best for print; scales to any size)
//   size=N           → PNG width in px (default 1024, clamped 256–3000)
//   dark=RRGGBB      → module (foreground) color (default 000000)
//   light=RRGGBB     → background color (default ffffff)
//   transparent=1    → no background (overrides light)
//   download=1       → force a file download instead of inline view

export const dynamic = "force-dynamic";

type RouteParams = Promise<{ slug: string }>;

// Sanitize a hex color param to 6-digit lowercase hex (no leading #), or a
// fallback. Prevents anything but a valid hex reaching the color string.
function normalizeHex(v: string | null, fallback: string): string {
  if (!v) return fallback;
  const h = v.replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(h)) return h.toLowerCase();
  if (/^[0-9a-fA-F]{3}$/.test(h)) {
    return h
      .split("")
      .map((c) => c + c)
      .join("")
      .toLowerCase();
  }
  return fallback;
}

export async function GET(req: Request, { params }: { params: RouteParams }) {
  const { slug } = await params;

  if (!(await slugExists(slug))) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const base = (process.env.SITE_URL ?? "https://anthonystolp.com").replace(
    /\/$/,
    "",
  );
  const target = `${base}/property/${slug}`;

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") === "svg" ? "svg" : "png";
  const transparent = searchParams.get("transparent") === "1";
  const download = searchParams.get("download") === "1";
  const sizeParam = parseInt(searchParams.get("size") ?? "", 10);
  const width = Number.isNaN(sizeParam)
    ? 1024
    : Math.min(Math.max(sizeParam, 256), 3000);

  const darkHex = normalizeHex(searchParams.get("dark"), "000000");
  const lightHex = normalizeHex(searchParams.get("light"), "ffffff");
  const color = {
    dark: `#${darkHex}ff`,
    light: transparent ? "#00000000" : `#${lightHex}ff`,
  };
  const disposition = download ? "attachment" : "inline";

  if (format === "svg") {
    const svg = await QRCode.toString(target, {
      type: "svg",
      margin: 2,
      color,
    });
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Content-Disposition": `${disposition}; filename="qr-${slug}.svg"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  const png = await QRCode.toBuffer(target, {
    width,
    margin: 2,
    errorCorrectionLevel: "M",
    color,
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `${disposition}; filename="qr-${slug}.png"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
