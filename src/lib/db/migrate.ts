import type Database from "better-sqlite3";

const STATEMENTS = `
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL DEFAULT '',
  tagline TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  socials TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'custom',
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  embed_html TEXT NOT NULL DEFAULT '',
  platform_post_id TEXT NOT NULL DEFAULT '',
  engagement_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'published',
  pinned INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS connections (
  platform TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  access_token_enc TEXT NOT NULL DEFAULT '',
  refresh_token_enc TEXT NOT NULL DEFAULT '',
  token_expires_at INTEGER NOT NULL DEFAULT 0,
  scope TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'disconnected',
  last_synced_at TEXT,
  sync_error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL,
  path TEXT NOT NULL DEFAULT '',
  post_id TEXT,
  link_id TEXT,
  target_url TEXT NOT NULL DEFAULT '',
  referrer TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  device TEXT NOT NULL DEFAULT 'desktop',
  browser TEXT NOT NULL DEFAULT 'unknown',
  ts TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_post ON events(post_id);
CREATE INDEX IF NOT EXISTS idx_events_link ON events(link_id);
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL DEFAULT '',
  scopes TEXT NOT NULL DEFAULT 'analytics:read',
  last_used_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  secret TEXT NOT NULL DEFAULT '',
  events TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  last_triggered_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL DEFAULT 'all',
  visitors INTEGER NOT NULL DEFAULT 0,
  page_views INTEGER NOT NULL DEFAULT 0,
  post_views INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  new_visitors INTEGER NOT NULL DEFAULT 0,
  returning_visitors INTEGER NOT NULL DEFAULT 0,
  engagement_rate INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY,
  hostname TEXT NOT NULL UNIQUE,
  verification_token TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  verified_at TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_day ON analytics_snapshots(day);
`;

const COLUMN_ADDITIONS: Array<{ table: string; column: string; ddl: string }> = [
  {
    table: "settings",
    column: "title",
    ddl: "ALTER TABLE settings ADD COLUMN title TEXT NOT NULL DEFAULT ''",
  },
  {
    table: "settings",
    column: "description",
    ddl: "ALTER TABLE settings ADD COLUMN description TEXT NOT NULL DEFAULT ''",
  },
  {
    table: "settings",
    column: "socials",
    ddl: "ALTER TABLE settings ADD COLUMN socials TEXT NOT NULL DEFAULT '[]'",
  },
  {
    table: "settings",
    column: "theme",
    ddl: "ALTER TABLE settings ADD COLUMN theme TEXT NOT NULL DEFAULT '{}'",
  },
  {
    table: "posts",
    column: "pinned",
    ddl: "ALTER TABLE posts ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0",
  },
  {
    table: "posts",
    column: "platform_post_id",
    ddl: "ALTER TABLE posts ADD COLUMN platform_post_id TEXT NOT NULL DEFAULT ''",
  },
  {
    table: "posts",
    column: "engagement_json",
    ddl: "ALTER TABLE posts ADD COLUMN engagement_json TEXT NOT NULL DEFAULT '{}'",
  },
  {
    table: "connections",
    column: "sync_interval",
    ddl: "ALTER TABLE connections ADD COLUMN sync_interval INTEGER NOT NULL DEFAULT 30",
  },
  {
    table: "connections",
    column: "next_sync_at",
    ddl: "ALTER TABLE connections ADD COLUMN next_sync_at TEXT",
  },
  {
    table: "connections",
    column: "sync_lock_token",
    ddl: "ALTER TABLE connections ADD COLUMN sync_lock_token TEXT",
  },
  {
    table: "events",
    column: "utm_source",
    ddl: "ALTER TABLE events ADD COLUMN utm_source TEXT NOT NULL DEFAULT ''",
  },
  {
    table: "events",
    column: "utm_medium",
    ddl: "ALTER TABLE events ADD COLUMN utm_medium TEXT NOT NULL DEFAULT ''",
  },
  {
    table: "events",
    column: "utm_campaign",
    ddl: "ALTER TABLE events ADD COLUMN utm_campaign TEXT NOT NULL DEFAULT ''",
  },
  {
    table: "events",
    column: "utm_term",
    ddl: "ALTER TABLE events ADD COLUMN utm_term TEXT NOT NULL DEFAULT ''",
  },
  {
    table: "events",
    column: "utm_content",
    ddl: "ALTER TABLE events ADD COLUMN utm_content TEXT NOT NULL DEFAULT ''",
  },
  {
    table: "events",
    column: "landing_page",
    ddl: "ALTER TABLE events ADD COLUMN landing_page TEXT NOT NULL DEFAULT ''",
  },
];

let migrated = false;

export function migrate(sqlite: Database.Database) {
  if (migrated) return;
  sqlite.exec(STATEMENTS);
  for (const { table, column, ddl } of COLUMN_ADDITIONS) {
    const columns = sqlite.pragma(`table_info(${table})`) as Array<{ name: string }>;
    if (!columns.some((c) => c.name === column)) {
      sqlite.exec(ddl);
    }
  }
  sqlite.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_platform_id ON posts(platform, platform_post_id) WHERE platform_post_id != ''",
  );
  sqlite.exec("UPDATE connections SET status = 'connected_with_error' WHERE status = 'error'");
  migrated = true;
}
