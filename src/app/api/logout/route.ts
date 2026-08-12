import { NextResponse } from "next/server";
import { clearCookie } from "@/lib/auth/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.append("Set-Cookie", clearCookie());
  res.headers.append(
    "Set-Cookie",
    "signal_is_admin=; Path=/; SameSite=Lax; Max-Age=0",
  );
  return res;
}
