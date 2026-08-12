import { NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-keys/auth";
import { getOverview, getContentStats, getPlatformComparison, getDailyStats } from "@/lib/analytics/aggregates";

export async function GET(request: Request) {
  const auth = requireApiKey(request, "analytics:read");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const range = url.searchParams.get("range") || "7d";
  const platform = url.searchParams.get("platform") || "all";

  const sinceIso = range === "24h" ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() : range === "30d" ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() : range === "90d" ? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const overview = getOverview(sinceIso);
  const content = getContentStats(sinceIso, platform || undefined, 50);
  const comparison = getPlatformComparison(sinceIso);
  const days = range === "24h" ? 1 : range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const daily = getDailyStats(sinceIso, days);

  return NextResponse.json({
    overview,
    content,
    comparison,
    daily,
    meta: { range, platform, generatedAt: new Date().toISOString() },
  });
}
