import { and, eq, isNull, lte, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { PlatformId, ConnectionTokens, PlatformMe } from "@/lib/platform/types";
import { platformById } from "@/lib/platform/adapter";
import { decryptToken, encryptToken } from "./crypto";
import { nowIso } from "@/lib/util";

export type ConnectionStatus = "connected" | "syncing" | "connected_with_error" | "disconnected";

export interface SaveConnectionInput {
  platform: PlatformId;
  user: PlatformMe;
  tokens: ConnectionTokens;
  scope?: string;
  syncInterval?: number;
}

const DEFAULT_SYNC_INTERVAL = 30;

function addMinutes(iso: string, minutes: number): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

export function getConnectionRow(platform: PlatformId) {
  return db
    .select()
    .from(schema.connections)
    .where(eq(schema.connections.platform, platform))
    .get();
}

export function getSafeConnections(): schema.SafeConnection[] {
  return db.select().from(schema.connections).all();
}

export function getDueConnections(now: string) {
  return db
    .select()
    .from(schema.connections)
    .where(
      and(
        eq(schema.connections.status, "connected"),
        or(isNull(schema.connections.nextSyncAt), lte(schema.connections.nextSyncAt, now)),
      ),
    )
    .all();
}

export function claimConnection(platform: PlatformId, lockToken: string) {
  const result = db
    .update(schema.connections)
    .set({ syncLockToken: lockToken, updatedAt: nowIso() })
    .where(
      and(
        eq(schema.connections.platform, platform),
        eq(schema.connections.status, "connected"),
        isNull(schema.connections.syncLockToken),
      ),
    )
    .run();
  return result.changes > 0;
}

export function releaseConnection(platform: PlatformId, lockToken: string) {
  db.update(schema.connections)
    .set({ syncLockToken: null, updatedAt: nowIso() })
    .where(
      and(eq(schema.connections.platform, platform), eq(schema.connections.syncLockToken, lockToken)),
    )
    .run();
}

export function saveConnection(input: SaveConnectionInput) {
  const now = nowIso();
  const existing = getConnectionRow(input.platform);
  const syncInterval = input.syncInterval ?? DEFAULT_SYNC_INTERVAL;
  const values = {
    platform: input.platform,
    userId: input.user.id,
    username: input.user.username,
    displayName: input.user.name,
    accessTokenEnc: encryptToken(input.tokens.accessToken),
    refreshTokenEnc: input.tokens.refreshToken
      ? encryptToken(input.tokens.refreshToken)
      : "",
    tokenExpiresAt: input.tokens.expiresAt,
    scope: input.scope || input.tokens.scope || "",
    status: "connected" as ConnectionStatus,
    syncError: "",
    syncInterval,
    nextSyncAt: addMinutes(now, syncInterval),
    updatedAt: now,
  };
  if (existing) {
    db.update(schema.connections).set(values).where(eq(schema.connections.platform, input.platform)).run();
  } else {
    db.insert(schema.connections).values({ ...values, createdAt: now, lastSyncedAt: null }).run();
  }
}

export function disconnectConnection(platform: PlatformId) {
  db.update(schema.connections)
    .set({
      userId: "",
      username: "",
      displayName: "",
      accessTokenEnc: "",
      refreshTokenEnc: "",
      tokenExpiresAt: 0,
      scope: "",
      status: "disconnected" as ConnectionStatus,
      lastSyncedAt: null,
      syncError: "",
      syncInterval: DEFAULT_SYNC_INTERVAL,
      nextSyncAt: null,
      syncLockToken: null,
      updatedAt: nowIso(),
    })
    .where(eq(schema.connections.platform, platform))
    .run();
}

export function markConnectionSyncing(platform: PlatformId) {
  db.update(schema.connections)
    .set({ status: "syncing" as ConnectionStatus, syncError: "", updatedAt: nowIso() })
    .where(eq(schema.connections.platform, platform))
    .run();
}

export function markConnectionError(platform: PlatformId, error: string) {
  db.update(schema.connections)
    .set({ status: "connected_with_error" as ConnectionStatus, syncError: error.slice(0, 500), updatedAt: nowIso() })
    .where(eq(schema.connections.platform, platform))
    .run();
}

export function touchSync(platform: PlatformId, error?: string, syncInterval?: number) {
  const now = nowIso();
  const interval = syncInterval ?? getConnectionRow(platform)?.syncInterval ?? DEFAULT_SYNC_INTERVAL;
  db.update(schema.connections)
    .set({
      lastSyncedAt: now,
      syncError: error ?? "",
      status: (error ? "connected_with_error" : "connected") as ConnectionStatus,
      syncInterval: interval,
      nextSyncAt: addMinutes(now, interval),
      syncLockToken: null,
      updatedAt: now,
    })
    .where(eq(schema.connections.platform, platform))
    .run();
}

export async function getAccessToken(platform: PlatformId): Promise<string | null> {
  const row = getConnectionRow(platform);
  if (!row || row.status === "disconnected" || !row.accessTokenEnc) return null;

  const accessToken = decryptToken(row.accessTokenEnc);
  if (!accessToken) {
    markConnectionError(platform, "Failed to decrypt access token.");
    return null;
  }

  if (row.tokenExpiresAt === 0 || row.tokenExpiresAt > Date.now() + 60_000) {
    return accessToken;
  }

  const client = platformById(platform)?.client;
  const refreshToken = row.refreshTokenEnc ? decryptToken(row.refreshTokenEnc) : null;
  if (!client || !refreshToken) return null;

  try {
    const refreshed = await client.refresh(refreshToken);
    const now = nowIso();
    db.update(schema.connections)
      .set({
        accessTokenEnc: encryptToken(refreshed.accessToken),
        refreshTokenEnc: refreshed.refreshToken ? encryptToken(refreshed.refreshToken) : row.refreshTokenEnc,
        tokenExpiresAt: refreshed.expiresAt,
        scope: refreshed.scope || row.scope,
        updatedAt: now,
      })
      .where(eq(schema.connections.platform, platform))
      .run();
    return refreshed.accessToken;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token refresh failed.";
    markConnectionError(platform, message);
    return null;
  }
}

export function getConnectionStatus(platform: PlatformId): ConnectionStatus {
  const row = getConnectionRow(platform);
  if (!row) return "disconnected";
  return row.status as ConnectionStatus;
}

export function updateSyncInterval(platform: PlatformId, intervalMinutes: number) {
  const now = nowIso();
  db.update(schema.connections)
    .set({ syncInterval: intervalMinutes, nextSyncAt: addMinutes(now, intervalMinutes), updatedAt: now })
    .where(eq(schema.connections.platform, platform))
    .run();
}
