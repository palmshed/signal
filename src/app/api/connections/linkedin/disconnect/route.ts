import { NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/auth/require-admin";
import { disconnectConnection } from "@/lib/connections/store";

export async function DELETE() {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  disconnectConnection("linkedin");
  return NextResponse.json({ ok: true });
}
