import { desc, sql, inArray, and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type {
  AnalyticsOverview,
  ContentStat,
  DailyStat,
  LinkStat,
  PlatformComparison,
  TrafficSource,
  UtmCampaign,
  AudienceRow,
  TimeRange,
} from "./types";

export function getOverview(sinceIso: string): AnalyticsOverview {
  const rows = db
    .select({
      type: schema.events.type,
      count: sql<number>`count(*)`,
    })
    .from(schema.events)
    .where(sql`${schema.events.ts} >= ${sinceIso}`)
    .groupBy(schema.events.type)
    .all();

  const byType = Object.fromEntries(rows.map((r) => [r.type, Number(r.count)]));

  const visitorsRow = db
    .select({
      total: sql<number>`count(distinct ${schema.events.sessionId})`,
      new: sql<number>`count(distinct ${schema.events.sessionId})`,
    })
    .from(schema.events)
    .where(sql`${schema.events.ts} >= ${sinceIso}`)
    .get();

  const totalVisitors = Number(visitorsRow?.total ?? 0);
  
  const firstVisitRow = db
    .select({
      sessionId: schema.events.sessionId,
      firstTs: sql<string>`min(${schema.events.ts})`,
    })
    .from(schema.events)
    .where(sql`${schema.events.ts} >= ${sinceIso}`)
    .groupBy(schema.events.sessionId)
    .all();
  
  const firstVisitSet = new Set(firstVisitRow.map((r) => r.sessionId));
  const newVisitors = firstVisitSet.size;
  const returningVisitors = totalVisitors - newVisitors;

  const pageViews = byType.pageview ?? 0;
  const postViews = byType.postview ?? 0;
  const clicks = byType.click ?? 0;
  const totalEngagements = pageViews + postViews + clicks;
  const engagementRate = totalVisitors > 0 ? Math.round((totalEngagements / totalVisitors) * 100) : 0;
  const viewsPerVisitor = totalVisitors > 0 ? Math.round((pageViews + postViews) / totalVisitors * 100) / 100 : 0;

  return {
    visitors: totalVisitors,
    pageViews,
    postViews,
    clicks,
    newVisitors,
    returningVisitors,
    engagementRate,
    viewsPerVisitor,
  };
}

export function getContentStats(sinceIso: string, platform?: string, limit = 20): ContentStat[] {
  const conditions = [sql`${schema.events.ts} >= ${sinceIso}`, sql`${schema.events.type} = 'postview'`, sql`${schema.events.postId} is not null`];
  if (platform && platform !== "all") {
    conditions.push(sql`${schema.events.postId} in (select id from posts where platform = ${platform})`);
  }

  const rows = db
    .select({
      postId: schema.events.postId,
      views: sql<number>`count(*)`,
    })
    .from(schema.events)
    .where(and(...conditions))
    .groupBy(schema.events.postId)
    .orderBy(desc(sql`count(*)`))
    .limit(limit)
    .all();

  const ids = rows.map((r) => r.postId as string);
  const posts = ids.length
    ? db.select().from(schema.posts).where(inArray(schema.posts.id, ids)).all()
    : [];

  const byId = new Map(posts.map((p) => [p.id, p]));

  const clickRows = db
    .select({
      postId: schema.events.postId,
      clicks: sql<number>`count(*)`,
    })
    .from(schema.events)
    .where(and(sql`${schema.events.ts} >= ${sinceIso}`, sql`${schema.events.type} = 'click'`, sql`${schema.events.postId} is not null`, inArray(schema.events.postId, ids)))
    .groupBy(schema.events.postId)
    .all();
  const clicksByPost = new Map(clickRows.map((r) => [r.postId, Number(r.clicks)]));

  return rows.map((r) => {
    const post = byId.get(r.postId as string);
    const views = Number(r.views);
    const clicks = clicksByPost.get(r.postId as string) ?? 0;
    return {
      postId: r.postId as string,
      title: post?.title || post?.url || "(untitled)",
      platform: post?.platform || "custom",
      views,
      clicks,
      engagementRate: views > 0 ? Math.round((clicks / views) * 1000) / 10 : 0,
    };
  });
}

export function getTrafficSources(sinceIso: string, limit = 20): TrafficSource[] {
  const rows = db
    .select({
      source: sql<string>`case when ${schema.events.referrer} = '' then 'direct' else ${schema.events.referrer} end`,
      count: sql<number>`count(*)`,
    })
    .from(schema.events)
    .where(and(sql`${schema.events.ts} >= ${sinceIso}`, sql`${schema.events.type} = 'pageview'`))
    .groupBy(sql`case when ${schema.events.referrer} = '' then 'direct' else ${schema.events.referrer} end`)
    .orderBy(desc(sql`count(*)`))
    .limit(limit)
    .all();

  const total = rows.reduce((sum, r) => sum + Number(r.count), 0);
  return rows.map((r) => ({
    source: r.source,
    count: Number(r.count),
    percentage: total > 0 ? Math.round((Number(r.count) / total) * 1000) / 10 : 0,
  }));
}

export function getUtmCampaigns(sinceIso: string, limit = 20): UtmCampaign[] {
  const rows = db
    .select({
      campaign: schema.events.utmCampaign,
      source: schema.events.utmSource,
      medium: schema.events.utmMedium,
      count: sql<number>`count(*)`,
    })
    .from(schema.events)
    .where(and(sql`${schema.events.ts} >= ${sinceIso}`, sql`${schema.events.utmCampaign} != ''`, sql`${schema.events.type} = 'pageview'`))
    .groupBy(schema.events.utmCampaign, schema.events.utmSource, schema.events.utmMedium)
    .orderBy(desc(sql`count(*)`))
    .limit(limit)
    .all();

  return rows.map((r) => ({
    campaign: r.campaign,
    source: r.source,
    medium: r.medium,
    count: Number(r.count),
  }));
}

export function getLandingPages(sinceIso: string, limit = 20): { page: string; count: number }[] {
  const rows = db
    .select({
      page: schema.events.landingPage,
      count: sql<number>`count(*)`,
    })
    .from(schema.events)
    .where(and(sql`${schema.events.ts} >= ${sinceIso}`, sql`${schema.events.type} = 'pageview'`, sql`${schema.events.landingPage} != ''`))
    .groupBy(schema.events.landingPage)
    .orderBy(desc(sql`count(*)`))
    .limit(limit)
    .all();

  return rows.map((r) => ({ page: r.page, count: Number(r.count) }));
}

export function getAudienceBreakdown(sinceIso: string, field: "country" | "device" | "browser", limit = 10): AudienceRow[] {
  const rows = db
    .select({
      label: schema.events[field],
      count: sql<number>`count(distinct ${schema.events.sessionId})`,
    })
    .from(schema.events)
    .where(sql`${schema.events.ts} >= ${sinceIso}`)
    .groupBy(schema.events[field])
    .orderBy(desc(sql`count(distinct ${schema.events.sessionId})`))
    .limit(limit)
    .all();

  const total = rows.reduce((sum, r) => sum + Number(r.count), 0);
  return rows.map((r) => ({
    label: r.label || "unknown",
    count: Number(r.count),
    percentage: total > 0 ? Math.round((Number(r.count) / total) * 1000) / 10 : 0,
  }));
}

export function getLinkStats(sinceIso: string, limit = 20): LinkStat[] {
  const rows = db
    .select({
      linkId: schema.events.linkId,
      clicks: sql<number>`count(*)`,
    })
    .from(schema.events)
    .where(and(sql`${schema.events.ts} >= ${sinceIso}`, sql`${schema.events.type} = 'click'`, sql`${schema.events.linkId} is not null`))
    .groupBy(schema.events.linkId)
    .orderBy(desc(sql`count(*)`))
    .limit(limit)
    .all();

  const ids = rows.map((r) => r.linkId as string);
  const linkRows = ids.length
    ? db.select().from(schema.links).where(inArray(schema.links.id, ids)).all()
    : [];

  const byId = new Map(linkRows.map((l) => [l.id, l]));
  return rows.map((r) => ({
    linkId: r.linkId as string,
    label: byId.get(r.linkId as string)?.label || "(deleted link)",
    clicks: Number(r.clicks),
  }));
}

export function getPlatformComparison(sinceIso: string): PlatformComparison[] {
  const platformRows = db
    .select({
      platform: schema.posts.platform,
      postViews: sql<number>`count(*)`,
    })
    .from(schema.events)
    .leftJoin(schema.posts, eq(schema.posts.id, schema.events.postId))
    .where(and(sql`${schema.events.ts} >= ${sinceIso}`, sql`${schema.events.type} = 'postview'`, sql`${schema.posts.platform} != ''`, sql`${schema.posts.platform} is not null`))
    .groupBy(schema.posts.platform)
    .all();

  const clickRows = db
    .select({
      platform: schema.posts.platform,
      clicks: sql<number>`count(*)`,
    })
    .from(schema.events)
    .leftJoin(schema.posts, eq(schema.posts.id, schema.events.postId))
    .where(and(sql`${schema.events.ts} >= ${sinceIso}`, sql`${schema.events.type} = 'click'`, sql`${schema.posts.platform} != ''`, sql`${schema.posts.platform} is not null`))
    .groupBy(schema.posts.platform)
    .all();

  const postCountRows = db
    .select({
      platform: schema.posts.platform,
      count: sql<number>`count(*)`,
    })
    .from(schema.posts)
    .where(sql`${schema.posts.platform} != ''`)
    .groupBy(schema.posts.platform)
    .all();

  const viewsByPlatform = new Map(platformRows.map((r) => [r.platform, Number(r.postViews)]));
  const clicksByPlatform = new Map(clickRows.map((r) => [r.platform, Number(r.clicks)]));
  const postsByPlatform = new Map(postCountRows.map((r) => [r.platform, Number(r.count)]));

  const allPlatforms = new Set([...viewsByPlatform.keys(), ...clicksByPlatform.keys(), ...postsByPlatform.keys()]);

  const result: PlatformComparison[] = [];
  for (const platform of allPlatforms) {
    if (!platform) continue;
    const views = viewsByPlatform.get(platform) ?? 0;
    const clicks = clicksByPlatform.get(platform) ?? 0;
    const posts = postsByPlatform.get(platform) ?? 0;
    result.push({
      platform,
      posts,
      views,
      clicks,
      avgViewsPerPost: posts > 0 ? Math.round(views / posts * 100) / 100 : 0,
      clickThroughRate: views > 0 ? Math.round((clicks / views) * 1000) / 10 : 0,
    });
  }

  return result.sort((a, b) => b.views - a.views);
}

export function getDailyStats(sinceIso: string, days: number): DailyStat[] {
  const rows = db
    .select({
      day: sql<string>`date(${schema.events.ts})`,
      type: schema.events.type,
      count: sql<number>`count(*)`,
    })
    .from(schema.events)
    .where(sql`${schema.events.ts} >= ${sinceIso}`)
    .groupBy(sql`date(${schema.events.ts})`, schema.events.type)
    .orderBy(sql`date(${schema.events.ts})`)
    .all();

  const byDay = new Map<string, { pageViews: number; postViews: number; clicks: number }>();
  for (const r of rows) {
    const day = r.day;
    if (!byDay.has(day)) byDay.set(day, { pageViews: 0, postViews: 0, clicks: 0 });
    const entry = byDay.get(day)!;
    if (r.type === "pageview") entry.pageViews = Number(r.count);
    else if (r.type === "postview") entry.postViews = Number(r.count);
    else if (r.type === "click") entry.clicks = Number(r.count);
  }

  const result: DailyStat[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    const entry = byDay.get(key) ?? { pageViews: 0, postViews: 0, clicks: 0 };
    result.push({ day: key, ...entry });
  }
  return result;
}

export function getTimeRanges(): TimeRange[] {
  return [
    { sinceIso: daysAgoIso(1), label: "24h" },
    { sinceIso: daysAgoIso(7), label: "7d" },
    { sinceIso: daysAgoIso(30), label: "30d" },
    { sinceIso: daysAgoIso(90), label: "90d" },
  ];
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}
