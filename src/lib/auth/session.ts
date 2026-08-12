import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "signal_session";
const TTL_MS = 1000 * 60 * 60 * 24 * 30;

function secret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production.");
  }
  return "signal-dev-secret";
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function signSession(payload: { email: string; exp: number }): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySession(token: string): { email: string; exp: number } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = sign(body);
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      email: string;
      exp: number;
    };
    if (typeof payload.email !== "string" || typeof payload.exp !== "number") return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function newSession(email: string): string {
  return signSession({ email, exp: Date.now() + TTL_MS });
}

export function cookieFor(email: string): string {
  const ttl = Math.floor(TTL_MS / 1000);
  return `${COOKIE_NAME}=${newSession(email)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ttl}`;
}

export function clearCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function sessionCookieName(): string {
  return COOKIE_NAME;
}
