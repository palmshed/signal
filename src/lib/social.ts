export interface SocialLink {
  platform: string;
  url: string;
}

export interface Profile {
  name: string;
  tagline: string;
  bio: string;
  avatarUrl: string;
  website: string;
  title: string;
  description: string;
  socials: SocialLink[];
}

export const SOCIAL_LABELS: Record<string, string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  x: "X",
  threads: "Threads",
  youtube: "YouTube",
  custom: "Web",
};

export const SOCIAL_PLATFORMS = [
  "github",
  "linkedin",
  "x",
  "threads",
  "youtube",
  "custom",
] as const;
