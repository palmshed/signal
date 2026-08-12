import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getAdminEmail } from "@/lib/auth/require-admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: RouteContext) {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  db.delete(schema.links).where(eq(schema.links.id, id)).run();
  db.delete(schema.events).where(eq(schema.events.linkId, id)).run();
  return NextResponse.json({ ok: true });
}
