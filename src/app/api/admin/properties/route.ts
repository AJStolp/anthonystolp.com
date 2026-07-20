import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { PropertyInput, createProperty, listAll } from "@/lib/properties";

export async function GET(req: NextRequest) {
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;

  try {
    const properties = await listAll();
    return NextResponse.json({ properties });
  } catch (err) {
    console.error("[admin/properties] list failed:", err);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PropertyInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const property = await createProperty(parsed.data);
    return NextResponse.json({ property });
  } catch (err) {
    console.error("[admin/properties] create failed:", err);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
