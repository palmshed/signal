import type { EnrichedPost } from "./types";

const UA =
  "Mozilla/5.0 (compatible; signal-bot/0.1; +https://example.com/bot)";

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function clean(value: string | undefined | null): string {
  if (!value) return "";
  return decodeHtml(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function findMeta(html: string, name: string): string {
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+>`, "i"),
    new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*/?>`, "i"),
  ];
  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m) {
      const content = m[0].match(/content=["']([^"']*)["']/i);
      if (content) return clean(content[1]);
    }
  }
  return "";
}

export interface PageMeta {
  title: string;
  description: string;
  image: string;
}

export function parseMetaTags(html: string): PageMeta {
  return {
    title:
      clean(findMeta(html, "og:title")) ||
      clean(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]),
    description:
      clean(findMeta(html, "og:description")) ||
      clean(findMeta(html, "description")),
    image: clean(findMeta(html, "og:image")),
  };
}

export async function fetchHtml(url: string, maxBytes = 300_000): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok) return "";
    const buffer = await res.arrayBuffer();
    const slice = buffer.slice(0, maxBytes);
    return new TextDecoder("utf-8", { fatal: false }).decode(slice);
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

export async function enrichFromMeta(url: URL): Promise<EnrichedPost | null> {
  const html = await fetchHtml(url.toString());
  const meta = parseMetaTags(html);
  if (!meta.title && !meta.description) return null;
  return {
    platform: "custom",
    title: meta.title,
    description: meta.description,
    author: "",
    imageUrl: meta.image,
    embedHtml: "",
  };
}
