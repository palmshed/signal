import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { PlatformId } from "@/lib/platform/types";
import { getAccessToken, getConnectionRow, touchSync, markConnectionError, markConnectionSyncing } from "./store";
import { platformById } from "@/lib/platform/adapter";
import { nowIso } from "@/lib/util";

export interface SyncResult {
  imported: number;
  skipped: number;
  markedUnavailable: number;
  total: number;
}

export async function runSync(platform: PlatformId, maxPages = 5): Promise<SyncResult> {
  const accessToken = await getAccessToken(platform);
  if (!accessToken) {
    throw new Error("Token refresh failed.");
  }

  const connection = getConnectionRow(platform);
  if (!connection) {
    throw new Error("Connection not found.");
  }

  const client = platformById(platform)?.client;
  if (!client) {
    throw new Error("Platform client not available.");
  }

  markConnectionSyncing(platform);

  try {
    const remotePosts = await client.fetchPosts(accessToken, connection.userId, maxPages);
    const remoteIds = new Set(remotePosts.map((p) => p.platformPostId));

    const existingPosts = db
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.platform, platform))
      .all();

    let markedUnavailable = 0;
    const now = nowIso();

    for (const post of existingPosts) {
      if (!post.platformPostId) continue;
      if (remoteIds.has(post.platformPostId)) {
        if (post.status === "unavailable") {
          db.update(schema.posts)
            .set({ status: "published", updatedAt: now })
            .where(eq(schema.posts.id, post.id))
            .run();
          markedUnavailable++;
        }
        continue;
      }

      if (post.status === "unavailable") continue;

      db.update(schema.posts)
        .set({ status: "unavailable", updatedAt: now })
        .where(eq(schema.posts.id, post.id))
        .run();
      markedUnavailable++;
    }

    let imported = 0;
    let skipped = 0;

    for (const post of remotePosts) {
      const existing = db
        .select()
        .from(schema.posts)
        .where(and(eq(schema.posts.platform, platform), eq(schema.posts.platformPostId, post.platformPostId)))
        .get();

      if (existing) {
        skipped++;
        continue;
      }

      const id = `${post.platformPostId}`;
      db.insert(schema.posts)
        .values({
          id,
          url: post.url,
          platform,
          platformPostId: post.platformPostId,
          title: post.text.slice(0, 200),
          description: post.text,
          author: post.author || post.username,
          imageUrl: post.imageUrl || "",
          embedHtml: "",
          status: "published",
          publishedAt: post.createdAt || now,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      imported++;
    }

    touchSync(platform, undefined, connection.syncInterval);
    return { imported, skipped, markedUnavailable, total: remotePosts.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed.";
    markConnectionError(platform, message);
    throw err;
  }
}
