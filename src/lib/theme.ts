export type ThemeMode = "light" | "dark" | "system";

export type AccentColor =
  | "neutral"
  | "slate"
  | "gray"
  | "zinc"
  | "stone"
  | "red"
  | "orange"
  | "amber"
  | "yellow"
  | "lime"
  | "green"
  | "emerald"
  | "teal"
  | "cyan"
  | "sky"
  | "blue"
  | "indigo"
  | "violet"
  | "purple"
  | "fuchsia"
  | "pink"
  | "rose";

export type FontFamily = "system" | "inter" | "geist" | "serif";

export type LayoutWidth = "centered" | "wide" | "compact" | "comfortable";

export type PostCardStyle = "minimal" | "border" | "elevated";

export interface ThemeConfig {
  appearance: {
    mode: ThemeMode;
    accent: AccentColor;
    background: string;
    text: string;
    border: string;
  };
  typography: {
    font: FontFamily;
    scale: "sm" | "md" | "lg";
  };
  layout: {
    width: LayoutWidth;
    spacing: "compact" | "default" | "relaxed";
  };
  content: {
    showBio: boolean;
    showSocials: boolean;
    showLinks: boolean;
    showPosts: boolean;
    postCardStyle: PostCardStyle;
    pinnedPostBehavior: "top" | "inline" | "hide";
  };
  branding: {
    showAvatar: boolean;
    showWordmark: boolean;
    customFavicon: string;
    ogImage: string;
  };
}

export const DEFAULT_THEME: ThemeConfig = {
  appearance: {
    mode: "system",
    accent: "neutral",
    background: "#ffffff",
    text: "#171717",
    border: "#e5e5e5",
  },
  typography: {
    font: "system",
    scale: "md",
  },
  layout: {
    width: "centered",
    spacing: "default",
  },
  content: {
    showBio: true,
    showSocials: true,
    showLinks: true,
    showPosts: true,
    postCardStyle: "minimal",
    pinnedPostBehavior: "top",
  },
  branding: {
    showAvatar: true,
    showWordmark: true,
    customFavicon: "",
    ogImage: "",
  },
};

export function parseTheme(raw: string | null | undefined): ThemeConfig {
  if (!raw) return DEFAULT_THEME;
  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_THEME, ...parsed };
  } catch {
    return DEFAULT_THEME;
  }
}

export function stringifyTheme(theme: ThemeConfig): string {
  return JSON.stringify(theme);
}
