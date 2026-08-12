import { NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/auth/require-admin";
import { getContentStats, getDailyStats, getLandingPages, getLinkStats, getOverview, getPlatformComparison, getTrafficSources, getUtmCampaigns } from "@/lib/analytics/aggregates";

export async function GET(request: Request) {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "json";
  const range = url.searchParams.get("range") || "7d";
  const platform = url.searchParams.get("platform") || "all";

  const sinceIso = range === "24h" ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() : range === "30d" ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() : range === "90d" ? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const overview = getOverview(sinceIso);
  const content = getContentStats(sinceIso, platform || undefined, 200);
  const traffic = getTrafficSources(sinceIso);
  const campaigns = getUtmCampaigns(sinceIso);
  const landingPages = getLandingPages(sinceIso);
  const links = getLinkStats(sinceIso);
  const comparison = getPlatformComparison(sinceIso);
  const daily = getDailyStats(sinceIso, range === "24h" ? 1 : range === "7d" ? 7 : range === "30d" ? 30 : 90);

  const payload = {
    generatedAt: new Date().toISOString(),
    range,
    platform,
    overview,
    content,
    traffic,
    campaigns,
    landingPages,
    links,
    comparison,
    daily,
  };

  if (format === "csv") {
    const lines = ["section,metric,value,percentage"];
    
    lines.push(`overview,visitors,${overview.visitors},`);
    lines.push(`overview,pageViews,${overview.pageViews},`);
    lines.push(`overview,postViews,${overview.postViews},`);
    lines.push(`overview,clicks,${overview.clicks},`);
    lines.push(`overview,engagementRate,${overview.engagementRate}%,`);
    lines.push(`overview,newVisitors,${overview.newVisitors},`);
    lines.push(`overview,returningVisitors,${overview.returningVisitors},`);
    
    for (const c of content) {
      lines.push(`content,${c.title.replace(/,/g, "")},${c.views} views / ${c.clicks} clicks / ${c.engagementRate}% engagement,`);
    }
    
    for (const s of traffic) {
      lines.push(`traffic,${s.source.replace(/,/g, "")},${s.count},${s.percentage}%`);
    }
    
    for (const l of links) {
      lines.push(`links,${l.label.replace(/,/g, "")},${l.clicks},`);
    }
    
    for (const p of comparison) {
      lines.push(`comparison,${p.platform},${p.views} views / ${p.clicks} clicks / ${p.avgViewsPerPost} avg,${p.clickThroughRate}% CTR`);
    }
    
    for (const d of daily) {
      lines.push(`daily,${d.day},${d.pageViews + d.postViews + d.clicks},`);
    }

    const csv = lines.join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="analytics-${range}-${Date.now()}.csv"`,
      },
    });
  }

  return NextResponse.json(payload);
}
