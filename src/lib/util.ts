import { randomBytes } from "node:crypto";

export function newId(prefix = ""): string {
  const rand = randomBytes(6).toString("base64url");
  return prefix ? `${prefix}_${rand}` : rand;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
