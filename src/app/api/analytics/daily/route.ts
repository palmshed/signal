import { NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/auth/require-admin";
import { getDailyStats } from "@/lib/analytics/aggregates";

export async function GET(request: Request) {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const range = url.searchParams.get("range") || "7d";
  const days = range === "24h" ? 1 : range === "30d" ? 30 : range === "90d" ? 90 : 7;
  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const daily = getDailyStats(sinceIso, days);
  return NextResponse.json({ daily });
}
