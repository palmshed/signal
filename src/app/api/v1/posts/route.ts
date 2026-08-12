import { NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-keys/auth";
import { db, schema } from "@/lib/db";

export async function GET(_request: Request) {
  const auth = requireApiKey(_request, "posts:read");
  if (auth instanceof NextResponse) return auth;

  const posts = db.select().from(schema.posts).orderBy(schema.posts.createdAt).all();
  return NextResponse.json({ posts });
}
