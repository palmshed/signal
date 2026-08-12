import type { EnrichedPost, PlatformAdapter } from "../types";
import { xClient } from "./client";

export function isX(url: URL): boolean {
  return url.hostname === "x.com" || url.hostname === "twitter.com";
}

export function extractTweetId(url: URL): string | null {
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.findIndex((p) => p === "status");
  return idx !== -1 && parts[idx + 1] ? parts[idx + 1] : null;
}

async function enrich(url: URL): Promise<EnrichedPost | null> {
  const tweetId = extractTweetId(url);
  const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url.toString())}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(oembedUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = (await res.json()) as {
        html?: string;
        author_name?: string;
      };
      if (data.html) {
        return {
          platform: "x",
          platformPostId: tweetId ?? undefined,
          title: "",
          description: "",
          author: data.author_name || "",
          imageUrl: "",
          embedHtml: data.html,
        };
      }
    }
  } catch {
    // fall through to meta fetch
  }

  const { fetchHtml, parseMetaTags } = await import("../common");
  const html = await fetchHtml(url.toString());
  const meta = parseMetaTags(html);
  return {
    platform: "x",
    platformPostId: tweetId ?? undefined,
    title: "",
    description: meta.description || "",
    author: "",
    imageUrl: meta.image || "",
    embedHtml: "",
  };
}

export const xAdapter: PlatformAdapter = {
  id: "x",
  label: "X",
  icon: "x",
  detect: isX,
  enrich,
  client: xClient,
};
