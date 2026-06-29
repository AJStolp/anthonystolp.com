import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  NichePageInput,
  createPage,
  listAll,
} from "@/lib/niche-pages";

export async function GET(req: NextRequest) {
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;

  try {
    const pages = await listAll();
    return NextResponse.json({ pages });
  } catch (err) {
    console.error("[admin/pages] list failed:", err);
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

  const parsed = NichePageInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const page = await createPage(parsed.data);
    return NextResponse.json({ page });
  } catch (err) {
    console.error("[admin/pages] create failed:", err);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
