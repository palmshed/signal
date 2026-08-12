import { cookies } from "next/headers";
import { sessionCookieName, verifySession } from "./session";

export async function getAdminEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName())?.value;
  if (!token) return null;
  const payload = verifySession(token);
  return payload?.email ?? null;
}
