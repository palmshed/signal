import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey().$defaultFn(() => 1),
  name: text("name").notNull().default(""),
  tagline: text("tagline").notNull().default(""),
  bio: text("bio").notNull().default(""),
  avatarUrl: text("avatar_url").notNull().default(""),
  website: text("website").notNull().default(""),
  title: text("title").notNull().default(""),
  description: text("description").notNull().default(""),
  socials: text("socials").notNull().default("[]"),
  theme: text("theme").notNull().default("{}"),
});

export type Settings = typeof settings.$inferSelect;

export const posts = sqliteTable("posts", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  platform: text("platform").notNull().default("custom"),
  platformPostId: text("platform_post_id").notNull().default(""),
  title: text("title").notNull().default(""),
  description: text("description").notNull().default(""),
  author: text("author").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  embedHtml: text("embed_html").notNull().default(""),
  engagementJson: text("engagement_json").notNull().default("{}"),
  status: text("status").notNull().default("published"),
  pinned: integer("pinned").notNull().default(0),
  publishedAt: text("published_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;

export const links = sqliteTable("links", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  url: text("url").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export type Link = typeof links.$inferSelect;

export const admins = sqliteTable("admins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  salt: text("salt").notNull(),
  createdAt: text("created_at").notNull(),
});

export type Admin = typeof admins.$inferSelect;

export const connections = sqliteTable("connections", {
  platform: text("platform").primaryKey(),
  userId: text("user_id").notNull().default(""),
  username: text("username").notNull().default(""),
  displayName: text("display_name").notNull().default(""),
  accessTokenEnc: text("access_token_enc").notNull().default(""),
  refreshTokenEnc: text("refresh_token_enc").notNull().default(""),
  tokenExpiresAt: integer("token_expires_at").notNull().default(0),
  scope: text("scope").notNull().default(""),
  status: text("status").notNull().default("disconnected"),
  lastSyncedAt: text("last_synced_at"),
  syncError: text("sync_error").notNull().default(""),
  syncInterval: integer("sync_interval").notNull().default(30),
  nextSyncAt: text("next_sync_at"),
  syncLockToken: text("sync_lock_token"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export type Connection = typeof connections.$inferSelect;

export type SafeConnection = Omit<
  Connection,
  "accessTokenEnc" | "refreshTokenEnc"
>;

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull(),
  type: text("type").notNull(),
  path: text("path").notNull().default(""),
  postId: text("post_id"),
  linkId: text("link_id"),
  targetUrl: text("target_url").notNull().default(""),
  referrer: text("referrer").notNull().default(""),
  country: text("country").notNull().default(""),
  device: text("device").notNull().default("desktop"),
  browser: text("browser").notNull().default("unknown"),
  utmSource: text("utm_source").notNull().default(""),
  utmMedium: text("utm_medium").notNull().default(""),
  utmCampaign: text("utm_campaign").notNull().default(""),
  utmTerm: text("utm_term").notNull().default(""),
  utmContent: text("utm_content").notNull().default(""),
  landingPage: text("landing_page").notNull().default(""),
  ts: text("ts").notNull(),
});

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default(""),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull().default(""),
  scopes: text("scopes").notNull().default("analytics:read"),
  lastUsedAt: text("last_used_at"),
  createdAt: text("created_at").notNull(),
});

export type ApiKey = typeof apiKeys.$inferSelect;

export const webhooks = sqliteTable("webhooks", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  secret: text("secret").notNull().default(""),
  events: text("events").notNull().default(""),
  enabled: integer("enabled").notNull().default(1),
  lastTriggeredAt: text("last_triggered_at"),
  createdAt: text("created_at").notNull(),
});

export type Webhook = typeof webhooks.$inferSelect;

export const analyticsSnapshots = sqliteTable("analytics_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  day: text("day").notNull().unique(),
  platform: text("platform").notNull().default("all"),
  visitors: integer("visitors").notNull().default(0),
  pageViews: integer("page_views").notNull().default(0),
  postViews: integer("post_views").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  newVisitors: integer("new_visitors").notNull().default(0),
  returningVisitors: integer("returning_visitors").notNull().default(0),
  engagementRate: integer("engagement_rate").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export type AnalyticsSnapshot = typeof analyticsSnapshots.$inferSelect;

export const domains = sqliteTable("domains", {
  id: text("id").primaryKey(),
  hostname: text("hostname").notNull().unique(),
  verificationToken: text("verification_token").notNull().default(""),
  status: text("status").notNull().default("pending"),
  verifiedAt: text("verified_at"),
  isPrimary: integer("is_primary").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export type Domain = typeof domains.$inferSelect;
