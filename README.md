# Signal

> A minimal link-in-bio and social post hub. One page, all your content, gathered in one place.

---

## 1. Overview

Signal is a self-hosted personal hub that aggregates your social posts and links into a single, canonical page. It is built for simplicity, ownership, and platform independence.

### 1.1 Design Principles

| Principle | Description |
|-----------|-------------|
| **Platform independence** | Core flows (`OAuth → Platform Adapter → Signal Post → Analytics`) remain agnostic to any single social network |
| **Security by default** | OAuth tokens are encrypted at rest (AES-256-GCM), never exposed to the client, and rotated via refresh tokens |
| **Minimal dependencies** | SQLite + Drizzle ORM, no external auth libraries, no client-side state management frameworks |
| **Static-first rendering** | The public page is pre-rendered; the admin dashboard is server-rendered on demand |

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind v4 |
| Database | SQLite via `better-sqlite3` |
| ORM | Drizzle ORM |
| Auth | HMAC-SHA256 signed cookies (no third-party auth) |
| Encryption | AES-256-GCM for token storage |
| OAuth | X (Twitter) OAuth 2.0 with PKCE, LinkedIn OAuth 2.0 |

---

## 3. Architecture

### 3.1 Directory Structure

```
src/
├── app/
│   ├── admin/
│   │   ├── analytics/page.tsx
│   │   ├── links/page.tsx
│   │   ├── posts/page.tsx
│   │   ├── settings/page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── connections/          # Platform OAuth & sync APIs
│   │   ├── cron/
│   │   │   └── sync/             # Automatic scheduled sync
│   │   ├── links/
│   │   ├── login/
│   │   ├── logout/
│   │   ├── posts/
│   │   ├── settings/
│   │   └── track/
│   ├── login/page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── admin-nav.tsx
│   ├── connections-form.tsx
│   ├── posts-manager.tsx
│   ├── settings-form.tsx
│   └── ...
├── lib/
│   ├── analytics/queries.ts
│   ├── auth/
│   │   ├── password.ts
│   │   ├── require-admin.ts
│   │   └── session.ts
│   ├── connections/
│   │   ├── crypto.ts            # AES-256-GCM token encryption
│   │   ├── oauth-state.ts       # HMAC-signed OAuth state cookies
│   │   ├── store.ts             # Connection CRUD + token refresh
│   │   └── sync.ts              # Shared sync logic for all platforms
│   ├── db/
│   │   ├── index.ts
│   │   ├── migrate.ts
│   │   ├── schema.ts
│   │   └── seed.ts
│   ├── platform/
│   │   ├── adapter.ts           # Platform registry
│   │   ├── types.ts             # PlatformAdapter, PlatformClient interfaces
│   │   ├── x/
│   │   │   ├── adapter.ts
│   │   │   └── client.ts        # OAuth 2.0 PKCE implementation
│   │   ├── linkedin/
│   │   │   ├── adapter.ts
│   │   │   └── client.ts
│   │   └── threads/
│   │       └── adapter.ts
│   ├── profile.ts
│   ├── social.ts
│   └── util.ts
└── types/
```

### 3.2 Data Flow

```
┌──────────────┐       ┌──────────────────┐       ┌─────────────┐
│   Browser    │──────▶│  Next.js Server  │──────▶│   SQLite    │
│  (public)    │       │   (App Router)   │       │  (Drizzle)  │
└──────────────┘       └──────────────────┘       └─────────────┘
        │                       │                        │
        │   GET /               │   pre-rendered         │
        │   (static page)       │   + dynamic OG         │
        ▼                       ▼                        ▼
┌──────────────┐       ┌──────────────────┐       ┌─────────────┐
│  Admin Panel │──────▶│  Server Actions  │──────▶│  Encrypted  │
│  /admin      │       │  & API Routes    │       │   tokens    │
└──────────────┘       └──────────────────┘       └─────────────┘
                                                         │
                                          OAuth 2.0      │
                                          PKCE flow      ▼
                                                     ┌─────────────┐
                                                     │   Platform  │
                                                     │   (X, etc.) │
                                                     └─────────────┘
```

### 3.3 Platform Adapter Pattern

Signal does not hardcode any platform. Each platform implements two contracts:

