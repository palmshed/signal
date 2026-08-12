"use client";

import { startTransition, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { type ThemeConfig } from "@/lib/theme";
import { DEFAULT_THEME } from "@/lib/theme";

interface ThemeRendererProps {
  theme: ThemeConfig;
  children: ReactNode;
}

export function ThemeRenderer({ theme, children }: ThemeRendererProps) {
  const { appearance, typography, layout } = theme;
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (appearance.mode === "dark") {
      startTransition(() => setIsDark(true));
    } else if (appearance.mode === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      startTransition(() => setIsDark(mq.matches));
      const handler = (e: MediaQueryListEvent) => startTransition(() => setIsDark(e.matches));
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else {
      startTransition(() => setIsDark(false));
    }
  }, [appearance.mode]);

  const widthClasses: Record<string, string> = {
    centered: "max-w-xl mx-auto",
    wide: "max-w-3xl mx-auto",
    compact: "max-w-md mx-auto",
    comfortable: "max-w-2xl mx-auto",
  };

  const fontClasses: Record<string, string> = {
    system: "font-sans",
    inter: "font-inter",
    geist: "font-geist-sans",
    serif: "font-serif",
  };

  const scaleClasses: Record<string, string> = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  const bgStyle = appearance.background ? { backgroundColor: appearance.background } : {};
  const textStyle = appearance.text ? { color: appearance.text } : {};
  const borderStyle = appearance.border ? { borderColor: appearance.border } : {};

  return (
    <div
      className={`min-h-screen flex flex-col ${fontClasses[typography.font] || fontClasses.system} ${scaleClasses[typography.scale] || scaleClasses.md} ${isDark ? "dark" : ""}`}
      style={{
        ...bgStyle,
        ...textStyle,
        ...borderStyle,
        "--signal-accent": `var(--color-${appearance.accent || DEFAULT_THEME.appearance.accent})`,
      } as Record<string, string>}
    >
      <div className={`w-full ${widthClasses[layout.width] || widthClasses.centered} flex-1 px-5 py-14`}>
        {children}
      </div>
    </div>
  );
}
