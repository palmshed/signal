import { NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/auth/require-admin";
import { linkedinClient } from "@/lib/platform/linkedin/client";
import { createOAuthCookie } from "@/lib/connections/oauth-state";
import { getConnectionRow } from "@/lib/connections/store";

export async function POST() {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!linkedinClient.isConfigured()) {
    return NextResponse.json({ error: "LinkedIn OAuth is not configured on the server." }, { status: 501 });
  }

  if (getConnectionRow("linkedin")?.status === "connected") {
    return NextResponse.json({ error: "LinkedIn is already connected." }, { status: 409 });
  }

  try {
    const { url, state } = await linkedinClient.start();
    const cookie = createOAuthCookie({ platform: "linkedin", state, verifier: "", exp: Date.now() + 10 * 60 * 1000 });
    const res = NextResponse.json({ url });
    res.headers.append("Set-Cookie", cookie);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start LinkedIn OAuth.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
