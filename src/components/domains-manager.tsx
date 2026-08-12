"use client";

import { useEffect, useState } from "react";
import type { Domain } from "@/lib/domains/store";

export function DomainsManager() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [hostname, setHostname] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/domains");
    if (res.ok) {
      const data = (await res.json()) as { domains: Domain[] };
      setDomains(data.domains);
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function addDomain() {
    setMessage(null);
    if (!hostname.trim()) {
      setMessage({ type: "error", text: "Hostname is required." });
      return;
    }

    const res = await fetch("/api/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostname: hostname.trim() }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setMessage({ type: "error", text: data.error || "Failed to add domain." });
      return;
    }

    setMessage({ type: "ok", text: "Domain added. Verify it by adding the DNS record." });
    setHostname("");
    load();
  }

  async function verifyDomain(id: string) {
    setVerifying(id);
    setMessage(null);
    const res = await fetch(`/api/domains/${id}?action=verify`, { method: "POST" });
    if (!res.ok) {
      setMessage({ type: "error", text: "Verification failed." });
    } else {
      setMessage({ type: "ok", text: "Domain verified!" });
      load();
    }
    setVerifying(null);
  }

  async function setPrimary(id: string) {
    setMessage(null);
    const res = await fetch(`/api/domains/${id}?action=primary`, { method: "POST" });
    if (!res.ok) {
      setMessage({ type: "error", text: "Failed to set primary domain." });
    } else {
      setMessage({ type: "ok", text: "Primary domain updated." });
      load();
    }
  }

  async function removeDomain(id: string) {
    if (!confirm("Are you sure you want to remove this domain?")) return;
    setMessage(null);
    const res = await fetch(`/api/domains/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setMessage({ type: "error", text: "Failed to remove domain." });
    } else {
      setMessage({ type: "ok", text: "Domain removed." });
      load();
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-neutral-900">Custom Domains</h2>
      <p className="text-xs text-neutral-400">Add and verify custom domains for your profile.</p>

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

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="example.com"
          value={hostname}
          onChange={(e) => setHostname(e.target.value)}
          className="flex-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={addDomain}
          disabled={!hostname.trim()}
          className="rounded-lg bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          Add domain
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : (
        <div className="space-y-2">
          {domains.map((domain) => (
            <div
              key={domain.id}
              className="rounded-lg border border-neutral-200 bg-white p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-neutral-900">{domain.hostname}</div>
                  <div className="text-xs text-neutral-400">
                    Status: {domain.status}
                    {domain.isPrimary && " · Primary"}
                  </div>
                </div>
                <div className="flex gap-2">
                  {domain.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => verifyDomain(domain.id)}
                      disabled={verifying === domain.id}
                      className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:border-neutral-400 disabled:opacity-50"
                    >
                      {verifying === domain.id ? "Verifying…" : "Verify"}
                    </button>
                  )}
                  {domain.status === "verified" && (
                    <button
                      type="button"
                      onClick={() => setPrimary(domain.id)}
                      className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:border-neutral-400"
                    >
                      Set primary
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeDomain(domain.id)}
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:border-red-300 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {domain.status === "pending" && (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <p className="text-xs font-medium text-neutral-700">DNS Verification Record</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Add this TXT record to your DNS:
                  </p>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">Type:</span>
                      <span className="font-mono text-neutral-700">TXT</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">Name:</span>
                      <span className="font-mono text-neutral-700">_signal</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">Value:</span>
                      <span className="font-mono text-neutral-700 break-all">{domain.verificationToken}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {domains.length === 0 && (
            <p className="text-sm text-neutral-400">No custom domains configured.</p>
          )}
        </div>
      )}
    </div>
  );
}
