import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getBySlug } from "@/lib/properties";

// Per-property QR code, generated on demand. GET /property/[slug]/qr returns a
// PNG that points at the public property page — for the open-house poster and
// the tabletop sign-in card. Works for any property automatically.

export const dynamic = "force-dynamic";

type RouteParams = Promise<{ slug: string }>;

export async function GET(
  _req: Request,
  { params }: { params: RouteParams },
) {
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

  const png = await QRCode.toBuffer(target, {
    width: 1024,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="qr-${slug}.png"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
