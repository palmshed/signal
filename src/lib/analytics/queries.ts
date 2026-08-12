import { desc, sql, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export interface Overview {
  visitors: number;
  pageViews: number;
  postViews: number;
  clicks: number;
}

export function getOverview(sinceIso: string): Overview {
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

  const visitors = db
    .select({ n: sql<number>`count(distinct ${schema.events.sessionId})` })
    .from(schema.events)
    .where(sql`${schema.events.ts} >= ${sinceIso}`)
    .get()?.n ?? 0;

  return {
    visitors: Number(visitors),
    pageViews: byType.pageview ?? 0,
    postViews: byType.postview ?? 0,
    clicks: byType.click ?? 0,
  };
}

export interface SourceRow {
  source: string;
  count: number;
}

export function getSources(sinceIso: string, limit = 6): SourceRow[] {
  const rows = db
    .select({
      source: sql<string>`${schema.events.referrer}`,
      count: sql<number>`count(*)`,
    })
    .from(schema.events)
    .where(
      sql`${schema.events.ts} >= ${sinceIso} and ${schema.events.type} = 'pageview'`,
    )
    .groupBy(schema.events.referrer)
    .orderBy(desc(sql`count(*)`))
    .limit(limit)
    .all();

  return rows.map((r) => ({
    source: r.source === "" ? "direct" : r.source,
    count: Number(r.count),
  }));
}

export interface PostStat {
  postId: string;
  title: string;
  platform: string;
  views: number;
}

export function getTopPosts(sinceIso: string, limit = 10): PostStat[] {
  const rows = db
    .select({
      postId: schema.events.postId,
      views: sql<number>`count(*)`,
    })
    .from(schema.events)
    .where(
      sql`${schema.events.ts} >= ${sinceIso} and ${schema.events.type} = 'postview' and ${schema.events.postId} is not null`,
    )
    .groupBy(schema.events.postId)
    .orderBy(desc(sql`count(*)`))
    .limit(limit)
    .all();

  const ids = rows.map((r) => r.postId as string);
  const posts = ids.length
    ? db.select().from(schema.posts).where(inArray(schema.posts.id, ids)).all()
    : [];

  const byId = new Map(posts.map((p) => [p.id, p]));
  return rows.map((r) => {
    const post = byId.get(r.postId as string);
    return {
      postId: r.postId as string,
      title: post?.title || post?.url || "(untitled)",
      platform: post?.platform || "custom",
      views: Number(r.views),
    };
  });
}

export interface LinkStat {
  linkId: string;
  label: string;
  clicks: number;
}

export function getTopLinks(sinceIso: string, limit = 10): LinkStat[] {
  const rows = db
    .select({
      linkId: schema.events.linkId,
      clicks: sql<number>`count(*)`,
    })
    .from(schema.events)
    .where(
      sql`${schema.events.ts} >= ${sinceIso} and ${schema.events.type} = 'click' and ${schema.events.linkId} is not null`,
    )
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

export interface DimensionRow {
  label: string;
  count: number;
}

export function getByDevice(sinceIso: string): DimensionRow[] {
  const rows = db
    .select({
      label: schema.events.device,
      count: sql<number>`count(*)`,
    })
    .from(schema.events)
    .where(sql`${schema.events.ts} >= ${sinceIso}`)
    .groupBy(schema.events.device)
    .orderBy(desc(sql`count(*)`))
    .all();
  return rows.map((r) => ({ label: r.label, count: Number(r.count) }));
}

export function getByBrowser(sinceIso: string): DimensionRow[] {
  const rows = db
    .select({
      label: schema.events.browser,
      count: sql<number>`count(*)`,
    })
    .from(schema.events)
    .where(sql`${schema.events.ts} >= ${sinceIso}`)
    .groupBy(schema.events.browser)
    .orderBy(desc(sql`count(*)`))
    .all();
  return rows.map((r) => ({ label: r.label, count: Number(r.count) }));
}

export function getDailyPageViews(sinceIso: string, days: number): { day: string; count: number }[] {
  const rows = db
    .select({
      day: sql<string>`date(${schema.events.ts})`,
      count: sql<number>`count(*)`,
    })
    .from(schema.events)
    .where(
      sql`${schema.events.ts} >= ${sinceIso} and ${schema.events.type} = 'pageview'`,
    )
    .groupBy(sql`date(${schema.events.ts})`)
    .orderBy(sql`date(${schema.events.ts})`)
    .all();

  const byDay = new Map(rows.map((r) => [r.day, Number(r.count)]));
  const result: { day: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    result.push({ day: key, count: byDay.get(key) ?? 0 });
  }
  return result;
}

export function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}
