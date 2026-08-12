"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { SOCIAL_LABELS, SOCIAL_PLATFORMS } from "@/lib/social";
import type { Profile, SocialLink } from "@/lib/social";

export function SettingsForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: profile.name,
    tagline: profile.tagline,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    website: profile.website,
    title: profile.title,
    description: profile.description,
  });
  const [socials, setSocials] = useState<SocialLink[]>(profile.socials);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setSocial(index: number, field: "platform" | "url", value: string) {
    setSocials((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  function addSocial() {
    setSocials((rows) => [...rows, { platform: "github", url: "" }]);
  }

  function removeSocial(index: number) {
    setSocials((rows) => rows.filter((_, i) => i !== index));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          socials: socials.filter((s) => s.url.trim() !== ""),
        }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500";
  const labelClass = "mb-1 block text-sm font-medium text-neutral-700";

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="s-name" className={labelClass}>
            Name
          </label>
          <input
            id="s-name"
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="s-tagline" className={labelClass}>
            Tagline
          </label>
          <input
            id="s-tagline"
            type="text"
            value={form.tagline}
            onChange={(e) => set("tagline", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="s-avatar" className={labelClass}>
            Avatar URL
          </label>
          <input
            id="s-avatar"
            type="url"
            value={form.avatarUrl}
            onChange={(e) => set("avatarUrl", e.target.value)}
            className={inputClass}
            placeholder="https://…"
          />
        </div>
        <div>
          <label htmlFor="s-website" className={labelClass}>
            Website
          </label>
          <input
            id="s-website"
            type="url"
            value={form.website}
            onChange={(e) => set("website", e.target.value)}
            className={inputClass}
            placeholder="https://…"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="s-bio" className={labelClass}>
            Bio
          </label>
          <textarea
            id="s-bio"
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
            rows={3}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="s-title" className={labelClass}>
            Page title
          </label>
          <input
            id="s-title"
            type="text"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className={inputClass}
            placeholder="Defaults to your name"
          />
        </div>
        <div>
          <label htmlFor="s-description" className={labelClass}>
            Page description
          </label>
          <input
            id="s-description"
            type="text"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className={inputClass}
            placeholder="Defaults to your tagline"
          />
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-neutral-900">Social links</h2>
        <p className="mb-3 text-xs text-neutral-400">
          Shown on your public page. Add up to 12 links.
        </p>
        <div className="space-y-2">
          {socials.map((social, i) => (
            <div key={i} className="flex gap-2">
              <select
                value={social.platform}
                onChange={(e) => setSocial(i, "platform", e.target.value)}
                className="w-36 rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm outline-none focus:border-neutral-500"
                aria-label="Platform"
              >
                {SOCIAL_PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {SOCIAL_LABELS[p] ?? p}
                  </option>
                ))}
              </select>
              <input
                type="url"
                value={social.url}
                onChange={(e) => setSocial(i, "url", e.target.value)}
                className={`${inputClass} flex-1`}
                placeholder="https://…"
                aria-label="URL"
              />
              <button
                type="button"
                onClick={() => removeSocial(i)}
                className="shrink-0 rounded-lg border border-neutral-200 px-3 text-sm text-neutral-400 hover:text-red-600"
                aria-label="Remove link"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addSocial}
          className="mt-3 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:border-neutral-400"
        >
          + Add link
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-sm text-neutral-500">Saved.</span>}
      </div>
    </form>
  );
}
