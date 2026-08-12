import { eq, max } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getAdminEmail } from "@/lib/auth/require-admin";
import { newId, nowIso, isValidUrl } from "@/lib/util";

export async function POST(request: Request) {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { label?: string; url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const label = (body.label || "").trim();
  const url = (body.url || "").trim();
  if (!label || !isValidUrl(url)) {
    return NextResponse.json({ error: "Label and a valid URL are required." }, { status: 400 });
  }

  const maxRow = db.select({ m: max(schema.links.position) }).from(schema.links).get();
  const position = (maxRow?.m ?? 0) + 1;
  const id = newId("link");
  db.insert(schema.links)
    .values({ id, label, url, position, createdAt: nowIso() })
    .run();

  return NextResponse.json({ link: db.select().from(schema.links).where(eq(schema.links.id, id)).get() });
}

export async function PUT(request: Request) {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { id?: string; direction?: "up" | "down" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { id, direction } = body;
  if (!id || !direction) {
    return NextResponse.json({ error: "Missing id or direction." }, { status: 400 });
  }

  const link = db.select().from(schema.links).where(eq(schema.links.id, id)).get();
  if (!link) return NextResponse.json({ error: "Link not found." }, { status: 404 });

  const sibling = db
    .select()
    .from(schema.links)
    .where(direction === "up" ? eq(schema.links.position, link.position - 1) : eq(schema.links.position, link.position + 1))
    .get();

  if (!sibling) return NextResponse.json({ error: "Nothing to swap with." }, { status: 400 });

  db.transaction((tx) => {
    tx.update(schema.links).set({ position: sibling.position }).where(eq(schema.links.id, link.id)).run();
    tx.update(schema.links).set({ position: link.position }).where(eq(schema.links.id, sibling.id)).run();
  });

  return NextResponse.json({ ok: true });
}
