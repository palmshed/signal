import { NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/auth/require-admin";
import { getAccessToken, getConnectionRow, markConnectionSyncing, markConnectionError, touchSync } from "@/lib/connections/store";
import { threadsClient } from "@/lib/platform/threads/client";

export async function GET(request: Request) {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const maxPages = Math.min(Math.max(parseInt(url.searchParams.get("maxPages") || "5", 10) || 5, 1), 20);

  const accessToken = await getAccessToken("threads");
  if (!accessToken) {
    return NextResponse.json({ error: "Threads is not connected or token refresh failed." }, { status: 403 });
  }

  const connection = getConnectionRow("threads");
  if (!connection) {
    return NextResponse.json({ error: "No Threads connection found." }, { status: 404 });
  }

  try {
    markConnectionSyncing("threads");
    const posts = await threadsClient.fetchPosts(accessToken, connection.userId, maxPages);
    touchSync("threads");
    return NextResponse.json({ posts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch Threads posts.";
    markConnectionError("threads", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
