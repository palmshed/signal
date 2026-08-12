"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PLATFORM_META, type PlatformId } from "@/lib/platform/meta";
import type { SafeConnection } from "@/lib/db/schema";

interface PlatformPost {
  platformPostId: string;
  url: string;
  text: string;
  author: string;
  username: string;
  createdAt: string;
  imageUrl: string;
}

const SUPPORTED_PLATFORMS: { id: PlatformId; available: boolean }[] = [
  { id: "x", available: true },
  { id: "linkedin", available: true },
  { id: "threads", available: true },
];

export function ConnectionsForm() {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<SafeConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [posts, setPosts] = useState<PlatformPost[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [activeSyncPlatform, setActiveSyncPlatform] = useState<PlatformId | null>(null);

  async function fetchConnections() {
    try {
      const res = await fetch("/api/connections");
      if (res.ok) {
        const data = (await res.json()) as { connections: SafeConnection[] };
        setConnections(data.connections);
      }
    } finally {
      setLoading(false);
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const ok = searchParams.get("connection_ok");
    const error = searchParams.get("connection_error");
    if (ok === "x" || ok === "linkedin") {
      setMessage({ type: "ok", text: `${PLATFORM_META[ok as PlatformId].label} connected successfully.` });
      fetchConnections();
      window.history.replaceState({}, "", "/admin/settings");
    } else if (error) {
      setMessage({ type: "error", text: decodeURIComponent(error) });
      window.history.replaceState({}, "", "/admin/settings");
    }
  }, [searchParams]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function connect(platform: PlatformId) {
    setActionLoading(platform);
    setMessage(null);
    try {
      const res = await fetch(`/api/connections/${platform}/connect`, { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setMessage({ type: "error", text: data.error || "Failed to start connection." });
        return;
      }
      window.location.href = data.url;
    } finally {
      setActionLoading(null);
    }
  }

  async function disconnect(platform: PlatformId) {
    setActionLoading(platform);
    setMessage(null);
    try {
      const res = await fetch(`/api/connections/${platform}/disconnect`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setMessage({ type: "error", text: data.error || "Failed to disconnect." });
        return;
      }
      setMessage({ type: "ok", text: `${PLATFORM_META[platform].label} disconnected.` });
      fetchConnections();
    } finally {
      setActionLoading(null);
    }
  }

  async function syncPosts(platform: PlatformId) {
    setSyncing(true);
    setMessage(null);
    setPosts([]);
    setSelectedIds(new Set());
    setActiveSyncPlatform(platform);
    try {
      const res = await fetch(`/api/connections/${platform}/posts`);
      const data = (await res.json()) as { posts?: PlatformPost[]; error?: string };
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to fetch posts." });
        return;
      }
      setPosts(data.posts ?? []);
    } finally {
      setSyncing(false);
      setActiveSyncPlatform(null);
    }
  }

  async function fullSync(platform: PlatformId) {
    setActionLoading(`${platform}-sync`);
    setMessage(null);
    try {
      const res = await fetch(`/api/connections/${platform}/sync`, { method: "POST" });
      const data = (await res.json()) as { imported?: number; skipped?: number; markedUnavailable?: number; total?: number; error?: string };
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Full sync failed." });
        return;
      }
      const parts = [`Synced ${data.total ?? 0} posts.`];
      if ((data.imported ?? 0) > 0) parts.push(`${data.imported} imported.`);
      if ((data.skipped ?? 0) > 0) parts.push(`${data.skipped} already existed.`);
      if ((data.markedUnavailable ?? 0) > 0) parts.push(`${data.markedUnavailable} marked unavailable.`);
      setMessage({ type: "ok", text: parts.join(" ") });
      fetchConnections();
    } finally {
      setActionLoading(null);
    }
  }

  async function importSelected(platform: PlatformId) {
    if (selectedIds.size === 0) return;
    setImporting(true);
    setMessage(null);
    try {
      const selected = posts.filter((p) => selectedIds.has(p.platformPostId));
      const res = await fetch(`/api/connections/${platform}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts: selected }),
      });
      const data = (await res.json()) as { imported?: string[]; skipped?: string[]; total?: number; error?: string };
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to import posts." });
        return;
      }
      const skippedCount = (data.skipped ?? []).length;
      const text =
        skippedCount > 0
          ? `Imported ${data.imported?.length ?? 0} of ${data.total ?? 0} posts (${skippedCount} already existed).`
          : `Imported ${data.imported?.length ?? 0} posts.`;
      setMessage({ type: "ok", text });
      setPosts([]);
      setSelectedIds(new Set());
    } finally {
      setImporting(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const connectionMap = useMemo(() => {
    const map = new Map<string, SafeConnection>();
    for (const c of connections) map.set(c.platform, c);
    return map;
  }, [connections]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  function formatNextSync(nextSyncAt: string | null | undefined): string {
    if (!nextSyncAt) return "";
    const then = new Date(nextSyncAt).getTime();
    const diffMs = then - now;
    if (diffMs <= 0) return "due now";
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `in ${diffMin} min`;
    const diffHrs = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return `in ${diffHrs}h ${mins}m`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-medium text-neutral-900">Connections</h2>
        <p className="mt-1 text-xs text-neutral-400">
          Connect your accounts to import posts and keep them in sync. Automatic sync runs in the background.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            message.type === "ok"
              ? "border-neutral-200 bg-neutral-50 text-neutral-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-400">Loading connections…</p>
      ) : (
        <div className="space-y-3">
          {SUPPORTED_PLATFORMS.map((platform) => {
            const meta = PLATFORM_META[platform.id];
            const connection = connectionMap.get(platform.id);
            const isConnected = connection?.status === "connected";
            const isSyncing = connection?.status === "syncing";
            const hasError = connection?.status === "connected_with_error";
            const isDisconnected = connection?.status === "disconnected";
            const isActionLoading = actionLoading === platform.id || actionLoading === `${platform}-sync`;

            return (
              <div
                key={platform.id}
                className="rounded-lg border border-neutral-200 bg-white px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-sm font-semibold uppercase text-neutral-600">
                      {meta.icon}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-neutral-900">{meta.label}</div>
                      <div className="text-xs text-neutral-400">
                        {isConnected
                          ? `Connected as @${connection.username}`
                          : hasError
                            ? `Error: ${connection.syncError?.slice(0, 120) || "Unknown"}`
                            : isSyncing
                              ? "Syncing…"
                              : isDisconnected
                                ? "Not connected"
                                : "Coming soon"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isConnected && platform.available && (
                      <>
                        <button
                          type="button"
                          onClick={() => fullSync(platform.id)}
                          disabled={isActionLoading}
                          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:border-neutral-400 disabled:opacity-50"
                        >
                          {actionLoading === `${platform}-sync` ? "Syncing…" : "Full sync"}
                        </button>
                        <button
                          type="button"
                          onClick={() => syncPosts(platform.id)}
                          disabled={syncing || isActionLoading}
                          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:border-neutral-400 disabled:opacity-50"
                        >
                          {syncing && activeSyncPlatform === platform.id ? "Loading…" : "Sync posts"}
                        </button>
                      </>
                    )}
                    {isConnected && (
                      <button
                        type="button"
                        onClick={() => disconnect(platform.id)}
                        disabled={isActionLoading}
                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:border-red-300 hover:text-red-700 disabled:opacity-50"
                      >
                        Disconnect
                      </button>
                    )}
                    {hasError && (
                      <button
                        type="button"
                        onClick={() => connect(platform.id)}
                        disabled={isActionLoading}
                        className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
                      >
                        Reconnect
                      </button>
                    )}
                    {isDisconnected && (
                      <button
                        type="button"
                        onClick={() => connect(platform.id)}
                        disabled={!platform.available || isActionLoading}
                        className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
                      >
                        {isActionLoading ? "Connecting…" : platform.available ? "Connect" : "Later"}
                      </button>
                    )}
                  </div>
                </div>
                {connection?.lastSyncedAt && (
                  <div className="mt-2 text-xs text-neutral-400">
                    Last synced: {new Date(connection.lastSyncedAt).toLocaleString()}
                    {connection.nextSyncAt && (
                      <> · Next sync: {formatNextSync(connection.nextSyncAt)}</>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {posts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-neutral-900">
              {activeSyncPlatform ? `${PLATFORM_META[activeSyncPlatform].label} posts` : "Posts"}
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds(new Set(posts.map((p) => p.platformPostId)))}
                className="text-xs text-neutral-500 hover:text-neutral-800"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-neutral-500 hover:text-neutral-800"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => activeSyncPlatform && importSelected(activeSyncPlatform)}
                disabled={selectedIds.size === 0 || importing}
                className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                {importing ? "Importing…" : `Import ${selectedIds.size > 0 ? `(${selectedIds.size})` : ""}`}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {posts.map((post) => (
              <label
                key={post.platformPostId}
                className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 cursor-pointer hover:border-neutral-300"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(post.platformPostId)}
                  onChange={() => toggleSelect(post.platformPostId)}
                  className="mt-1 h-4 w-4 rounded border-neutral-300"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-neutral-900 line-clamp-2">{post.text || "(no text)"}</div>
                  <div className="mt-1 text-xs text-neutral-400">
                    {post.username ? `@${post.username}` : post.author ? post.author : ""}{" "}
                    {post.createdAt ? `· ${new Date(post.createdAt).toLocaleDateString()}` : ""}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
