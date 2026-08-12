import { NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/auth/require-admin";
import { getAccessToken, getConnectionRow, markConnectionSyncing, markConnectionError, touchSync } from "@/lib/connections/store";
import { linkedinClient } from "@/lib/platform/linkedin/client";

export async function GET(request: Request) {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const maxPages = Math.min(Math.max(parseInt(url.searchParams.get("maxPages") || "5", 10) || 5, 1), 20);

  const accessToken = await getAccessToken("linkedin");
  if (!accessToken) {
    return NextResponse.json({ error: "LinkedIn is not connected or token refresh failed." }, { status: 403 });
  }

  const connection = getConnectionRow("linkedin");
  if (!connection) {
    return NextResponse.json({ error: "No LinkedIn connection found." }, { status: 404 });
  }

  try {
    markConnectionSyncing("linkedin");
    const posts = await linkedinClient.fetchPosts(accessToken, connection.userId, maxPages);
    touchSync("linkedin");
    return NextResponse.json({ posts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch LinkedIn posts.";
    markConnectionError("linkedin", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
