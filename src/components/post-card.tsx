"use client";

import Script from "next/script";
import type { Post } from "@/lib/db/schema";
import { PLATFORM_META } from "@/lib/platform/meta";

function xEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "status");
    if (idx !== -1 && parts[idx + 1]) {
      return `https://platform.twitter.com/embed/Tweet.html?id=${parts[idx + 1]}`;
    }
    return null;
  } catch {
    return null;
  }
}

export function PostCard({ post }: { post: Post }) {
  const adapter = PLATFORM_META[post.platform as keyof typeof PLATFORM_META] ?? {
    label: post.platform,
    icon: "•",
  };

  if (post.embedHtml) {
    return (
      <article className="rounded-xl border border-neutral-200 bg-white p-4">
      <PostHeader post={post} adapterLabel={adapter.label} />
        <div className="mt-3 [&_blockquote]:border-l-4 [&_blockquote]:border-neutral-200 [&_blockquote]:pl-3 [&_blockquote]:font-normal">
          <div dangerouslySetInnerHTML={{ __html: post.embedHtml }} />
        </div>
        <Script src="https://platform.twitter.com/widgets.js" strategy="afterInteractive" />
      </article>
    );
  }

  const xIframe = post.platform === "x" ? xEmbedUrl(post.url) : null;

  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-4">
      <PostHeader post={post} adapterLabel={adapter?.label} />
      {xIframe && (
        <div className="mt-3">
          <iframe
            src={xIframe}
            title={post.title || "Embedded post"}
            className="w-full rounded-md border border-neutral-100"
            style={{ height: "520px" }}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      {(post.title || post.description) && !xIframe && (
        <a
          href={post.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block rounded-md border border-neutral-200 p-3 hover:border-neutral-300"
        >
          {post.title && <h3 className="text-sm font-semibold text-neutral-900">{post.title}</h3>}
          {post.description && (
            <p className="mt-1 text-sm leading-relaxed text-neutral-600 line-clamp-4">{post.description}</p>
          )}
          <span className="mt-2 block text-xs text-neutral-400">{hostname(post.url)}</span>
        </a>
      )}
    </article>
  );
}

function PostHeader({ post, adapterLabel }: { post: Post; adapterLabel?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
        {adapterLabel || post.platform}
      </span>
      <a
        href={post.url}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-neutral-400 hover:text-neutral-600"
      >
        Open original →
      </a>
    </div>
  );
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
