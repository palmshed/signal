import type { PlatformId } from "./meta";

export type { PlatformId } from "./meta";

export interface EnrichedPost {
  platform: PlatformId;
  platformPostId?: string;
  title: string;
  description: string;
  author: string;
  imageUrl: string;
  embedHtml: string;
}

export interface RemotePost {
  platformPostId: string;
  url: string;
  text: string;
  author: string;
  username: string;
  createdAt: string;
  imageUrl: string;
  metrics: {
    likes: number;
    replies: number;
    reposts: number;
    quotes?: number;
  };
}

export interface ConnectionTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
}

export interface PlatformMe {
  id: string;
  username: string;
  name: string;
}

export interface OAuthConfig {
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  pkce: boolean;
}

export interface PlatformClient {
  id: PlatformId;
  isConfigured: () => boolean;
  start(): Promise<{ url: string; state: string; verifier: string }>;
  exchange(code: string, verifier: string): Promise<ConnectionTokens>;
  refresh(refreshToken: string): Promise<ConnectionTokens>;
  me(accessToken: string): Promise<PlatformMe>;
  fetchPosts(accessToken: string, userId: string, maxPages?: number): Promise<RemotePost[]>;
}

export interface PlatformAdapter {
  id: PlatformId;
  label: string;
  icon: string;
  detect: (url: URL) => boolean;
  enrich: (url: URL) => Promise<EnrichedPost | null>;
  client?: PlatformClient;
}
