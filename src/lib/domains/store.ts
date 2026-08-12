import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { randomBytes } from "node:crypto";
import { nowIso } from "@/lib/util";

export type DomainStatus = "pending" | "verified" | "active" | "removed";

export interface Domain {
  id: string;
  hostname: string;
  verificationToken: string;
  status: DomainStatus;
  verifiedAt: string | null;
  isPrimary: boolean;
  createdAt: string;
}

export interface CreateDomainInput {
  hostname: string;
}

export function normalizeHostname(hostname: string): string {
  return hostname
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .replace(/:\d+$/, "");
}

export function generateVerificationToken(): string {
  return `signal-verification=${randomBytes(16).toString("hex")}`;
}

export function listDomains(): Domain[] {
  return db.select().from(schema.domains).all().map((d) => ({
    ...d,
    status: d.status as DomainStatus,
    isPrimary: Boolean(d.isPrimary),
  }));
}

export function getDomainByHostname(hostname: string) {
  const normalized = normalizeHostname(hostname);
  const row = db
    .select()
    .from(schema.domains)
    .where(eq(schema.domains.hostname, normalized))
    .get();
  if (!row) return null;
  return {
    ...row,
    status: row.status as DomainStatus,
    isPrimary: Boolean(row.isPrimary),
  };
}

export function getPrimaryDomain(): Domain | null {
  const row = db
    .select()
    .from(schema.domains)
    .where(eq(schema.domains.isPrimary, 1))
    .get();
  if (!row) return null;
  return {
    ...row,
    status: row.status as DomainStatus,
    isPrimary: Boolean(row.isPrimary),
  };
}

export function createDomain(input: CreateDomainInput): Domain {
  const id = `domain_${randomBytes(8).toString("base64url")}`;
  const hostname = normalizeHostname(input.hostname);
  const verificationToken = generateVerificationToken();
  const now = nowIso();

  db.insert(schema.domains)
    .values({
      id,
      hostname,
      verificationToken,
      status: "pending",
      verifiedAt: null,
      isPrimary: 0,
      createdAt: now,
    })
    .run();

  return {
    id,
    hostname,
    verificationToken,
    status: "pending",
    verifiedAt: null,
    isPrimary: false,
    createdAt: now,
  };
}

export function verifyDomain(id: string): Domain | null {
  const domain = db
    .select()
    .from(schema.domains)
    .where(eq(schema.domains.id, id))
    .get();

  if (!domain) return null;

  db.update(schema.domains)
    .set({ status: "verified", verifiedAt: nowIso() })
    .where(eq(schema.domains.id, id))
    .run();

  return {
    ...domain,
    status: "verified",
    verifiedAt: nowIso(),
    isPrimary: Boolean(domain.isPrimary),
  };
}

export function activateDomain(id: string): Domain | null {
  const domain = db
    .select()
    .from(schema.domains)
    .where(eq(schema.domains.id, id))
    .get();

  if (!domain) return null;

  db.update(schema.domains)
    .set({ status: "active", isPrimary: 1 })
    .where(eq(schema.domains.id, id))
    .run();

  db.update(schema.domains)
    .set({ isPrimary: 0 })
    .where(and(eq(schema.domains.id, id), eq(schema.domains.isPrimary, 1)))
    .run();

  return {
    ...domain,
    status: "active",
    isPrimary: true,
  };
}

export function removeDomain(id: string) {
  db.delete(schema.domains).where(eq(schema.domains.id, id)).run();
}

export function isDomainAvailable(hostname: string, excludeId?: string): boolean {
  const normalized = normalizeHostname(hostname);
  const existing = db
    .select()
    .from(schema.domains)
    .where(eq(schema.domains.hostname, normalized))
    .get();

  if (!existing) return true;
  if (existing.id === excludeId) return true;
  return false;
}
