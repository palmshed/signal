import { NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/auth/require-admin";
import { getDomainByHostname, verifyDomain, activateDomain, removeDomain } from "@/lib/domains/store";

export async function GET(request: Request) {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const hostname = url.searchParams.get("hostname");
  if (!hostname) {
    return NextResponse.json({ error: "Hostname is required." }, { status: 400 });
  }

  const domain = getDomainByHostname(hostname);
  if (!domain) {
    return NextResponse.json({ error: "Domain not found." }, { status: 404 });
  }

  return NextResponse.json({ domain: { ...domain, verificationToken: undefined } });
}

export async function POST(request: Request) {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const action = url.searchParams.get("action");

  if (!id) {
    return NextResponse.json({ error: "Domain ID is required." }, { status: 400 });
  }

  if (action === "verify") {
    const domain = verifyDomain(id);
    if (!domain) {
      return NextResponse.json({ error: "Domain not found." }, { status: 404 });
    }
    return NextResponse.json({ domain: { ...domain, verificationToken: undefined } });
  }

  if (action === "primary") {
    const domain = activateDomain(id);
    if (!domain) {
      return NextResponse.json({ error: "Domain not found." }, { status: 404 });
    }
    return NextResponse.json({ domain: { ...domain, verificationToken: undefined } });
  }

  return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}

export async function DELETE(request: Request) {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Domain ID is required." }, { status: 400 });
  }

  removeDomain(id);
  return NextResponse.json({ ok: true });
}
