import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getAdminEmail } from "@/lib/auth/require-admin";
import { newId, nowIso, isValidUrl } from "@/lib/util";

interface LinkedInPostToImport {
  platformPostId: string;
  url: string;
  text: string;
  author: string;
  username: string;
  createdAt: string;
  imageUrl: string;
}

export async function POST(request: Request) {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { posts: LinkedInPostToImport[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const posts = (body.posts ?? []).filter((p) => p.platformPostId && isValidUrl(p.url));
  if (posts.length === 0) {
    return NextResponse.json({ error: "No valid posts to import." }, { status: 400 });
  }

  const now = nowIso();
  const imported: string[] = [];
  const skipped: string[] = [];

  for (const post of posts) {
    const existing = db
      .select()
      .from(schema.posts)
      .where(and(eq(schema.posts.platform, "linkedin"), eq(schema.posts.platformPostId, post.platformPostId)))
      .get();

    if (existing) {
      skipped.push(post.platformPostId);
      continue;
    }

    const id = newId("post");
    db.insert(schema.posts)
      .values({
        id,
        url: post.url,
        platform: "linkedin",
        platformPostId: post.platformPostId,
        title: post.text.slice(0, 200),
        description: post.text,
        author: post.author || post.username,
        imageUrl: post.imageUrl || "",
        embedHtml: "",
        status: "published",
        publishedAt: post.createdAt || now,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    imported.push(id);
  }

  return NextResponse.json({ imported, skipped, total: posts.length });
}
