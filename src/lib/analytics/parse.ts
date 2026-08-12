export type Device = "desktop" | "tablet" | "mobile";

const BOT_PATTERNS =
  /(bot|crawler|spider|slurp|curl|wget|headless|facebookexternalhit|preview|scrape|monitor|pingdom|uptime|python-requests|go-http-client|okhttp|axios|node-fetch)/i;

export function isBot(ua: string): boolean {
  return BOT_PATTERNS.test(ua);
}

export function parseDevice(ua: string): Device {
  if (/ipad|tablet|playbook|silk|kindle/i.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android|opera mini|blackberry|windows phone/i.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

export function parseBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return "edge";
  if (/firefox|fxios/i.test(ua)) return "firefox";
  if (/chrome|crios|headlesschrome/i.test(ua)) return "chrome";
  if (/safari/i.test(ua)) return "safari";
  if (/opera|opr\//i.test(ua)) return "opera";
  return "other";
}

export function referrerHost(referrer: string): string {
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname;
    return host.replace(/^www\./, "").replace(/^m\./, "");
  } catch {
    return "direct";
  }
}

export function deviceLabel(device: Device): string {
  return device;
}