```typescript
interface PlatformClient {
  id: PlatformId;
  isConfigured(): boolean;
  start(): Promise<{ url: string; state: string; verifier: string }>;
  exchange(code: string, verifier: string): Promise<ConnectionTokens>;
  refresh(refreshToken: string): Promise<ConnectionTokens>;
  me(accessToken: string): Promise<PlatformMe>;
  fetchPosts(accessToken: string, userId: string): Promise<RemotePost[]>;
}

interface PlatformAdapter {
  id: PlatformId;
  label: string;
  icon: string;
  detect: (url: URL) => boolean;
  enrich: (url: URL) => Promise<EnrichedPost | null>;
  client?: PlatformClient;
}
```

This ensures the core pipeline, `OAuth → Platform Adapter → Signal Post → Analytics`, never becomes X/LinkedIn-specific.

---

## 4. Database Schema

### 4.1 Tables

| Table | Purpose |
|-------|---------|
| `settings` | Singleton profile config (name, bio, avatar, socials) |
| `posts` | Imported or manually added posts with engagement metadata |
| `links` | Admin-managed navigation links |
| `admins` | Admin accounts (scrypt password hashing) |
| `connections` | OAuth connections with encrypted tokens |
| `events` | Analytics events (pageview, postview, click) |

### 4.2 Connection Lifecycle

```text
disconnected ──▶ connected ──▶ error (on refresh/sync failure)
     ▲              │
     │              ▼
     └──────────────┘ (disconnect clears all tokens)
```

### 4.3 Token Security Model

- **Storage**: AES-256-GCM encrypted via `SESSION_SECRET`-derived key
- **Transit**: Never returned to client; only used server-side in API routes
- **Rotation**: Automatic refresh via `offline.access` scope before expiry
- **Revocation**: Disconnect wipes `access_token_enc` and `refresh_token_enc` to empty strings

---

## 5. Authentication

Signal uses a custom HMAC-SHA256 signed cookie system:

- **Session cookie**: `signal_session`, 30-day TTL, HttpOnly, SameSite=Lax
- **OAuth state cookie**: `signal_oauth`, 10-minute TTL, HttpOnly, SameSite=Lax
- **Admin flag**: `signal_is_admin`, 30-day TTL, path-scoped

No third-party authentication libraries are used. Password hashing uses `scryptSync` with a random per-user salt.

---

## 6. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ADMIN_EMAIL` | Yes (first run) | Bootstrap admin email |
| `ADMIN_PASSWORD` | Yes (first run) | Bootstrap admin password |
| `SESSION_SECRET` | Production | HMAC + encryption key (32-byte hex) |
| `SITE_NAME` | No | Display name (default: `Signal`) |
| `DATABASE_URL` | No | SQLite path (default: `./data/signal.db`) |
| `APP_URL` | OAuth | Canonical origin for callbacks and OG URLs |
| `TWITTER_CLIENT_ID` | X OAuth | X (Twitter) OAuth 2.0 client ID |
| `TWITTER_CLIENT_SECRET` | X OAuth | X (Twitter) OAuth 2.0 client secret |
| `LINKEDIN_CLIENT_ID` | LinkedIn OAuth | LinkedIn OAuth 2.0 client ID |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth | LinkedIn OAuth 2.0 client secret |
| `CRON_SECRET` | Cron | Bearer token for `/api/cron/sync` endpoint |

Generate a `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 7. X OAuth 2.0 Flow

### 7.1 Sequence Diagram

```text
Admin                             Signal Server                              X (Twitter)
  │                                     │                                         │
  │──Connect───────────────────────────▶│                                         │
  │                                     │──1. GET /authorize (PKCE)──────────────▶│
  │                                     │◀──2. Redirect with code─────────────────│
  │◀──3. Redirect───────────────────────│                                         │
  │                                     │──4. GET /callback?code=...─────────────▶│
  │                                     │──5. POST /token (code + verifier)──────▶│
  │                                     │◀──6. access_token + refresh_token───────│
  │                                     │──7. GET /users/me──────────────────────▶│
  │                                     │◀──8. user profile───────────────────────│
  │                                     │──9. Encrypt + store tokens─────────────▶│
  │◀──10. Redirect to /admin/settings───│                                         │
  │◀──11. Success───────────────────────│                                         │
