"use client";

type TrackPayload = {
  type: "pageview" | "postview" | "click";
  path?: string;
  postId?: string;
  linkId?: string;
  targetUrl?: string;
  referrer?: string;
  url?: string;
};

function isAdminViewer(): boolean {
  return document.cookie.includes("signal_is_admin=1");
}

export function trackEvent(payload: TrackPayload) {
  if (isAdminViewer()) return;
  const body = JSON.stringify({
    ...payload,
    path: payload.path ?? window.location.pathname,
    referrer: payload.referrer ?? document.referrer,
    url: payload.url ?? window.location.href,
  });
  const blob = new Blob([body], { type: "application/json" });
  if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    navigator.sendBeacon("/api/track", blob);
  } else {
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }
}

let pageviewSent = false;

export function trackPageview(path?: string) {
  if (pageviewSent) return;
  pageviewSent = true;
  trackEvent({ type: "pageview", path });
}

export function trackPostView(postId: string) {
  trackEvent({ type: "postview", postId });
}

export function trackClick(opts: { linkId?: string; targetUrl: string }) {
  trackEvent({ type: "click", ...opts });
}
