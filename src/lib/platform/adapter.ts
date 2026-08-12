import type { EnrichedPost, PlatformAdapter, PlatformId } from "./types";
import { xAdapter } from "./x/adapter";
import { linkedinAdapter } from "./linkedin/adapter";
import { threadsAdapter } from "./threads/adapter";
import { enrichFromMeta } from "./common";

export type { EnrichedPost, PlatformAdapter, PlatformId } from "./types";
export { PLATFORM_META } from "./meta";

export const adapters: PlatformAdapter[] = [xAdapter, linkedinAdapter, threadsAdapter];

export function platformById(id: PlatformId): PlatformAdapter | undefined {
  return adapters.find((a) => a.id === id);
}

export function detectPlatform(rawUrl: string): {
  url: URL;
  adapter: PlatformAdapter;
} | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  for (const adapter of adapters) {
    if (adapter.detect(url)) return { url, adapter };
  }
  return null;
}

export async function enrichUrl(rawUrl: string): Promise<EnrichedPost | null> {
  const detected = detectPlatform(rawUrl);
  if (!detected) {
    const meta = await enrichFromMeta(new URL(rawUrl));
    return meta ? { ...meta, platform: "custom" } : null;
  }
  const { url, adapter } = detected;
  const enriched = await adapter.enrich(url);
  if (enriched) return enriched;
  const meta = await enrichFromMeta(url);
  return meta ? { ...meta, platform: adapter.id } : null;
}
