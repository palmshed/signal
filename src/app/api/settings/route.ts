import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getAdminEmail } from "@/lib/auth/require-admin";
import { isValidUrl } from "@/lib/util";
import { parseTheme, stringifyTheme, DEFAULT_THEME, type ThemeConfig } from "@/lib/theme";

const MAX_SOCIALS = 12;

export async function GET() {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.id, 1))
    .get();

  if (!row) {
    return NextResponse.json({ profile: null, theme: DEFAULT_THEME });
  }

  return NextResponse.json({
    profile: {
      name: row.name,
      tagline: row.tagline,
      bio: row.bio,
      avatarUrl: row.avatarUrl,
      website: row.website,
      title: row.title,
      description: row.description,
      socials: JSON.parse(row.socials || "[]"),
    },
    theme: parseTheme(row.theme),
  });
}

export async function PUT(request: Request) {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    name?: string;
    tagline?: string;
    bio?: string;
    avatarUrl?: string;
    website?: string;
    title?: string;
    description?: string;
    socials?: { platform?: string; url?: string }[];
    theme?: ThemeConfig;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const socials: { platform: string; url: string }[] = [];
  for (const item of (body.socials ?? []).slice(0, MAX_SOCIALS)) {
    const platform = (item.platform ?? "").trim().slice(0, 40);
    const url = (item.url ?? "").trim().slice(0, 1000);
    if (platform && isValidUrl(url) && !socials.some((s) => s.platform === platform)) {
      socials.push({ platform, url });
    }
  }

  const updates: Record<string, unknown> = {
    name: (body.name ?? "").toString().slice(0, 200),
    tagline: (body.tagline ?? "").toString().slice(0, 300),
    bio: (body.bio ?? "").toString().slice(0, 2000),
    avatarUrl: (body.avatarUrl ?? "").toString().slice(0, 1000),
    website: (body.website ?? "").toString().slice(0, 1000),
    title: (body.title ?? "").toString().slice(0, 200),
    description: (body.description ?? "").toString().slice(0, 300),
    socials: JSON.stringify(socials),
  };

  if (body.theme) {
    updates.theme = stringifyTheme(body.theme);
  }

  db.update(schema.settings)
    .set(updates)
    .where(eq(schema.settings.id, 1))
    .run();

  return NextResponse.json({ ok: true });
}
