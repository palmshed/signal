import { NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/auth/require-admin";
import { runSync } from "@/lib/connections/sync";

export async function POST(request: Request) {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const maxPages = Math.min(Math.max(parseInt(url.searchParams.get("maxPages") || "5", 10) || 5, 1), 20);

  try {
    const result = await runSync("threads", maxPages);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
