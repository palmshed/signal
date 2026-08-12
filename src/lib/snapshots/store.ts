import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getOverview } from "@/lib/analytics/aggregates";

export interface SnapshotInput {
  day: string;
  platform?: string;
}

export function upsertSnapshot(input: SnapshotInput) {
  const overview = getOverview(input.day);
  const now = new Date().toISOString();

  db.insert(schema.analyticsSnapshots)
    .values({
      day: input.day,
      platform: input.platform || "all",
      visitors: overview.visitors,
      pageViews: overview.pageViews,
      postViews: overview.postViews,
      clicks: overview.clicks,
      newVisitors: overview.newVisitors,
      returningVisitors: overview.returningVisitors,
      engagementRate: overview.engagementRate,
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: [schema.analyticsSnapshots.day, schema.analyticsSnapshots.platform],
      set: {
        visitors: overview.visitors,
        pageViews: overview.pageViews,
        postViews: overview.postViews,
        clicks: overview.clicks,
        newVisitors: overview.newVisitors,
        returningVisitors: overview.returningVisitors,
        engagementRate: overview.engagementRate,
        createdAt: now,
      },
    })
    .run();
}

export function getSnapshot(day: string, platform = "all") {
  return db
    .select()
    .from(schema.analyticsSnapshots)
    .where(and(eq(schema.analyticsSnapshots.day, day), eq(schema.analyticsSnapshots.platform, platform)))
    .get();
}

export function getSnapshots(platform = "all", days = 30) {
  const rows = db
    .select()
    .from(schema.analyticsSnapshots)
    .where(eq(schema.analyticsSnapshots.platform, platform))
    .orderBy(sql`${schema.analyticsSnapshots.day} DESC`)
    .limit(days)
    .all();

  return rows.reverse();
}

export function backfillSnapshots(days = 30) {
  const today = new Date();
  let filled = 0;

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const day = d.toISOString().slice(0, 10);
    
    const existing = getSnapshot(day, "all");
    if (existing) continue;

    try {
      upsertSnapshot({ day, platform: "all" });
      filled++;
    } catch {
      // skip days with no data
    }
  }

  return filled;
}
