import { NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/auth/require-admin";
import { createWebhook, listWebhooks, deleteWebhook } from "@/lib/webhooks/store";

export async function GET() {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const webhooks = listWebhooks();
  return NextResponse.json({ webhooks: webhooks.map((w) => ({ ...w, secret: undefined })) });
}

export async function POST(request: Request) {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { url, events } = body as { url?: string; events?: string[] };

  if (!url || !events || events.length === 0) {
    return NextResponse.json({ error: "URL and events are required." }, { status: 400 });
  }

  const result = createWebhook({ url, events });
  return NextResponse.json({ webhook: result }, { status: 201 });
}

export async function DELETE(request: Request) {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id } = body as { id?: string };

  if (!id) {
    return NextResponse.json({ error: "ID is required." }, { status: 400 });
  }

  deleteWebhook(id);
  return NextResponse.json({ ok: true });
}
