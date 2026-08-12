import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getAdminEmail } from "@/lib/auth/require-admin";
import { enrichUrl, detectPlatform } from "@/lib/platform/adapter";
import { newId, nowIso, isValidUrl } from "@/lib/util";

export async function POST(request: Request) {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { url?: string; title?: string; description?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const url = (body.url || "").trim();
  if (!url || !isValidUrl(url)) {
    return NextResponse.json({ error: "A valid URL is required." }, { status: 400 });
  }

  const detected = detectPlatform(url);
  if (!detected) {
    return NextResponse.json({ error: "Unsupported or invalid post URL." }, { status: 400 });
  }

  const enriched = await enrichUrl(url);
  const platform = detected.adapter.id;
  const status = body.status === "draft" ? "draft" : "published";
  const now = nowIso();

  const id = newId("post");
  db.insert(schema.posts)
    .values({
      id,
      url,
      platform,
      title: body.title?.trim() || enriched?.title || "",
      description: body.description?.trim() || enriched?.description || "",
      author: enriched?.author || "",
      imageUrl: enriched?.imageUrl || "",
      embedHtml: enriched?.embedHtml || "",
      status,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const post = db.select().from(schema.posts).where(eq(schema.posts.id, id)).get();
  return NextResponse.json({ post });
}
