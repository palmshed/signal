import { NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/auth/require-admin";
import { getOverview } from "@/lib/analytics/aggregates";

export async function GET(request: Request) {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const range = url.searchParams.get("range") || "7d";
  const sinceIso = range === "24h" ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() : range === "30d" ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() : range === "90d" ? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const overview = getOverview(sinceIso);
  return NextResponse.json(overview);
}
