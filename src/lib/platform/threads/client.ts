import { randomBytes } from "node:crypto";
import type {
  ConnectionTokens,
  PlatformClient,
  RemotePost,
} from "../types";

const AUTHORIZE_URL = "https://threads.net/oauth/authorize";
const TOKEN_URL = "https://graph.threads.com/oauth/access_token";
const LONG_TOKEN_URL = "https://graph.threads.net/access_token";
const REFRESH_URL = "https://graph.threads.net/refresh_access_token";
const API_URL = "https://graph.threads.net/v1.0";

const SCOPES = ["threads_basic"];

function clientId(): string {
  return process.env.THREADS_CLIENT_ID || "";
}

function clientSecret(): string {
  return process.env.THREADS_CLIENT_SECRET || "";
}

function callbackUrl(): string {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/api/connections/threads/callback`;
}

function parseTokens(data: {
  access_token?: string;
  expires_in?: number;
  scope?: string;
}): ConnectionTokens {
  if (!data.access_token) throw new Error("Token response missing access_token.");
  return {
    accessToken: data.access_token,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : 0,
    scope: data.scope,
  };
}

async function requestToken(form: URLSearchParams): Promise<ConnectionTokens> {
  const body = new URLSearchParams(form);
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok) {
    throw new Error(`Threads token request failed (${res.status}): ${data.error_description || data.error || res.statusText}`);
  }
  return parseTokens(data);
}

async function apiGet<T>(path: string, accessToken: string): Promise<T> {
  const url = new URL(`${API_URL}${path}`);
  url.searchParams.set("access_token", accessToken);
  const res = await fetch(url.toString());

  if (res.status === 429) {
    throw new Error("Threads rate limit hit.");
  }

  if (res.status === 401) {
    throw new Error("Threads access token is invalid or revoked.");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Threads API request failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

interface ThreadsUser {
  id: string;
  username: string;
  name?: string;
}

interface ThreadsMedia {
  id: string;
  text?: string;
  media_type?: string;
  media_url?: string;
  permalink?: string;
  username?: string;
  timestamp?: string;
  shortcode?: string;
  thumbnail_url?: string;
  children?: { data?: Array<{ media_url?: string }> };
  is_quote_post?: boolean;
}

interface ThreadsTimeline {
  data?: ThreadsMedia[];
  paging?: {
    cursors?: { after?: string; before?: string };
  };
}

export const threadsClient: PlatformClient = {
  id: "threads",

  isConfigured() {
    return Boolean(clientId() && clientSecret());
  },

  async start() {
    const state = randomBytes(16).toString("hex");
    const params = new URLSearchParams({
      client_id: clientId(),
      redirect_uri: callbackUrl(),
      scope: SCOPES.join(","),
      response_type: "code",
      state,
    });
    return { url: `${AUTHORIZE_URL}?${params.toString()}`, state, verifier: "" };
  },

  async exchange(code, verifier) {
    const form = new URLSearchParams({
      client_id: clientId(),
      client_secret: clientSecret(),
      grant_type: "authorization_code",
      code,
      redirect_uri: callbackUrl(),
    });
    void verifier;
    const tokens = await requestToken(form);
    try {
      const longRes = await fetch(
        `${LONG_TOKEN_URL}?grant_type=th_exchange_token&client_secret=${encodeURIComponent(clientSecret())}&access_token=${encodeURIComponent(tokens.accessToken)}`,
      );
      const longData = (await longRes.json().catch(() => ({}))) as {
        access_token?: string;
        expires_in?: number;
      };
      if (longRes.ok && longData.access_token) {
        tokens.accessToken = longData.access_token;
        tokens.expiresAt = longData.expires_in ? Date.now() + longData.expires_in * 1000 : tokens.expiresAt;
      }
    } catch {
      // proceed with short-lived token if long-lived exchange fails
    }
    return tokens;
  },

  async refresh(refreshToken) {
    const res = await fetch(
      `${REFRESH_URL}?grant_type=th_refresh_token&access_token=${encodeURIComponent(refreshToken)}`,
    );
    const data = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!res.ok || !data.access_token) {
      throw new Error(`Threads refresh failed (${res.status}): ${JSON.stringify(data).slice(0, 200)}`);
    }
    return {
      accessToken: data.access_token,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : 0,
    };
  },

  async me(accessToken) {
    const data = await apiGet<{ data?: ThreadsUser }>("/me?fields=id,username,name", accessToken);
    if (!data.data) throw new Error("Threads did not return a user.");
    return {
      id: data.data.id,
      username: data.data.username,
      name: data.data.name || data.data.username,
    };
  },

  async fetchPosts(accessToken, userId, maxPages = 5) {
    const allPosts: RemotePost[] = [];
    let paginationToken: string | undefined;

    for (let page = 0; page < maxPages; page++) {
      const params = new URLSearchParams({
        fields: "id,text,media_type,media_url,permalink,username,timestamp,shortcode,thumbnail_url,children,is_quote_post",
        limit: "100",
        ...(paginationToken ? { after: paginationToken } : {}),
      });

      const data = await apiGet<ThreadsTimeline>(`/me/threads?${params.toString()}`, accessToken);

      const pagePosts = (data.data ?? []).map((media): RemotePost => {
        const child = media.children?.data?.[0];
        const imageUrl = media.media_url || child?.media_url || media.thumbnail_url || "";
        return {
          platformPostId: media.id,
          url: media.permalink || `https://www.threads.net/@${media.username}/post/${media.shortcode || media.id}`,
          text: media.text || "",
          author: media.username || "",
          username: media.username || "",
          createdAt: media.timestamp || "",
          imageUrl,
          metrics: { likes: 0, replies: 0, reposts: 0, quotes: 0 },
        };
      });

      allPosts.push(...pagePosts);

      if (!data.paging?.cursors?.after || pagePosts.length === 0) break;
      paginationToken = data.paging.cursors.after;
    }

    return allPosts;
  },
};
