import { createHash, randomBytes } from "node:crypto";
import type {
  ConnectionTokens,
  PlatformClient,
  RemotePost,
} from "../types";

const AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const API_URL = "https://api.twitter.com/2";

const SCOPES = ["tweet.read", "users.read", "offline.access"];

function clientId(): string {
  return process.env.TWITTER_CLIENT_ID || "";
}

function clientSecret(): string {
  return process.env.TWITTER_CLIENT_SECRET || "";
}

function callbackUrl(): string {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/api/connections/x/callback`;
}

function base64url(input: Buffer): string {
  return input.toString("base64url");
}

function parseTokens(data: {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}): ConnectionTokens {
  if (!data.access_token) throw new Error("Token response missing access_token.");
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : 0,
    scope: data.scope,
  };
}

async function requestToken(form: URLSearchParams): Promise<ConnectionTokens> {
  const body = new URLSearchParams(form);
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (clientSecret()) {
    headers.Authorization = `Basic ${Buffer.from(
      `${clientId()}:${clientSecret()}`,
    ).toString("base64")}`;
  }
  const res = await fetch(TOKEN_URL, { method: "POST", headers, body });
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error_description?: string;
  };
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("X authorization was revoked or expired. Please reconnect.");
    }
    throw new Error(`X token request failed (${res.status}): ${data.error_description || res.statusText}`);
  }
  return parseTokens(data);
}

async function apiGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 429) {
    const retryAfter = res.headers.get("x-rate-limit-reset");
    const waitMs = retryAfter ? Math.max(0, parseInt(retryAfter, 10) * 1000 - Date.now()) : 5000;
    await new Promise((r) => setTimeout(r, Math.min(waitMs, 30000)));
    throw new Error(`X rate limit hit. Retry after ${retryAfter ?? "5s"}.`);
  }

  if (res.status === 401) {
    throw new Error("X access token is invalid or revoked.");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`X API request failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

interface TwitterUser {
  id: string;
  username: string;
  name: string;
}

interface TwitterMedia {
  media_key: string;
  type: string;
  url?: string;
  preview_image_url?: string;
}

interface TwitterUserInclude {
  id: string;
  username: string;
  name: string;
}

interface TwitterTweet {
  id: string;
  text: string;
  created_at?: string;
  author_id?: string;
  public_metrics?: {
    like_count?: number;
    reply_count?: number;
    repost_count?: number;
    quote_count?: number;
  };
  attachments?: { media_keys?: string[] };
}

interface TwitterTimeline {
  data?: TwitterTweet[];
  includes?: {
    users?: TwitterUserInclude[];
    media?: TwitterMedia[];
  };
  meta?: { result_count?: number; next_token?: string };
  errors?: { title?: string; detail?: string }[];
}

export const xClient: PlatformClient = {
  id: "x",

  isConfigured() {
    return Boolean(clientId());
  },

  async start() {
    const state = randomBytes(16).toString("hex");
    const verifier = randomBytes(32).toString("base64url");
    const challenge = base64url(createHash("sha256").update(verifier).digest());
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId(),
      redirect_uri: callbackUrl(),
      scope: SCOPES.join(" "),
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    });
    return { url: `${AUTHORIZE_URL}?${params.toString()}`, state, verifier };
  },

  async exchange(code, verifier) {
    const form = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: callbackUrl(),
      code_verifier: verifier,
      client_id: clientId(),
    });
    return requestToken(form);
  },

  async refresh(refreshToken) {
    const form = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId(),
    });
    return requestToken(form);
  },

  async me(accessToken) {
    const data = await apiGet<{ data?: TwitterUser }>(
      "/users/me?user.fields=username,name,profile_image_url",
      accessToken,
    );
    if (!data.data) throw new Error("X did not return a user.");
    return {
      id: data.data.id,
      username: data.data.username,
      name: data.data.name,
    };
  },

  async fetchPosts(accessToken, userId, maxPages = 5) {
    const allPosts: RemotePost[] = [];
    let paginationToken: string | undefined;

    for (let page = 0; page < maxPages; page++) {
      const params = new URLSearchParams({
        "tweet.fields": "created_at,public_metrics,attachments,author_id",
        "user.fields": "username,name",
        "media.fields": "type,url,preview_image_url",
        expansions: "author_id,attachments.media_keys",
        max_results: "100",
        ...(paginationToken ? { pagination_token: paginationToken } : {}),
      });

      const data = await apiGet<TwitterTimeline>(
        `/users/${userId}/tweets?${params.toString()}`,
        accessToken,
      );

      if (data.errors?.length) {
        throw new Error(`X timeline returned errors: ${data.errors[0].detail || data.errors[0].title}`);
      }

      const users = new Map((data.includes?.users ?? []).map((u) => [u.id, u]));
      const media = new Map((data.includes?.media ?? []).map((m) => [m.media_key, m]));

      const pagePosts = (data.data ?? []).map((tweet): RemotePost => {
        const author = tweet.author_id ? users.get(tweet.author_id) : undefined;
        const mediaKeys = tweet.attachments?.media_keys ?? [];
        const items = mediaKeys
          .map((key) => media.get(key))
          .filter((m): m is TwitterMedia => !!m);
        const photo = items.find((m) => m.type === "photo");
        const imageUrl = photo?.url || photo?.preview_image_url || items[0]?.url || items[0]?.preview_image_url || "";
        return {
          platformPostId: tweet.id,
          url: `https://x.com/${author?.username ?? "x"}/status/${tweet.id}`,
          text: tweet.text,
          author: author?.name ?? "",
          username: author?.username ?? "",
          createdAt: tweet.created_at ?? "",
          imageUrl,
          metrics: {
            likes: tweet.public_metrics?.like_count ?? 0,
            replies: tweet.public_metrics?.reply_count ?? 0,
            reposts: tweet.public_metrics?.repost_count ?? 0,
            quotes: tweet.public_metrics?.quote_count ?? 0,
          },
        };
      });

      allPosts.push(...pagePosts);

      if (!data.meta?.next_token || pagePosts.length === 0) break;
      paginationToken = data.meta.next_token;
    }

    return allPosts;
  },
};
