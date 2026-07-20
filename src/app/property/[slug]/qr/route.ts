import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getBySlug } from "@/lib/properties";

// Per-property QR code for the open-house poster. Points at the public
// property page. Query params:
//   format=svg       → vector SVG (best for print; scales to any size)
//   size=N           → PNG width in px (default 1024, clamped 256–3000)
//   transparent=1    → no background (dark modules only)
//   download=1       → force a file download instead of inline view

export const dynamic = "force-dynamic";

type RouteParams = Promise<{ slug: string }>;

export async function GET(req: Request, { params }: { params: RouteParams }) {
  const { slug } = await params;

  const property = await getBySlug(slug);
  if (!property) {
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

  const color = {
    dark: "#000000ff",
    light: transparent ? "#00000000" : "#ffffffff",
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
