import { NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/auth/require-admin";
import { createApiKey, listApiKeys, deleteApiKey } from "@/lib/api-keys/store";
import type { ApiKeyScope } from "@/lib/api-keys/store";

export async function GET() {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keys = listApiKeys();
  return NextResponse.json({ keys: keys.map((k) => ({ ...k, keyHash: undefined, secret: undefined })) });
}

export async function POST(request: Request) {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, scopes } = body as { name?: string; scopes?: ApiKeyScope[] };

  if (!name || !scopes || scopes.length === 0) {
    return NextResponse.json({ error: "Name and scopes are required." }, { status: 400 });
  }

  const result = createApiKey({ name, scopes });
  return NextResponse.json({ key: result }, { status: 201 });
}

export async function DELETE(request: Request) {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id } = body as { id?: string };

  if (!id) {
    return NextResponse.json({ error: "ID is required." }, { status: 400 });
  }

  deleteApiKey(id);
  return NextResponse.json({ ok: true });
}
