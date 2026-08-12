import { sql } from "drizzle-orm";
import { randomBytes, createHash } from "node:crypto";
import { db, schema } from "@/lib/db";
import { nowIso } from "@/lib/util";

export const API_KEY_PREFIX = "signal_sk_";
const API_KEY_PREFIX_LENGTH = 12;

export type ApiKeyScope = "analytics:read" | "posts:read" | "links:read" | "profile:read";

export interface CreateApiKeyInput {
  name: string;
  scopes: ApiKeyScope[];
}

export interface ApiKeyResult {
  id: string;
  name: string;
  scopes: ApiKeyScope[];
  key: string;
  createdAt: string;
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function createApiKey(input: CreateApiKeyInput): ApiKeyResult {
  const id = `key_${randomBytes(8).toString("base64url")}`;
  const rawKey = `${API_KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, API_KEY_PREFIX_LENGTH);
  const now = nowIso();

  db.insert(schema.apiKeys)
    .values({
      id,
      name: input.name,
      keyHash,
      keyPrefix,
      scopes: input.scopes.join(","),
      createdAt: now,
    })
    .run();

  return {
    id,
    name: input.name,
    scopes: input.scopes,
    key: rawKey,
    createdAt: now,
  };
}

export function listApiKeys() {
  return db.select().from(schema.apiKeys).all();
}

export function deleteApiKey(id: string) {
  db.delete(schema.apiKeys).where(sql`${schema.apiKeys.id} = ${id}`).run();
}

export function verifyApiKey(key: string): { valid: boolean; scopes: ApiKeyScope[]; id: string } | null {
  const keyHash = hashApiKey(key);
  const row = db.select().from(schema.apiKeys).where(sql`${schema.apiKeys.keyHash} = ${keyHash}`).get();
  
  if (!row) return null;

  db.update(schema.apiKeys)
    .set({ lastUsedAt: nowIso() })
    .where(sql`${schema.apiKeys.id} = ${row.id}`)
    .run();

  return {
    valid: true,
    scopes: row.scopes.split(",").filter(Boolean) as ApiKeyScope[],
    id: row.id,
  };
}

export function hasScope(scopes: ApiKeyScope[], required: ApiKeyScope): boolean {
  if (scopes.includes("analytics:read")) return true;
  return scopes.includes(required);
}
