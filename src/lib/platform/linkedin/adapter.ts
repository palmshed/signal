import type { EnrichedPost, PlatformAdapter } from "../types";
import { linkedinClient } from "./client";

export function isLinkedIn(url: URL): boolean {
  return url.hostname === "linkedin.com" || url.hostname.endsWith(".linkedin.com");
}

async function enrich(url: URL): Promise<EnrichedPost | null> {
  const { fetchHtml, parseMetaTags } = await import("../common");
  const html = await fetchHtml(url.toString());
  const meta = parseMetaTags(html);

  const authorMatch = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*?) · Linked[Ii]n["']/i,
  );
  const author = authorMatch ? authorMatch[1].trim() : "";
  const description = meta.description || meta.title;

  return {
    platform: "linkedin",
    title: "",
    description,
    author,
    imageUrl: meta.image,
    embedHtml: "",
  };
}

export const linkedinAdapter: PlatformAdapter = {
  id: "linkedin",
  label: "LinkedIn",
  icon: "in",
  detect: isLinkedIn,
  enrich,
  client: linkedinClient,
};
