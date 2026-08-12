"use client";

import { useEffect, useState } from "react";

interface ApiKey {
  id: string;
  name: string;
  scopes: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export function ApiKeysManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["analytics:read"]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function load() {
    const res = await fetch("/api/keys");
    if (res.ok) {
      const data = (await res.json()) as { keys: ApiKey[] };
      setKeys(data.keys);
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function createKey() {
    setMessage(null);
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, scopes }),
    });
    if (!res.ok) {
      setMessage({ type: "error", text: "Failed to create API key." });
      return;
    }
    const data = (await res.json()) as { key: { key: string } };
    setMessage({ type: "ok", text: `API key created: ${data.key.key}` });
    setName("");
    load();
  }

  async function removeKey(id: string) {
    setMessage(null);
    const res = await fetch("/api/keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      setMessage({ type: "error", text: "Failed to delete API key." });
      return;
    }
    setMessage({ type: "ok", text: "API key deleted." });
    load();
  }

  function toggleScope(scope: string) {
    setScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-neutral-900">API Keys</h2>
      <p className="text-xs text-neutral-400">Create read-only API keys for external integrations.</p>

      {message && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            message.type === "ok" ? "border-neutral-200 bg-neutral-50 text-neutral-700" : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white p-4 space-y-3">
        <input
          type="text"
          placeholder="Key name (e.g. 'mobile app')"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          {["analytics:read", "posts:read", "links:read", "profile:read"].map((scope) => (
            <button
              key={scope}
              type="button"
              onClick={() => toggleScope(scope)}
              className={`rounded-lg border px-3 py-1.5 text-xs ${
                scopes.includes(scope) ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-neutral-700"
              }`}
            >
              {scope}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={createKey}
          disabled={!name || scopes.length === 0}
          className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          Create API key
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3">
              <div>
                <div className="text-sm font-medium text-neutral-900">{k.name}</div>
                <div className="text-xs text-neutral-400">{k.scopes}</div>
              </div>
              <button
                type="button"
                onClick={() => removeKey(k.id)}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:border-red-300 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          ))}
          {keys.length === 0 && <p className="text-sm text-neutral-400">No API keys yet.</p>}
        </div>
      )}
    </div>
  );
}
