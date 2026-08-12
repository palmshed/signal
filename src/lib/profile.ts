import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Profile, SocialLink } from "@/lib/social";
import { parseTheme, type ThemeConfig } from "@/lib/theme";

export type { Profile, SocialLink } from "@/lib/social";
export { SOCIAL_LABELS, SOCIAL_PLATFORMS } from "@/lib/social";

export function parseSocials(raw: string | null | undefined): SocialLink[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s: unknown): s is SocialLink =>
        !!s &&
        typeof (s as SocialLink).platform === "string" &&
        typeof (s as SocialLink).url === "string" &&
        (s as SocialLink).platform.trim() !== "" &&
        (s as SocialLink).url.trim() !== "",
    );
  } catch {
    return [];
  }
}

export function getProfile(): Profile {
  const row = db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.id, 1))
    .get();
  return {
    name: row?.name ?? "",
    tagline: row?.tagline ?? "",
    bio: row?.bio ?? "",
    avatarUrl: row?.avatarUrl ?? "",
    website: row?.website ?? "",
    title: row?.title ?? "",
    description: row?.description ?? "",
    socials: parseSocials(row?.socials),
  };
}

export function getTheme(): ThemeConfig {
  const row = db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.id, 1))
    .get();
  return parseTheme(row?.theme);
}

export function pageTitle(profile: Profile): string {
  return profile.title || profile.name || "Signal";
}
