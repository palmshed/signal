export type PlatformId = "linkedin" | "x" | "threads" | "custom";

export const PLATFORM_META: Record<PlatformId, { label: string; icon: string }> = {
  linkedin: { label: "LinkedIn", icon: "in" },
  x: { label: "X", icon: "x" },
  threads: { label: "Threads", icon: "◎" },
  custom: { label: "Web", icon: "•" },
};
