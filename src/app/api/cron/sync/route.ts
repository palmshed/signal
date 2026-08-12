import { NextResponse } from "next/server";
import { getDueConnections, claimConnection, releaseConnection } from "@/lib/connections/store";
import { runSync } from "@/lib/connections/sync";
import type { PlatformId } from "@/lib/platform/meta";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  const expected = process.env.CRON_SECRET || "";

  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();
  const due = getDueConnections(now);

  if (due.length === 0) {
    return NextResponse.json({ ok: true, synced: 0 });
  }

  const results: Array<{ platform: string; ok: boolean; error?: string }> = [];

  for (const connection of due) {
    const lockToken = randomBytes(16).toString("hex");
    const claimed = claimConnection(connection.platform as PlatformId, lockToken);
    if (!claimed) {
      results.push({ platform: connection.platform, ok: false, error: "Failed to claim lock." });
      continue;
    }

    try {
      await runSync(connection.platform as PlatformId, 5);
      results.push({ platform: connection.platform, ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed.";
      results.push({ platform: connection.platform, ok: false, error: message });
    } finally {
      releaseConnection(connection.platform as PlatformId, lockToken);
    }
  }

  return NextResponse.json({ ok: true, synced: results.length, results });
}
