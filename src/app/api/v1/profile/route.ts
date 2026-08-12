import { NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-keys/auth";
import { db, schema } from "@/lib/db";

export async function GET(_request: Request) {
  const auth = requireApiKey(_request, "profile:read");
  if (auth instanceof NextResponse) return auth;

  const settings = db.select().from(schema.settings).get();
  if (!settings) {
    return NextResponse.json({ profile: null });
  }

  const socials = JSON.parse(settings.socials || "[]");
  return NextResponse.json({
    profile: {
      name: settings.name,
      tagline: settings.tagline,
      bio: settings.bio,
      avatarUrl: settings.avatarUrl,
      website: settings.website,
      title: settings.title,
      description: settings.description,
      socials,
    },
  });
}
