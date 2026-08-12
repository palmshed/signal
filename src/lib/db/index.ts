import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { migrate } from "./migrate";
import { bootstrap } from "./seed";

const rawPath = process.env.DATABASE_URL || "./data/signal.db";
const DATABASE_PATH = resolve(
  rawPath.startsWith("file:") ? rawPath.slice("file:".length) : rawPath,
);

const globalForDb = globalThis as unknown as { __signalDb?: ReturnType<typeof createDb> };

function createDb() {
  mkdirSync(dirname(DATABASE_PATH), { recursive: true });
  const sqlite = new Database(DATABASE_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  migrate(sqlite);
  const client = drizzle(sqlite, { schema });
  bootstrap(client);
  return client;
}

export const db = globalForDb.__signalDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.__signalDb = db;

export { schema };
