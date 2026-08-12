import { sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db, schema } from "@/lib/db";
import { nowIso } from "@/lib/util";

export interface WebhookInput {
  url: string;
  events: string[];
  secret?: string;
}

export interface WebhookResult {
  id: string;
  url: string;
  events: string[];
  secret: string;
  enabled: boolean;
}

export function createWebhook(input: WebhookInput): WebhookResult {
  const id = `wh_${randomBytes(8).toString("base64url")}`;
  const secret = input.secret || randomBytes(16).toString("base64url");
  const now = nowIso();

  db.insert(schema.webhooks)
    .values({
      id,
      url: input.url,
      secret,
      events: input.events.join(","),
      enabled: 1,
      createdAt: now,
    })
    .run();

  return {
    id,
    url: input.url,
    events: input.events,
    secret,
    enabled: true,
  };
}

export function listWebhooks() {
  return db.select().from(schema.webhooks).all();
}

export function deleteWebhook(id: string) {
  db.delete(schema.webhooks).where(sql`${schema.webhooks.id} = ${id}`).run();
}

export function getEnabledWebhooks() {
  return db.select().from(schema.webhooks).where(sql`${schema.webhooks.enabled} = 1`).all();
}

export async function dispatchWebhook(event: string, payload: Record<string, unknown>) {
  const webhooks = getEnabledWebhooks();
  const results: Array<{ id: string; ok: boolean; status?: number; error?: string }> = [];

  for (const webhook of webhooks) {
    const events = webhook.events.split(",").filter(Boolean);
    if (!events.includes(event)) continue;

    try {
      const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
      const res = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Signal-Webhook-Secret": webhook.secret,
        },
        body,
      });

      db.update(schema.webhooks)
        .set({ lastTriggeredAt: nowIso() })
        .where(sql`${schema.webhooks.id} = ${webhook.id}`)
        .run();

      results.push({ id: webhook.id, ok: res.ok, status: res.status });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Webhook delivery failed.";
      results.push({ id: webhook.id, ok: false, error: message });
    }
  }

  return results;
}
