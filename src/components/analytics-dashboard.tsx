"use client";

import { useEffect, useMemo, useState } from "react";

interface Overview {
  visitors: number;
  pageViews: number;
  postViews: number;
  clicks: number;
  newVisitors: number;
  returningVisitors: number;
  engagementRate: number;
  viewsPerVisitor: number;
}

interface ContentStat {
  postId: string;
  title: string;
  platform: string;
  views: number;
  clicks: number;
  engagementRate: number;
}

interface TrafficSource {
  source: string;
  count: number;
  percentage: number;
}

interface UtmCampaign {
  campaign: string;
  source: string;
  medium: string;
  count: number;
}

interface AudienceRow {
  label: string;
  count: number;
  percentage: number;
}

interface LinkStat {
  linkId: string;
  label: string;
  clicks: number;
}

interface PlatformComparison {
  platform: string;
  posts: number;
  views: number;
  clicks: number;
  avgViewsPerPost: number;
  clickThroughRate: number;
}

interface DailyStat {
  day: string;
  pageViews: number;
  postViews: number;
  clicks: number;
}

const RANGES = [
  { key: "24h", label: "24h" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

const PLATFORMS = [
  { key: "all", label: "All platforms" },
  { key: "x", label: "X" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "threads", label: "Threads" },
] as const;

type PlatformKey = (typeof PLATFORMS)[number]["key"];

export function AnalyticsDashboard() {
  const [range, setRange] = useState<RangeKey>("7d");
  const [platform, setPlatform] = useState<PlatformKey>("all");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [content, setContent] = useState<ContentStat[]>([]);
  const [traffic, setTraffic] = useState<TrafficSource[]>([]);
  const [campaigns, setCampaigns] = useState<UtmCampaign[]>([]);
  const [landingPages, setLandingPages] = useState<{ page: string; count: number }[]>([]);
  const [audience, setAudience] = useState<{ country: AudienceRow[]; device: AudienceRow[]; browser: AudienceRow[] } | null>(null);
  const [links, setLinks] = useState<LinkStat[]>([]);
  const [comparison, setComparison] = useState<PlatformComparison[]>([]);
  const [daily, setDaily] = useState<DailyStat[]>([]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    async function load() {
      const params = new URLSearchParams({ range });
      if (platform !== "all") params.set("platform", platform);

      const [overviewRes, contentRes, trafficRes, audienceRes, linksRes, comparisonRes, dailyRes] = await Promise.all([
        fetch(`/api/analytics/overview?${params.toString()}`),
        fetch(`/api/analytics/content?${params.toString()}`),
        fetch(`/api/analytics/traffic?${params.toString()}`),
        fetch(`/api/analytics/audience?${params.toString()}`),
        fetch(`/api/analytics/links?${params.toString()}`),
        fetch(`/api/analytics/comparison?${params.toString()}`),
        fetch(`/api/analytics/daily?${params.toString()}`),
      ]);

      if (cancelled) return;

      const [overviewData, contentData, trafficData, audienceData, linksData, comparisonData, dailyData] = await Promise.all([
        overviewRes.json(),
        contentRes.json(),
        trafficRes.json(),
        audienceRes.json(),
        linksRes.json(),
        comparisonRes.json(),
        dailyRes.json(),
      ]);

      if (!cancelled) {
        setOverview(overviewData);
        setContent(contentData.posts || []);
        setTraffic(trafficData.sources || []);
        setCampaigns(trafficData.campaigns || []);
        setLandingPages(trafficData.landingPages || []);
        setAudience(audienceData);
        setLinks(linksData.links || []);
        setComparison(comparisonData.platforms || []);
        setDaily(dailyData.daily || []);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [range, platform]);

  const maxDaily = useMemo(() => Math.max(1, ...daily.map((d) => d.pageViews + d.postViews + d.clicks)), [daily]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Analytics</h1>
        <div className="flex gap-2">
          <div className="flex gap-1 rounded-lg border border-neutral-200 bg-white p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`rounded-md px-3 py-1 text-sm ${range === r.key ? "bg-neutral-900 text-white" : "text-neutral-500 hover:text-neutral-900"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <a
            href={`/api/analytics/export?format=csv&range=${range}${platform !== "all" ? `&platform=${platform}` : ""}`}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:border-neutral-400"
          >
            Export CSV
          </a>
          <a
            href={`/api/analytics/export?format=json&range=${range}${platform !== "all" ? `&platform=${platform}` : ""}`}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:border-neutral-400"
          >
            Export JSON
          </a>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-neutral-500">Platform:</label>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as PlatformKey)}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700"
        >
          {PLATFORMS.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-400">Loading analytics…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Visitors" value={overview?.visitors ?? 0} />
            <Stat label="Page views" value={overview?.pageViews ?? 0} />
            <Stat label="Post views" value={overview?.postViews ?? 0} />
            <Stat label="Clicks" value={overview?.clicks ?? 0} />
            <Stat label="Engagement" value={`${overview?.engagementRate ?? 0}%`} />
            <Stat label="New / Return" value={`${overview?.newVisitors ?? 0} / ${overview?.returningVisitors ?? 0}`} />
          </div>

          {daily.length > 0 && (
            <section className="rounded-xl border border-neutral-200 bg-white p-5">
              <h2 className="mb-4 text-sm font-medium text-neutral-900">Activity over time</h2>
              <div className="flex h-32 items-end gap-1">
                {daily.map((d) => {
                  const total = d.pageViews + d.postViews + d.clicks;
                  return (
                    <div
                      key={d.day}
                      className="flex flex-1 flex-col items-center gap-1"
                      title={`${d.day}: ${total} events`}
                    >
                      <div
                        className="w-full rounded-sm bg-neutral-900"
                        style={{ height: `${Math.max(3, (total / maxDaily) * 100)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-neutral-400">
                <span>{daily[0]?.day}</span>
                <span>{daily[daily.length - 1]?.day}</span>
              </div>
            </section>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <ListCard title="Content performance">
              {content.length === 0 && <Empty />}
              {content.map((p) => (
                <div key={p.postId} className="flex items-center justify-between gap-3 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-neutral-800">{p.title}</p>
                    <p className="text-xs uppercase tracking-wide text-neutral-400">{p.platform}</p>
                  </div>
                  <div className="flex gap-4 text-sm tabular-nums text-neutral-500">
                    <span>{p.views} views</span>
                    <span>{p.clicks} clicks</span>
                    <span>{p.engagementRate}%</span>
                  </div>
                </div>
              ))}
            </ListCard>

            <ListCard title="Platform comparison">
              {comparison.length === 0 && <Empty />}
              {comparison.map((p) => (
                <div key={p.platform} className="flex items-center justify-between gap-3 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-neutral-800 capitalize">{p.platform}</p>
                    <p className="text-xs text-neutral-400">{p.posts} posts</p>
                  </div>
                  <div className="flex gap-4 text-sm tabular-nums text-neutral-500">
                    <span>{p.views} views</span>
                    <span>{p.clicks} clicks</span>
                    <span>{p.avgViewsPerPost} avg</span>
                    <span>{p.clickThroughRate}% CTR</span>
                  </div>
                </div>
              ))}
            </ListCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ListCard title="Traffic sources">
              {traffic.length === 0 && <Empty />}
              {traffic.map((s) => (
                <div key={s.source} className="py-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-800">{s.source}</span>
                    <span className="text-sm font-medium tabular-nums text-neutral-500">
                      {s.count} · {s.percentage}%
                    </span>
                  </div>
                  <div className="mt-1 h-1 rounded-full bg-neutral-100">
                    <div className="h-1 rounded-full bg-neutral-300" style={{ width: `${s.percentage}%` }} />
                  </div>
                </div>
              ))}
            </ListCard>

            <ListCard title="UTM campaigns">
              {campaigns.length === 0 && <Empty />}
              {campaigns.map((c, i) => (
                <div key={`${c.campaign}-${c.source}-${i}`} className="flex items-center justify-between gap-3 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-neutral-800">{c.campaign || "(unnamed)"}</p>
                    <p className="text-xs text-neutral-400">{c.source} / {c.medium}</p>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-neutral-500">{c.count}</span>
                </div>
              ))}
            </ListCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ListCard title="Landing pages">
              {landingPages.length === 0 && <Empty />}
              {landingPages.map((l) => (
                <div key={l.page} className="flex items-center justify-between gap-3 py-1.5">
                  <span className="truncate text-sm text-neutral-800">{l.page}</span>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-neutral-500">{l.count}</span>
                </div>
              ))}
            </ListCard>

            <ListCard title="Link clicks">
              {links.length === 0 && <Empty />}
              {links.map((l) => (
                <div key={l.linkId} className="flex items-center justify-between gap-3 py-1.5">
                  <span className="truncate text-sm text-neutral-800">{l.label}</span>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-neutral-500">{l.clicks}</span>
                </div>
              ))}
            </ListCard>
          </div>

          {audience && (
            <div className="grid gap-6 lg:grid-cols-3">
              <ListCard title="Country">
                {audience.country.length === 0 && <Empty />}
                {audience.country.map((c) => (
                  <div key={c.label} className="py-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-800">{c.label.toUpperCase()}</span>
                      <span className="text-sm font-medium tabular-nums text-neutral-500">{c.count} · {c.percentage}%</span>
                    </div>
                    <div className="mt-1 h-1 rounded-full bg-neutral-100">
                      <div className="h-1 rounded-full bg-neutral-300" style={{ width: `${c.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </ListCard>

              <ListCard title="Device">
                {audience.device.length === 0 && <Empty />}
                {audience.device.map((d) => (
                  <div key={d.label} className="py-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-800 capitalize">{d.label}</span>
                      <span className="text-sm font-medium tabular-nums text-neutral-500">{d.count} · {d.percentage}%</span>
                    </div>
                    <div className="mt-1 h-1 rounded-full bg-neutral-100">
                      <div className="h-1 rounded-full bg-neutral-300" style={{ width: `${d.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </ListCard>

              <ListCard title="Browser">
                {audience.browser.length === 0 && <Empty />}
                {audience.browser.map((b) => (
                  <div key={b.label} className="py-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-800 capitalize">{b.label}</span>
                      <span className="text-sm font-medium tabular-nums text-neutral-500">{b.count} · {b.percentage}%</span>
                    </div>
                    <div className="mt-1 h-1 rounded-full bg-neutral-100">
                      <div className="h-1 rounded-full bg-neutral-300" style={{ width: `${b.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </ListCard>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

function ListCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5">
      <h2 className="mb-2 text-sm font-medium text-neutral-900">{title}</h2>
      {children}
    </section>
  );
}

function Empty() {
  return <p className="py-2 text-sm text-neutral-400">No data yet.</p>;
}
