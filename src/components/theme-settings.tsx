"use client";

import { useEffect, useState } from "react";
import { DEFAULT_THEME, type ThemeConfig, type ThemeMode, type AccentColor, type FontFamily, type LayoutWidth, type PostCardStyle } from "@/lib/theme";

const THEME_MODES: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const FONT_FAMILIES: { value: FontFamily; label: string }[] = [
  { value: "system", label: "System" },
  { value: "inter", label: "Inter" },
  { value: "geist", label: "Geist" },
  { value: "serif", label: "Serif" },
];

const LAYOUT_WIDTHS: { value: LayoutWidth; label: string }[] = [
  { value: "centered", label: "Centered" },
  { value: "wide", label: "Wide" },
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
];

const POST_CARD_STYLES: { value: PostCardStyle; label: string }[] = [
  { value: "minimal", label: "Minimal" },
  { value: "border", label: "Border" },
  { value: "elevated", label: "Elevated" },
];

const ACCENT_COLORS: { value: AccentColor; label: string; color: string }[] = [
  { value: "neutral", label: "Neutral", color: "#171717" },
  { value: "slate", label: "Slate", color: "#1e293b" },
  { value: "gray", label: "Gray", color: "#4b5563" },
  { value: "zinc", label: "Zinc", color: "#3f3f46" },
  { value: "stone", label: "Stone", color: "#44403c" },
  { value: "red", label: "Red", color: "#b91c1c" },
  { value: "orange", label: "Orange", color: "#c2410c" },
  { value: "amber", label: "Amber", color: "#b45309" },
  { value: "yellow", label: "Yellow", color: "#a16207" },
  { value: "lime", label: "Lime", color: "#3f6212" },
  { value: "green", label: "Green", color: "#15803d" },
  { value: "emerald", label: "Emerald", color: "#047857" },
  { value: "teal", label: "Teal", color: "#0f766e" },
  { value: "cyan", label: "Cyan", color: "#0891b2" },
  { value: "sky", label: "Sky", color: "#0369a1" },
  { value: "blue", label: "Blue", color: "#1d4ed8" },
  { value: "indigo", label: "Indigo", color: "#4338ca" },
  { value: "violet", label: "Violet", color: "#6d28d9" },
  { value: "purple", label: "Purple", color: "#7e22ce" },
  { value: "fuchsia", label: "Fuchsia", color: "#c026d3" },
  { value: "pink", label: "Pink", color: "#db2777" },
  { value: "rose", label: "Rose", color: "#be123c" },
];

export function ThemeSettings() {
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => {
        if (!cancelled && data.theme) {
          setTheme(data.theme);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      if (!res.ok) {
        setMessage({ type: "error", text: "Failed to save theme." });
        return;
      }
      setMessage({ type: "ok", text: "Theme saved." });
    } catch {
      setMessage({ type: "error", text: "Failed to save theme." });
    } finally {
      setSaving(false);
    }
  }

  function update(path: string, value: unknown) {
    setTheme((prev) => {
      const next = { ...prev };
      const parts = path.split(".");
      let current: Record<string, unknown> = next as Record<string, unknown>;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) current[part] = {};
        current = current[part] as Record<string, unknown>;
      }
      current[parts[parts.length - 1]] = value;
      return next as ThemeConfig;
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-medium text-neutral-900">Appearance</h2>
        <p className="mt-1 text-xs text-neutral-400">Customize how your public page looks.</p>
      </div>

      {message && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            message.type === "ok"
              ? "border-neutral-200 bg-neutral-50 text-neutral-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-neutral-700">Theme mode</label>
            <div className="mt-1 flex gap-2">
              {THEME_MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => update("appearance.mode", m.value)}
                  className={`rounded-lg border px-3 py-1.5 text-xs ${
                    theme.appearance.mode === m.value
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-300 text-neutral-700"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-700">Accent color</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => update("appearance.accent", color.value)}
                  className={`h-8 w-8 rounded-full border-2 ${
                    theme.appearance.accent === color.value
                      ? "border-neutral-900"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: color.color }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-700">Background</label>
            <input
              type="color"
              value={theme.appearance.background || "#ffffff"}
              onChange={(e) => update("appearance.background", e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-neutral-200"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-700">Text color</label>
            <input
              type="color"
              value={theme.appearance.text || "#171717"}
              onChange={(e) => update("appearance.text", e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-neutral-200"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-700">Border color</label>
            <input
              type="color"
              value={theme.appearance.border || "#e5e5e5"}
              onChange={(e) => update("appearance.border", e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-neutral-200"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-neutral-700">Font family</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {FONT_FAMILIES.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => update("typography.font", f.value)}
                  className={`rounded-lg border px-3 py-1.5 text-xs ${
                    theme.typography.font === f.value
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-300 text-neutral-700"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-700">Font scale</label>
            <div className="mt-1 flex gap-2">
              {[
                { value: "sm", label: "Small" },
                { value: "md", label: "Medium" },
                { value: "lg", label: "Large" },
              ].map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => update("typography.scale", s.value)}
                  className={`rounded-lg border px-3 py-1.5 text-xs ${
                    theme.typography.scale === s.value
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-300 text-neutral-700"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-700">Layout width</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {LAYOUT_WIDTHS.map((w) => (
                <button
                  key={w.value}
                  type="button"
                  onClick={() => update("layout.width", w.value)}
                  className={`rounded-lg border px-3 py-1.5 text-xs ${
                    theme.layout.width === w.value
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-300 text-neutral-700"
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-700">Post card style</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {POST_CARD_STYLES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => update("content.postCardStyle", s.value)}
                  className={`rounded-lg border px-3 py-1.5 text-xs ${
                    theme.content.postCardStyle === s.value
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-300 text-neutral-700"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-medium text-neutral-700">Content visibility</h3>
        <div className="flex flex-wrap gap-3">
          {[
            { key: "showBio", label: "Bio" },
            { key: "showSocials", label: "Socials" },
            { key: "showLinks", label: "Links" },
            { key: "showPosts", label: "Posts" },
            { key: "showAvatar", label: "Avatar" },
            { key: "showWordmark", label: "Wordmark" },
          ].map((item) => (
            <label key={item.key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={
                  theme.content[item.key as keyof typeof theme.content] as boolean ||
                  theme.branding[item.key as keyof typeof theme.branding] as boolean
                }
                onChange={(e) => {
                  if (item.key in theme.content) {
                    update(`content.${item.key}`, e.target.checked);
                  } else {
                    update(`branding.${item.key}`, e.target.checked);
                  }
                }}
                className="h-4 w-4 rounded border-neutral-300"
              />
              <span className="text-sm text-neutral-700">{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save theme"}
        </button>
      </div>
    </div>
  );
}
