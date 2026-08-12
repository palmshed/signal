import { NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/auth/require-admin";
import { getSafeConnections } from "@/lib/connections/store";

export async function GET() {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connections = getSafeConnections();
  return NextResponse.json({ connections });
}
