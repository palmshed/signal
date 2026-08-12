"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { Link } from "@/lib/db/schema";

export function LinksManager({ links }: { links: Link[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  async function addLink(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!label.trim() || !url.trim()) {
      setError("Label and URL are required.");
      return;
    }
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, url }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error || "Failed to add link.");
    } else {
      setLabel("");
      setUrl("");
      router.refresh();
    }
  }

  async function move(id: string, direction: "up" | "down") {
    await fetch("/api/links", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, direction }),
    });
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/links/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={addLink} className="space-y-2">
        <label htmlFor="link-label" className="block text-sm font-medium text-neutral-700">
          Add a link
        </label>
        <div className="flex gap-2">
          <input
            id="link-label"
            type="text"
            required
            placeholder="GitHub"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-40 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
          <input
            type="url"
            required
            placeholder="https://github.com/you"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Add
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      <div className="space-y-2">
        {links.length === 0 && <p className="text-sm text-neutral-400">No links yet.</p>}
        {links.map((link, i) => (
          <div
            key={link.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-neutral-900">{link.label}</p>
              <p className="truncate text-xs text-neutral-400">{link.url}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => move(link.id, "up")}
                disabled={i === 0}
                className="text-sm text-neutral-400 hover:text-neutral-900 disabled:opacity-30"
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(link.id, "down")}
                disabled={i === links.length - 1}
                className="text-sm text-neutral-400 hover:text-neutral-900 disabled:opacity-30"
                aria-label="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => remove(link.id)}
                className="text-sm text-neutral-400 hover:text-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
