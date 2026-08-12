import { NextResponse } from "next/server";
import { verifyApiKey, hasScope } from "@/lib/api-keys/store";
import type { ApiKeyScope } from "@/lib/api-keys/store";

export type ApiKeyAuth = {
  keyId: string;
  scopes: ApiKeyScope[];
};

export function requireApiKey(request: Request, requiredScope?: ApiKeyScope): ApiKeyAuth | NextResponse {
  const auth = request.headers.get("authorization") || "";
  const parts = auth.split(" ");
  const token = parts.length === 2 && parts[0] === "Bearer" ? parts[1] : "";

  if (!token) {
    return NextResponse.json({ error: "Missing API key." }, { status: 401 });
  }

  const result = verifyApiKey(token);
  if (!result) {
    return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
  }

  if (requiredScope && !hasScope(result.scopes, requiredScope)) {
    return NextResponse.json({ error: "Insufficient scope." }, { status: 403 });
  }

  return { keyId: result.id, scopes: result.scopes };
}
