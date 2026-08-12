"use client";

import { useEffect, useState } from "react";

interface Webhook {
  id: string;
  url: string;
  events: string;
  enabled: boolean;
  lastTriggeredAt: string | null;
}

export function WebhooksManager() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["post.imported"]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function load() {
    const res = await fetch("/api/webhooks");
    if (res.ok) {
      const data = (await res.json()) as { webhooks: Webhook[] };
      setWebhooks(data.webhooks);
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function createWebhook() {
    setMessage(null);
    const res = await fetch("/api/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, events }),
    });
    if (!res.ok) {
      setMessage({ type: "error", text: "Failed to create webhook." });
      return;
    }
    setMessage({ type: "ok", text: "Webhook created." });
    setUrl("");
    load();
  }

  async function removeWebhook(id: string) {
    setMessage(null);
    const res = await fetch("/api/webhooks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      setMessage({ type: "error", text: "Failed to delete webhook." });
      return;
    }
    setMessage({ type: "ok", text: "Webhook deleted." });
    load();
  }

  function toggleEvent(event: string) {
    setEvents((prev) => (prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]));
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-neutral-900">Webhooks</h2>
      <p className="text-xs text-neutral-400">Send events to external services.</p>

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
          type="url"
          placeholder="https://example.com/webhook"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          {["post.imported", "post.unavailable", "connection.synced", "connection.error"].map((event) => (
            <button
              key={event}
              type="button"
              onClick={() => toggleEvent(event)}
              className={`rounded-lg border px-3 py-1.5 text-xs ${
                events.includes(event) ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-neutral-700"
              }`}
            >
              {event}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={createWebhook}
          disabled={!url || events.length === 0}
          className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          Create webhook
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : (
        <div className="space-y-2">
          {webhooks.map((w) => (
            <div key={w.id} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3">
              <div>
                <div className="text-sm font-medium text-neutral-900">{w.url}</div>
                <div className="text-xs text-neutral-400">{w.events}</div>
              </div>
              <button
                type="button"
                onClick={() => removeWebhook(w.id)}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:border-red-300 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          ))}
          {webhooks.length === 0 && <p className="text-sm text-neutral-400">No webhooks yet.</p>}
        </div>
      )}
    </div>
  );
}
