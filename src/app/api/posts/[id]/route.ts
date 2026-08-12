import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getAdminEmail } from "@/lib/auth/require-admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: RouteContext) {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  db.delete(schema.posts).where(eq(schema.posts.id, id)).run();
  db.delete(schema.events).where(eq(schema.events.postId, id)).run();
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { pinned?: boolean; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { id } = await params;
  const post = db.select().from(schema.posts).where(eq(schema.posts.id, id)).get();
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  const updates: Partial<typeof post> = { updatedAt: new Date().toISOString() };
  if (typeof body.pinned === "boolean") updates.pinned = body.pinned ? 1 : 0;
  if (body.status === "published" || body.status === "draft") updates.status = body.status;

  db.update(schema.posts).set(updates).where(eq(schema.posts.id, id)).run();
  return NextResponse.json({ ok: true });
}
