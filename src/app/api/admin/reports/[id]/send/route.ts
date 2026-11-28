import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

// Zip sections no longer go out as their own email. They are approved in
// /admin/reports and the River Report issue send places them, so this route
// is gone for good.
export async function POST(req: NextRequest) {
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;

  return NextResponse.json(
    {
      error:
        "Zip sections are no longer sent on their own. They go out inside The River Report.",
    },
    { status: 410 },
  );
}
