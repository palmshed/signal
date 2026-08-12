import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { LinksManager } from "@/components/links-manager";

export const dynamic = "force-dynamic";

export default function LinksPage() {
  const links = db
    .select()
    .from(schema.links)
    .orderBy(asc(schema.links.position))
    .all();

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold tracking-tight">Links</h1>
      <LinksManager links={links} />
    </div>
  );
}
