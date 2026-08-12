"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { Post } from "@/lib/db/schema";
import { PLATFORM_META } from "@/lib/platform/meta";

export function PostsManager({ posts }: { posts: Post[] }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function addPost(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as { error?: string; post?: Post };
      if (!res.ok) {
        setError(data.error || "Failed to add post.");
      } else {
        setUrl("");
        router.refresh();
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function removePost(id: string) {
    await fetch(`/api/posts/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function togglePin(post: Post) {
    await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: post.pinned === 0 }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={addPost} className="space-y-2">
        <label htmlFor="post-url" className="block text-sm font-medium text-neutral-700">
          Add a post by URL
        </label>
        <div className="flex gap-2">
          <input
            id="post-url"
            type="url"
            required
            placeholder="https://www.linkedin.com/posts/… or https://x.com/…/status/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {loading ? "Importing…" : "Import"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-xs text-neutral-400">
          LinkedIn, X and Threads links are detected and enriched automatically.
        </p>
      </form>

      <div className="space-y-2">
        {posts.length === 0 && <p className="text-sm text-neutral-400">No posts yet.</p>}
        {posts.map((post) => {
          const adapter =
            PLATFORM_META[post.platform as keyof typeof PLATFORM_META] ?? {
              label: post.platform,
              icon: "•",
            };
          return (
            <div
              key={post.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide text-neutral-500">
                    {adapter.label || post.platform}
                  </span>
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-sm text-neutral-500 hover:text-neutral-900"
                  >
                    {post.title || post.description || post.url}
                  </a>
                </div>
                {post.status === "draft" && (
                  <span className="text-xs text-amber-600">Draft</span>
                )}
                {post.pinned === 1 && (
                  <span className="text-xs text-neutral-400">· Pinned</span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => togglePin(post)}
                  className="text-sm text-neutral-400 hover:text-neutral-900"
                >
                  {post.pinned === 1 ? "Unpin" : "Pin"}
                </button>
                <button
                  type="button"
                  onClick={() => removePost(post.id)}
                  className="text-sm text-neutral-400 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
