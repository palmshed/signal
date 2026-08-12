import type { EnrichedPost, PlatformAdapter } from "../types";
import { threadsClient } from "./client";

export function isThreads(url: URL): boolean {
  return url.hostname === "threads.net" || url.hostname.endsWith(".threads.net");
}

async function enrich(url: URL): Promise<EnrichedPost | null> {
  const { fetchHtml, parseMetaTags } = await import("../common");
  const html = await fetchHtml(url.toString());
  const meta = parseMetaTags(html);

  return {
    platform: "threads",
    title: "",
    description: meta.description || "",
    author: meta.title || "",
    imageUrl: meta.image || "",
    embedHtml: "",
  };
}

export const threadsAdapter: PlatformAdapter = {
  id: "threads",
  label: "Threads",
  icon: "◎",
  detect: isThreads,
  enrich,
  client: threadsClient,
};
