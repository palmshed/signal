import { randomBytes } from "node:crypto";
import type {
  ConnectionTokens,
  PlatformClient,
  RemotePost,
} from "../types";

const AUTHORIZE_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const API_URL = "https://api.linkedin.com/v2";

const SCOPES = ["openid", "profile", "r_member_social"];

function clientId(): string {
  return process.env.LINKEDIN_CLIENT_ID || "";
}

function clientSecret(): string {
  return process.env.LINKEDIN_CLIENT_SECRET || "";
}

function callbackUrl(): string {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/api/connections/linkedin/callback`;
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
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok) {
    throw new Error(`LinkedIn token request failed (${res.status}): ${data.error_description || data.error || res.statusText}`);
  }
  return parseTokens(data);
}

async function apiGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });

  if (res.status === 429) {
    throw new Error("LinkedIn rate limit hit.");
  }

  if (res.status === 401) {
    throw new Error("LinkedIn access token is invalid or revoked.");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LinkedIn API request failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

interface LinkedInUserinfo {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email?: string;
}

interface LinkedInUgcPost {
  id: string;
  author?: string;
  lifecycleState?: string;
  created?: { time: number };
  lastModified?: { time: number };
  specificContent?: {
    "com.linkedin.ugc.ShareContent"?: {
      shareCommentary?: { text?: string; attributes?: unknown[] };
      media?: Array<{
        media: string;
        status?: string;
        title?: { text?: string };
      }>;
      shareMediaCategory?: string;
    };
  };
  visibility?: {
    "com.linkedin.ugc.MemberNetworkVisibility"?: string;
  };
}

interface LinkedInUgcResponse {
  elements?: LinkedInUgcPost[];
  paging?: {
    count?: number;
    start?: number;
    links?: Array<{ rel?: string; href?: string }>;
  };
}

export const linkedinClient: PlatformClient = {
  id: "linkedin",

  isConfigured() {
    return Boolean(clientId() && clientSecret());
  },

  async start() {
    const state = randomBytes(16).toString("hex");
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId(),
      redirect_uri: callbackUrl(),
      scope: SCOPES.join(" "),
      state,
    });
    return { url: `${AUTHORIZE_URL}?${params.toString()}`, state, verifier: "" };
  },

  async exchange(code, verifier) {
    const form = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: callbackUrl(),
      client_id: clientId(),
      client_secret: clientSecret(),
    });
    void verifier;
    return requestToken(form);
  },

  async refresh(refreshToken) {
    const form = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId(),
      client_secret: clientSecret(),
    });
    return requestToken(form);
  },

  async me(accessToken) {
    const data = await apiGet<LinkedInUserinfo>("/userinfo", accessToken);
    const name = data.name || [data.given_name, data.family_name].filter(Boolean).join(" ") || "";
    return {
      id: data.sub,
      username: data.email || data.sub,
      name: name || data.sub,
    };
  },

  async fetchPosts(accessToken, userId, maxPages = 5) {
    const allPosts: RemotePost[] = [];
    let start = 0;
    const count = 100;

    for (let page = 0; page < maxPages; page++) {
      const params = new URLSearchParams({
        q: "authors",
        authors: `List(urn:li:person:${encodeURIComponent(userId)})`,
        sortBy: "LAST_MODIFIED",
        count: String(count),
        start: String(start),
      });

      const data = await apiGet<LinkedInUgcResponse>(`/ugcPosts?${params.toString()}`, accessToken);

      const pagePosts = (data.elements ?? []).map((post): RemotePost => {
        const shareContent = post.specificContent?.["com.linkedin.ugc.ShareContent"];
        const text = shareContent?.shareCommentary?.text || "";
        const createdAt = post.created?.time ? new Date(post.created.time).toISOString() : "";
        const postId = post.id.replace("urn:li:ugcPost:", "");
        const url = `https://www.linkedin.com/feed/update/${encodeURIComponent(post.id)}/`;

        let imageUrl = "";
        const media = shareContent?.media;
        if (media && media.length > 0) {
          const first = media[0];
          if (first.title?.text && isValidImageUrl(first.title.text)) {
            imageUrl = first.title.text;
          }
        }

        return {
          platformPostId: postId,
          url,
          text,
          author: "",
          username: "",
          createdAt,
          imageUrl,
          metrics: { likes: 0, replies: 0, reposts: 0 },
        };
      });

      allPosts.push(...pagePosts);

      if (!data.paging?.links?.some((l) => l.rel === "next")) break;
      start += count;
      if (pagePosts.length < count) break;
    }

    return allPosts;
  },
};

function isValidImageUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
