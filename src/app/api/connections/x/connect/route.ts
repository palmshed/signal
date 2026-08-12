import { NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/auth/require-admin";
import { xClient } from "@/lib/platform/x/client";
import { createOAuthCookie } from "@/lib/connections/oauth-state";
import { getConnectionRow } from "@/lib/connections/store";

export async function POST() {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!xClient.isConfigured()) {
    return NextResponse.json({ error: "X OAuth is not configured on the server." }, { status: 501 });
  }

  if (getConnectionRow("x")?.status === "connected") {
    return NextResponse.json({ error: "X is already connected." }, { status: 409 });
  }

  try {
    const { url, state, verifier } = await xClient.start();
    const cookie = createOAuthCookie({ platform: "x", state, verifier, exp: Date.now() + 10 * 60 * 1000 });
    const res = NextResponse.json({ url });
    res.headers.append("Set-Cookie", cookie);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start X OAuth.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