```

### 7.2 Security Properties

- **PKCE**: `S256` challenge; no client secret in browser
- **State validation**: HMAC-signed, time-limited cookie
- **Token exposure**: Access tokens are never serialized to JSON responses
- **Refresh**: Automatic rotation when `tokenExpiresAt < now + 60s`
- **Revocation**: Disconnect clears all encrypted fields to empty strings

### 7.3 Scopes Requested

```
tweet.read         Read timeline and post metadata
users.read         Read authenticated user profile
offline.access     Persistent refresh tokens
```

---

## 8. LinkedIn OAuth 2.0 Flow

### 8.1 Sequence Diagram

```text
Admin                             Signal Server                                LinkedIn
  │                                     │                                         │
  │──Connect───────────────────────────▶│                                         │
  │                                     │──1. GET /authorization─────────────────▶│
  │                                     │◀──2. Redirect with code─────────────────│
  │◀──3. Redirect───────────────────────│                                         │
  │                                     │──4. GET /callback?code=...─────────────▶│
  │                                     │──5. POST /accessToken──────────────────▶│
  │                                     │◀──6. access_token + refresh_token───────│
  │                                     │──7. GET /userinfo──────────────────────▶│
  │                                     │◀──8. user profile───────────────────────│
  │                                     │──9. Encrypt + store tokens─────────────▶│
  │◀──10. Redirect to /admin/settings───│                                         │
  │◀──11. Success───────────────────────│                                         │
```

### 8.2 Security Properties

- **State validation**: HMAC-signed, time-limited cookie
- **Token exposure**: Access tokens are never serialized to JSON responses
- **Refresh**: Automatic rotation via `refresh_token` grant when supported
- **Revocation**: Disconnect clears all encrypted fields to empty strings

### 8.3 Scopes Requested

```
openid             OpenID Connect identity
profile            Basic profile fields
r_member_social    Read member posts and social actions
```

### 8.4 LinkedIn App Configuration

When creating your LinkedIn app at [linkedin.com/developers](https://www.linkedin.com/developers/apps):

1. Add redirect URL: `https://your-domain.com/api/connections/linkedin/callback`
2. Request scopes: `openid profile r_member_social`
3. Ensure your app has the **Sign In with LinkedIn** product enabled

---

## 9. Threads OAuth 2.0 Flow

### 9.1 Sequence Diagram

```text
Admin                             Signal Server                                Threads
  │                                     │                                         │
  │──Connect───────────────────────────▶│                                         │
  │                                     │──1. GET /authorize─────────────────────▶│
  │                                     │◀──2. Redirect with code─────────────────│
  │◀──3. Redirect───────────────────────│                                         │
  │                                     │──4. GET /callback?code=...─────────────▶│
  │                                     │──5. POST /accessToken──────────────────▶│
  │                                     │◀──6. access_token (short-lived)─────────│
  │                                     │──7. GET /access_token (long-lived)─────▶│
  │                                     │◀──8. long-lived access_token────────────│
  │                                     │──9. GET /me────────────────────────────▶│
  │                                     │◀──10. user profile──────────────────────│
  │                                     │──11. Encrypt + store tokens────────────▶│
  │◀──12. Redirect to /admin/settings───│                                         │
  │◀──13. Success───────────────────────│                                         │
```

### 9.2 Security Properties

- **State validation**: HMAC-signed, time-limited cookie
- **Token exposure**: Access tokens are never serialized to JSON responses
- **Long-lived tokens**: Automatically exchanged for 60-day tokens on connect
- **Refresh**: Automatic rotation via `th_refresh_token` grant before expiry
- **Revocation**: Disconnect clears all encrypted fields to empty strings

### 9.3 Scopes Requested

```
threads_basic    Read user profile and list posts
```

### 9.4 Threads App Configuration

