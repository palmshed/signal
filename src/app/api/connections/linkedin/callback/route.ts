import { NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/auth/require-admin";
import { linkedinClient } from "@/lib/platform/linkedin/client";
import { verifyOAuthCookie, clearOAuthCookie } from "@/lib/connections/oauth-state";
import { saveConnection } from "@/lib/connections/store";

export async function GET(request: Request) {
  const email = await getAdminEmail();
  if (!email) {
    clearOAuthCookie();
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    clearOAuthCookie();
    return NextResponse.redirect(
      new URL(`/admin/settings?connection_error=${encodeURIComponent(errorDescription || error)}`, request.url),
    );
  }

  if (!code || !state) {
    clearOAuthCookie();
    return NextResponse.redirect(new URL("/admin/settings?connection_error=missing_code", request.url));
  }

  const cookieStore = request.headers.get("cookie") || "";
  const oauthCookie = cookieStore
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("signal_oauth="));
  if (!oauthCookie) {
    clearOAuthCookie();
    return NextResponse.redirect(new URL("/admin/settings?connection_error=missing_state", request.url));
  }

  const token = oauthCookie.slice("signal_oauth=".length);
  const payload = verifyOAuthCookie(token);
  if (!payload || payload.platform !== "linkedin" || payload.state !== state) {
    clearOAuthCookie();
    return NextResponse.redirect(new URL("/admin/settings?connection_error=invalid_state", request.url));
  }

  try {
    const tokens = await linkedinClient.exchange(code, payload.verifier);
    const me = await linkedinClient.me(tokens.accessToken);
    saveConnection({
      platform: "linkedin",
      user: me,
      tokens,
      scope: tokens.scope,
    });
  } catch (err) {
    clearOAuthCookie();
    const message = err instanceof Error ? err.message : "Failed to complete LinkedIn connection.";
    return NextResponse.redirect(
      new URL(`/admin/settings?connection_error=${encodeURIComponent(message)}`, request.url),
    );
  }

  clearOAuthCookie();
  return NextResponse.redirect(new URL("/admin/settings?connection_ok=linkedin", request.url));
}
