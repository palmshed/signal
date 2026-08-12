import { NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/auth/require-admin";
import { backfillSnapshots, getSnapshots } from "@/lib/snapshots/store";

export async function POST() {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const filled = backfillSnapshots(30);
  return NextResponse.json({ ok: true, filled });
}

export async function GET(request: Request) {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") || "30", 10) || 30;
  const platform = url.searchParams.get("platform") || "all";

  const snapshots = getSnapshots(platform || undefined, days);
  return NextResponse.json({ snapshots });
}