When creating your Threads app at [developers.facebook.com](https://developers.facebook.com):

1. Add the **Threads** use case to your Meta app
2. Add redirect URL: `https://your-domain.com/api/connections/threads/callback`
3. Request scope: `threads_basic`
4. Ensure your app is approved for **Threads API** access

---

## 10. Analytics

### 10.1 Overview

Signal tracks pageviews, post views, and outbound clicks. The analytics dashboard provides:

- **Overview**: Visitors, page views, post views, clicks, engagement rate, new vs returning visitors
- **Content**: Per-post performance with views, clicks, and engagement rate, filterable by platform
- **Traffic**: Referrers, direct traffic, UTM campaigns, landing pages
- **Audience**: Country, device, browser, OS breakdown (privacy-friendly, no PII)
- **Links**: Outbound link click counts
- **Comparison**: Cross-platform post performance

### 10.2 Tracking

Events are captured via `/api/track` using `sendBeacon` or `fetch` with `keepalive`. Each event stores:

| Field | Description |
|-------|-------------|
| `session_id` | Anonymous session identifier (cookie-based) |
| `type` | `pageview`, `postview`, or `click` |
| `path` | Page path |
| `post_id` | Associated post ID (for postviews) |
| `link_id` | Associated link ID (for clicks) |
| `target_url` | Outbound URL (for clicks) |
| `referrer` | Traffic source or `direct` |
| `country` | Country code (from Cloudflare header) |
| `device` | `desktop`, `tablet`, or `mobile` |
| `browser` | Browser family |
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` | UTM parameters |
| `landing_page` | First page viewed in session |
| `ts` | Event timestamp |

### 10.3 Privacy

- No personally identifiable information is collected
- No cross-site tracking
- Sessions are anonymous and expire after 180 days
- Bot traffic is filtered out

### 10.4 Analytics API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/analytics/overview` | Admin | Overview stats (visitors, views, engagement) |
| `GET` | `/api/analytics/content` | Admin | Content performance by post |
| `GET` | `/api/analytics/traffic` | Admin | Traffic sources, UTM campaigns, landing pages |
| `GET` | `/api/analytics/audience` | Admin | Country, device, browser breakdown |
| `GET` | `/api/analytics/links` | Admin | Link click counts |
| `GET` | `/api/analytics/daily` | Admin | Daily event counts for charts |
| `GET` | `/api/analytics/comparison` | Admin | Cross-platform performance comparison |

---

## 11. Automatic Sync

### 11.1 Overview

Signal can automatically synchronize posts from connected platforms on a configurable interval. The sync worker:

1. Finds connections due for sync
2. Claims a lock to prevent concurrent runs
3. Fetches posts via the platform adapter
4. Imports new posts and marks deleted posts as unavailable
5. Records success/failure and schedules the next run

### 11.2 Cron Endpoint

```text
POST /api/cron/sync
Authorization: Bearer <CRON_SECRET>
```

The endpoint accepts a Bearer token in the `Authorization` header. It processes all connections whose `next_sync_at` has passed and releases the lock when done.

### 11.3 Scheduling

Each connection stores:

| Field | Description |
|-------|-------------|
| `sync_interval` | Minutes between automatic syncs (default: 30) |
| `next_sync_at` | ISO timestamp of the next scheduled sync |
| `sync_lock_token` | Random token preventing concurrent syncs |

### 11.4 External Scheduling

Signal does not include its own scheduler. Use one of the following to hit `/api/cron/sync` on a schedule:

- **Vercel Cron** (if deployed on Vercel): add a `vercel.json` cron job
- **GitHub Actions**: schedule a workflow that `curl`s the endpoint
- **cron-job.org**: external HTTP cron service
- **system cron**: `curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain.com/api/cron/sync`

Example crontab entry (every 15 minutes):

```bash
*/15 * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://your-domain.com/api/cron/sync > /dev/null 2>&1
```

---

## 12. Post Import Pipeline

### 12.1 X Post Enrichment

When importing from X, each post is transformed as follows:

| Field | Source |
|-------|--------|
| `url` | `https://x.com/{username}/status/{id}` |
| `platform` | `x` |
| `platformPostId` | Tweet ID |
| `title` | First 200 chars of tweet text |
| `description` | Full tweet text |
| `author` | Display name from `includes.users` |
| `imageUrl` | Highest-priority media (photo > video > any) |
| `status` | `published` |
| `publishedAt` | `created_at` from API |

### 12.2 Duplicate Handling

The unique index `idx_posts_platform_id` on `(platform, platform_post_id)` prevents duplicate imports. The import endpoint reports skipped IDs back to the client.

---

## 13. API Reference

### 13.1 Connections

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/connections` | Admin | List all connections (safe, no tokens) |
| `POST` | `/api/connections/x/connect` | Admin | Initiate X OAuth flow |
| `GET` | `/api/connections/x/callback` | Admin | OAuth callback handler |
| `DELETE` | `/api/connections/x/disconnect` | Admin | Disconnect and clear tokens |
| `GET` | `/api/connections/x/posts` | Admin | Fetch X timeline |
| `POST` | `/api/connections/x/import` | Admin | Import selected X posts |
| `POST` | `/api/connections/x/sync` | Admin | Full X sync (import new, mark unavailable) |
| `POST` | `/api/connections/linkedin/connect` | Admin | Initiate LinkedIn OAuth flow |
| `GET` | `/api/connections/linkedin/callback` | Admin | OAuth callback handler |
| `DELETE` | `/api/connections/linkedin/disconnect` | Admin | Disconnect and clear tokens |
| `GET` | `/api/connections/linkedin/posts` | Admin | Fetch LinkedIn timeline |
| `POST` | `/api/connections/linkedin/import` | Admin | Import selected LinkedIn posts |
| `POST` | `/api/connections/linkedin/sync` | Admin | Full LinkedIn sync (import new, mark unavailable) |
| `POST` | `/api/connections/threads/connect` | Admin | Initiate Threads OAuth flow |
| `GET` | `/api/connections/threads/callback` | Admin | OAuth callback handler |
| `DELETE` | `/api/connections/threads/disconnect` | Admin | Disconnect and clear tokens |
| `GET` | `/api/connections/threads/posts` | Admin | Fetch Threads timeline |
| `POST` | `/api/connections/threads/import` | Admin | Import selected Threads posts |
| `POST` | `/api/connections/threads/sync` | Admin | Full Threads sync (import new, mark unavailable) |

### 13.2 Cron

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/cron/sync` | Bearer `CRON_SECRET` | Run automatic sync for all due connections |

### 13.3 Existing Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/login` | None | Authenticate admin |
| `POST` | `/api/logout` | Admin | Clear session |
| `PUT` | `/api/settings` | Admin | Update profile |
| `POST` | `/api/posts` | Admin | Add post by URL |
| `DELETE` | `/api/posts/[id]` | Admin | Delete post |
| `PATCH` | `/api/posts/[id]` | Admin | Pin/unpin or toggle status |
| `POST` | `/api/links` | Admin | Add link |
| `PUT` | `/api/links` | Admin | Reorder links |
| `DELETE` | `/api/links/[id]` | Admin | Delete link |
| `POST` | `/api/track` | None | Public analytics tracking |

---

## 14. Brand Assets

`public/brand/` contains the full Signal logo suite.

### 14.1 Variants

| Asset | Usage |
|-------|-------|
| `icon-dark.svg` / `.png` | Favicon, light backgrounds |
| `icon-light.svg` / `.png` | Dark backgrounds |
| `icon-mark.svg` / `.png` | Smiley without rounded square (app icon, watermark) |
| `wordmark.svg` / `.png` | Icon + "Signal" text (headers, OG image) |
| `favicon.svg` | Browser tab icon |

### 14.2 Sizes

Each raster variant is exported at 16, 32, 64, 128, 256, and 512 px.

---

## 15. Getting Started

### 15.1 Prerequisites

- Node.js 18+
- npm or equivalent

### 15.2 Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd signal

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with your values
```

### 15.3 Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 15.4 Production Build

```bash
npm run build
npm start
```

---

## 16. Deployment

### 16.1 Environment Checklist

```env
# Required for admin access
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=secure-password

# Required in production
SESSION_SECRET=<64-char-hex>

# Required for X OAuth
TWITTER_CLIENT_ID=<from-developer-portal>
TWITTER_CLIENT_SECRET=<from-developer-portal>

# Required for LinkedIn OAuth
LINKEDIN_CLIENT_ID=<from-developer-portal>
LINKEDIN_CLIENT_SECRET=<from-developer-portal>

# Required for Threads OAuth
THREADS_CLIENT_ID=<from-developer-portal>
THREADS_CLIENT_SECRET=<from-developer-portal>

# Required for cron sync
CRON_SECRET=<64-char-hex>

# Recommended
APP_URL=https://your-domain.com
```

### 16.2 X App Configuration

When creating your X app at [developer.twitter.com](https://developer.twitter.com/en/portal/projects-and-apps):

1. Set **OAuth 2.0** as the authentication type
2. Enable **PKCE**
3. Add callback URL: `https://your-domain.com/api/connections/x/callback`
4. Request scopes: `tweet.read`, `users.read`, `offline.access`

### 16.3 LinkedIn App Configuration

When creating your LinkedIn app at [linkedin.com/developers](https://www.linkedin.com/developers/apps):

1. Add redirect URL: `https://your-domain.com/api/connections/linkedin/callback`
2. Request scopes: `openid profile r_member_social`
3. Ensure your app has the **Sign In with LinkedIn** product enabled

### 16.4 Threads App Configuration

When creating your Threads app at [developers.facebook.com](https://developers.facebook.com):

1. Add the **Threads** use case to your Meta app
2. Add redirect URL: `https://your-domain.com/api/connections/threads/callback`
3. Request scope: `threads_basic`
4. Ensure your app is approved for **Threads API** access

---

## 17. Analytics Export

Signal supports exporting analytics data in CSV and JSON formats.

### 17.1 Export Endpoint

```text
GET /api/analytics/export?format=csv&range=7d&platform=all
GET /api/analytics/export?format=json&range=30d&platform=x
```

Parameters:
- `format`: `csv` or `json`
- `range`: `24h`, `7d`, `30d`, or `90d`
- `platform`: `all`, `x`, `linkedin`, or `threads`

The export includes overview, content performance, traffic sources, UTM campaigns, landing pages, link clicks, platform comparison, and daily stats.

---

## 18. Public API

Signal provides a read-only public API for external integrations.

### 18.1 API Keys

Admin users can create API keys with specific scopes:

- `analytics:read`: Read analytics data
- `posts:read`: Read posts
- `links:read`: Read links
- `profile:read`: Read profile data

API keys are hashed before storage. The full key is shown only once during creation.

### 18.2 API Endpoints

| Method | Path | Auth | Scope | Description |
|--------|------|------|-------|-------------|
| `GET` | `/api/v1/analytics` | API Key | `analytics:read` | Get analytics overview, content, comparison, daily stats |
| `GET` | `/api/v1/posts` | API Key | `posts:read` | Get all posts |
| `GET` | `/api/v1/links` | API Key | `links:read` | Get all links |
| `GET` | `/api/v1/profile` | API Key | `profile:read` | Get public profile |

### 18.3 Usage

```bash
curl -H "Authorization: Bearer signal_sk_..." https://your-domain.com/api/v1/analytics?range=7d
```

---

## 19. Webhooks

Signal can send webhook events to external services.

### 19.1 Supported Events

- `post.imported`: A post was imported from a platform
- `post.unavailable`: A post was marked as unavailable
- `connection.synced`: A connection sync completed successfully
- `connection.error`: A connection sync failed

### 19.2 Webhook Payload

```json
{
  "event": "post.imported",
  "payload": {
    "postId": "post_abc123",
    "platform": "x",
    "url": "https://x.com/user/status/123"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 20. Analytics Snapshots

Signal stores daily analytics snapshots to improve query performance for historical data.

### 20.1 Snapshots Endpoint

```text
POST /api/analytics/snapshots/backfill: Backfill snapshots for the last 30 days
GET /api/analytics/snapshots?days=30&platform=all: Get snapshots
```

Snapshots are automatically created during cron sync jobs.

---

## 21. Custom Domains

Signal supports custom domains for your public profile page.

### 21.1 Domain Model

Each domain goes through a lifecycle:

```text
pending → verified → active → removed
```

| Status | Description |
|--------|-------------|
| `pending` | Domain added, awaiting DNS verification |
| `verified` | DNS TXT record confirmed, ready to activate |
| `active` | Domain is serving the profile |
| `removed` | Domain has been deleted |

### 21.2 Verification

Signal uses DNS TXT records for domain verification. When you add a domain, Signal generates a verification token. Add this as a TXT record to your DNS:

| Field | Value |
|-------|-------|
| Type | TXT |
| Name | `_signal` |
| Value | `signal-verification=<token>` |

Once the TXT record propagates, click "Verify" in the admin panel. Signal will check the DNS record and mark the domain as `verified`.

### 21.3 Primary Domain

After verification, you can set a domain as primary. The primary domain is used for:
- Canonical URLs
- Open Graph URLs
- Favicon
- All absolute links

### 21.4 Domain API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/domains` | Admin | List all domains |
| `POST` | `/api/domains` | Admin | Add a new domain |
| `POST` | `/api/domains/[id]?action=verify` | Admin | Verify domain ownership |
| `POST` | `/api/domains/[id]?action=primary` | Admin | Set as primary domain |
| `DELETE` | `/api/domains/[id]` | Admin | Remove domain |

---

## 22. Version History

| Version | Focus |
|---------|-------|
| v0.1 | Core profile, links, posts, analytics |
| v0.2 | X OAuth with PKCE, post sync, connections UI |
| v0.2.1 | Hardened OAuth, connection status model, unavailable detection |
| v0.2.2 | Automatic scheduled sync, cron endpoint |
| v0.3 | LinkedIn + Threads OAuth, unified adapter contract |
| v0.4 | Deeper analytics, insights dashboard |
| v0.5 | Public API, analytics export, webhooks, snapshots |
| v0.6 | Public page customization, themes, layouts |
| v0.6.1 | Custom domains, DNS verification |

---

## 23. License

Private / All rights reserved.
