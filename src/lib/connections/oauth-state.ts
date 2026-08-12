import { createHmac, timingSafeEqual } from "node:crypto";
import type { PlatformId } from "@/lib/platform/types";

const COOKIE_NAME = "signal_oauth";

function secret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production.");
  }
  return "signal-dev-secret";
}

interface OAuthStatePayload {
  platform: PlatformId;
  state: string;
  verifier: string;
  exp: number;
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function createOAuthCookie(payload: OAuthStatePayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const token = `${body}.${sign(body)}`;
  const secure = (process.env.APP_URL || "").startsWith("https");
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure ? "; Secure" : ""}`;
}

export function verifyOAuthCookie(token: string): OAuthStatePayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = sign(body);
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as OAuthStatePayload;
    if (
      typeof payload.platform !== "string" ||
      typeof payload.state !== "string" ||
      typeof payload.verifier !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function clearOAuthCookie(): string {
  const secure = (process.env.APP_URL || "").startsWith("https");
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}
