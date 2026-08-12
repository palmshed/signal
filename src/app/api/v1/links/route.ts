import { NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-keys/auth";
import { db, schema } from "@/lib/db";

export async function GET(_request: Request) {
  const auth = requireApiKey(_request, "links:read");
  if (auth instanceof NextResponse) return auth;

  const links = db.select().from(schema.links).orderBy(schema.links.position).all();
  return NextResponse.json({ links });
}
