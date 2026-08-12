import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { isBot, parseBrowser, parseDevice, referrerHost } from "@/lib/analytics/parse";
import { nowIso } from "@/lib/util";

const SESSION_COOKIE = "signal_sid";
const SESSION_TTL = 60 * 60 * 24 * 180;

const VALID_TYPES = new Set(["pageview", "postview", "click"]);

function requestCountry(request: Request): string {
  return request.headers.get("cf-ipcountry") || "";
}

function parseUtmParams(search: string) {
  const params = new URLSearchParams(search);
  return {
    utmSource: params.get("utm_source") || "",
    utmMedium: params.get("utm_medium") || "",
    utmCampaign: params.get("utm_campaign") || "",
    utmTerm: params.get("utm_term") || "",
    utmContent: params.get("utm_content") || "",
  };
}

export async function POST(request: Request) {
  let body: {
    type?: string;
    path?: string;
    postId?: string;
    linkId?: string;
    targetUrl?: string;
    referrer?: string;
    url?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const type = body.type || "";
  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid event type." }, { status: 400 });
  }

  const ua = request.headers.get("user-agent") || "";
  if (isBot(ua)) return NextResponse.json({ ok: true, skipped: "bot" });

  let sessionId = "";
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  const createdSession = !match;
  sessionId = match?.[1] || randomBytes(16).toString("base64url");

  const referrer = referrerHost(body.referrer || "");
  const utm = body.url ? parseUtmParams(new URL(body.url).search) : { utmSource: "", utmMedium: "", utmCampaign: "", utmTerm: "", utmContent: "" };
  const landingPage = (body.path || "").slice(0, 500);

  if (type === "postview" && body.postId) {
    const exists = db
      .select({ id: schema.posts.id })
      .from(schema.posts)
      .where(sql`${schema.posts.id} = ${body.postId}`)
      .get();
    if (!exists) return NextResponse.json({ ok: true, skipped: "unknown-post" });
  }
  if (type === "click" && !body.linkId && !body.targetUrl) {
    return NextResponse.json({ error: "Click needs a target." }, { status: 400 });
  }

  db.insert(schema.events)
    .values({
      sessionId,
      type,
      path: landingPage,
      postId: body.postId || null,
      linkId: body.linkId || null,
      targetUrl: (body.targetUrl || "").slice(0, 1000),
      referrer: referrer === "direct" ? "" : referrer,
      country: requestCountry(request),
      device: parseDevice(ua),
      browser: parseBrowser(ua),
      utmSource: utm.utmSource,
      utmMedium: utm.utmMedium,
      utmCampaign: utm.utmCampaign,
      utmTerm: utm.utmTerm,
      utmContent: utm.utmContent,
      landingPage,
      ts: nowIso(),
    })
    .run();

  const res = NextResponse.json({ ok: true });
  if (createdSession) {
    res.headers.set(
      "Set-Cookie",
      `${SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL}`,
    );
  }
  return res;
}
