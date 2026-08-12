import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { hashPassword } from "@/lib/auth/password";
import { nowIso } from "@/lib/util";

export function bootstrap(db: BetterSQLite3Database<typeof schema>) {
  db.insert(schema.settings)
    .values({
      id: 1,
      name: process.env.SITE_NAME || "",
      tagline: "",
      bio: "",
      avatarUrl: "",
      website: "",
    })
    .onConflictDoNothing()
    .run();

  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    const adminCount = db.select().from(schema.admins).all().length;
    if (adminCount === 0) {
      const { hash, salt } = hashPassword(password);
      db.insert(schema.admins)
        .values({ email, passwordHash: hash, salt, createdAt: nowIso() })
        .onConflictDoNothing()
        .run();
    }
  }
}
