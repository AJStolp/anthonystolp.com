import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  PropertyUpdate,
  deleteProperty,
  updateProperty,
} from "@/lib/properties";

type RouteParams = { params: Promise<{ slug: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;

  const { slug } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PropertyUpdate.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid patch", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const property = await updateProperty(slug, parsed.data);
    return NextResponse.json({ property });
  } catch (err) {
    console.error("[admin/properties] update failed:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;

  const { slug } = await params;
  try {
    await deleteProperty(slug);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/properties] delete failed:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
