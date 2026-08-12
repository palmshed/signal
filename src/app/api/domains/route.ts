import { NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/auth/require-admin";
import { listDomains, createDomain, isDomainAvailable } from "@/lib/domains/store";

export async function GET() {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const domains = listDomains();
  return NextResponse.json({ domains: domains.map((d) => ({ ...d, verificationToken: undefined })) });
}

export async function POST(request: Request) {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { hostname } = body as { hostname?: string };

  if (!hostname || typeof hostname !== "string") {
    return NextResponse.json({ error: "Hostname is required." }, { status: 400 });
  }

  if (!isDomainAvailable(hostname)) {
    return NextResponse.json({ error: "This domain is already in use." }, { status: 409 });
  }

  const domain = createDomain({ hostname });
  return NextResponse.json({ domain: { ...domain, verificationToken: undefined } }, { status: 201 });
}
