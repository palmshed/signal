# palmshed/signal

Signal is a personal publishing and analytics system that aggregates posts from X, LinkedIn, and Threads into an owned public web presence. It includes synchronization, analytics, a read-only API, webhooks, theme customization, and custom-domain support.

## What Signal does

Signal connects to social platforms via OAuth, normalizes posts into a common format, and presents them on a canonical public page. The core flow is:

```
X / LinkedIn / Threads
  → platform adapters
  → normalized Signal posts
  → public profile page
  → analytics
```

In addition to post aggregation, Signal supports:
- custom navigation links
- profile customization (name, bio, avatar, socials)
- privacy-conscious anonymous analytics (no PII, no cross-site tracking)
- custom domains with DNS verification
- theme customization (typography, layout, colors)

## Architecture

Signal is built with:

- **Next.js 16.3** (App Router) + **TypeScript**
- **Tailwind CSS v4** for styling
- **SQLite** via `better-sqlite3` with **Drizzle ORM**
- **HMAC-SHA256** signed cookies for admin authentication
- **AES-256-GCM** for encrypted OAuth token storage

Key architectural layers:

- **Platform adapter contract**, each platform (`x`, `linkedin`, `threads`) implements `PlatformClient` and `PlatformAdapter`, keeping the core pipeline platform-independent
- **Shared sync engine**, a single `runSync()` function handles pagination, import, unavailable-post detection, and status updates for all platforms
- **OAuth connections**, per-platform token lifecycle with automatic refresh, expiry handling, and disconnect cleanup
- **API layer**, admin REST endpoints for profile, posts, links, connections, analytics, domains, API keys, and webhooks; public `/api/v1/*` endpoints scoped by API key
- **Analytics aggregation**, server-side queries over the `events` table producing overview, content, traffic, audience, and platform-comparison stats
- **Daily analytics snapshots**, precomputed aggregates stored in `analytics_snapshots` for historical query performance
- **Webhook delivery**, event dispatching to registered endpoints with per-delivery status tracking
- **Custom-domain routing**, hostname-based domain resolution for canonical URLs, OG metadata, and public-page serving

## Platform integrations

All three platforms use the same `PlatformClient` contract and shared sync engine.

### X (Twitter)
- OAuth 2.0 with PKCE (`S256`)
- Profile via `/users/me`
- Posts via `/users/{id}/tweets` with pagination
- Token refresh before expiry
- 401/429 error handling with backoff
- Long-lived token exchange on connect

### LinkedIn
- OAuth 2.0 authorization-code flow
- Profile via OpenID Connect `/userinfo`
- Posts via `/v2/ugcPosts` finder with pagination
- Token refresh when supported
- 401/429 error handling

### Threads
- OAuth 2.0 authorization-code flow via `threads.net/oauth/authorize`
- Token exchange at `graph.threads.com/oauth/access_token`
- Automatic long-lived token exchange (`th_exchange_token`)
- Refresh via `th_refresh_token`
- Profile via `/me`
- Posts via `/me/threads` with cursor pagination

All platforms support:
- post retrieval with pagination
- import with duplicate prevention
- unavailable-post detection
- automatic scheduled synchronization via `/api/cron/sync`
- connection status tracking (`connected`, `syncing`, `connected_with_error`, `disconnected`)

## Analytics

Signal tracks three event types: `pageview`, `postview`, `click`.

Metrics available:
- page views
- unique visitors
- post views
- outbound clicks
- engagement rate
- new vs returning visitors
- views per visitor

Dimensions:
- referrers (including direct)
- UTM campaigns (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`)
- landing pages
- country (from Cloudflare `CF-IPCountry` header)
- device (desktop, tablet, mobile)
- browser family

Platform comparison:
- per-platform views, clicks, post counts
- average views per post
- click-through rate

Export:
- CSV and JSON export with date-range and platform filters

Privacy:
- no PII collected
- anonymous session cookies (180-day TTL)
- bot traffic filtered
- no cross-site tracking

## Public API and integrations

### API keys
Admin users can create read-only API keys with scopes:
- `analytics:read`
- `posts:read`
- `links:read`
- `profile:read`

Keys are SHA-256 hashed before storage. The full key is shown only once during creation.

Public endpoints:
- `GET /api/v1/analytics`, overview, content stats, platform comparison, daily stats
- `GET /api/v1/posts`, all published posts
- `GET /api/v1/links`, all links
- `GET /api/v1/profile`, public profile data

### Webhooks
Supported events:
- `post.imported`
- `post.unavailable`
- `connection.synced`
- `connection.error`

Webhook payload includes event name, data object, and ISO timestamp. Delivery status is tracked per webhook.

## Customization

### Themes
Typed theme configuration stored as JSON in the `settings` table:

```
appearance: mode (light/dark/system), accent (22 colors), background, text, border
typography: font (system/inter/geist/serif), scale (sm/md/lg)
layout: width (centered/wide/compact/comfortable)
content: showBio, showSocials, showLinks, showPosts, postCardStyle, pinnedPostBehavior
branding: showAvatar, showWordmark, customFavicon, ogImage
```

### Custom domains
- DNS TXT verification (`_signal` record with `signal-verification=<token>`)
- Domain lifecycle: `pending` → `verified` → `active` → `removed`
- Primary domain selection for canonical URLs and OG metadata
- Hostname normalization (protocol stripping, trailing-slash removal, port stripping)

## Version progression

| Version | Milestone |
|---------|-----------|
| v0.1 | Core profile, links, posts, analytics |
| v0.2 | X OAuth and synchronization |
| v0.2.1 | OAuth and connection hardening |
| v0.2.2 | Automatic scheduled synchronization |
| v0.3 | LinkedIn + Threads with unified platform adapters |
| v0.4 | Deeper analytics and cross-platform comparison |
| v0.5 | Public API, exports, webhooks, analytics snapshots |
| v0.6 | Public-page customization and themes |
| v0.6.1 | Custom domains and DNS verification |

## Verification

Current state:
- TypeScript compilation passes (`tsc --noEmit`)
- ESLint passes (`npm run lint`)
- Production build passes (`npm run build --webpack`)
- 44 routes (1 static, 43 dynamic)
- Build uses webpack due to `better-sqlite3` native-module compatibility with Turbopack
- No automated test suite present

## Why this project matters

Signal explores turning fragmented social publishing into an owned, portable web presence. It retains platform-specific integrations behind a common abstraction, keeping the core pipeline (`OAuth → Platform Adapter → Signal Post → Analytics`) independent of any single network. The project emphasizes encryption, token security, privacy-friendly analytics, and a restrained design system over feature proliferation.

## Repository

https://github.com/palmshed/signal
