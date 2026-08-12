import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { cookieFor } from "@/lib/auth/session";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = body.email?.toLowerCase().trim() || "";
  const password = body.password || "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const admin = db.select().from(schema.admins).where(eq(schema.admins.email, email)).get();
  if (!admin || !verifyPassword(password, admin.passwordHash, admin.salt)) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.headers.append("Set-Cookie", cookieFor(admin.email));
  res.headers.append(
    "Set-Cookie",
    "signal_is_admin=1; Path=/; SameSite=Lax; Max-Age=2592000",
  );
  return res;
}
