import type { Metadata } from "next";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getProfile, getTheme, pageTitle, SOCIAL_LABELS } from "@/lib/profile";
import { getDomainByHostname, normalizeHostname } from "@/lib/domains/store";
import { SiteTracker } from "@/components/site-tracker";
import { TrackedLink } from "@/components/tracked-link";
import { TrackedPost } from "@/components/tracked-post";
import { ThemeRenderer } from "@/components/theme-renderer";

export const dynamic = "force-dynamic";

function baseUrl(requestUrl?: string): string {
  if (requestUrl) {
    try {
      const url = new URL(requestUrl);
      const domain = getDomainByHostname(url.hostname);
      if (domain && domain.status === "active") {
        return `${url.protocol}//${normalizeHostname(domain.hostname)}`;
      }
    } catch {
      // fall through
    }
  }
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export async function generateMetadata(): Promise<Metadata> {
  const profile = getProfile();
  const theme = getTheme();
  const title = pageTitle(profile);
  const description =
    profile.description || profile.tagline || profile.bio || "Signal";
  const ogImage = theme.branding.ogImage || "/og";
  const base = baseUrl();
  return {
    title,
    description,
    metadataBase: new URL(base),
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      url: "/",
      siteName: title,
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default function Home() {
  const profile = getProfile();
  const theme = getTheme();
  const name = profile.name || "Signal";
  const title = pageTitle(profile);

  const linkRows = db
    .select()
    .from(schema.links)
    .orderBy(asc(schema.links.position))
    .all();

  const postRows = db
    .select()
    .from(schema.posts)
    .where(eq(schema.posts.status, "published"))
    .orderBy(
      desc(schema.posts.pinned),
      desc(schema.posts.publishedAt),
      desc(schema.posts.createdAt),
    )
    .all();

  return (
    <ThemeRenderer theme={theme}>
      <SiteTracker />
      <main className="mx-auto w-full flex-1 px-5 py-14">
        <header className="flex flex-col items-center text-center">
          {theme.branding.showAvatar && profile.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt={name}
              className="h-20 w-20 rounded-full object-cover"
            />
          )}
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">{name}</h1>
          {profile.tagline && (
            <p className="mt-1 text-sm text-neutral-500">{profile.tagline}</p>
          )}
          {theme.content.showBio && profile.bio && (
            <p className="mt-3 max-w-md text-sm leading-relaxed text-neutral-600">
              {profile.bio}
            </p>
          )}
          {theme.content.showSocials && profile.socials.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              {profile.socials.map((social, i) => (
                <span key={social.platform} className="flex items-center gap-1">
                  {i > 0 && <span className="mr-1 text-neutral-300">·</span>}
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-neutral-700 underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-500"
                  >
                    {SOCIAL_LABELS[social.platform] ?? social.platform}
                  </a>
                </span>
              ))}
            </div>
          )}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noreferrer"
              className="mt-3 text-sm font-medium text-neutral-800 underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-500"
            >
              {safeHostname(profile.website)}
            </a>
          )}
        </header>

        {theme.content.showLinks && linkRows.length > 0 && (
          <nav className="mt-8 flex flex-col gap-2" aria-label="Links">
            {linkRows.map((link) => (
              <TrackedLink key={link.id} id={link.id} label={link.label} url={link.url} />
            ))}
          </nav>
        )}

        {theme.content.showPosts && postRows.length > 0 && (
          <section className="mt-10 flex flex-col gap-4" aria-label="Posts">
            {postRows.map((post) => (
              <TrackedPost key={post.id} post={post} />
            ))}
          </section>
        )}

        {!theme.content.showLinks && !theme.content.showPosts && (
          <div className="mt-16 flex flex-col items-center text-center">
            <p className="text-sm text-neutral-400">Nothing here yet.</p>
            <p className="mt-1 text-xs text-neutral-400">
              {title} is getting set up.
            </p>
          </div>
        )}
      </main>
    </ThemeRenderer>
  );
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
