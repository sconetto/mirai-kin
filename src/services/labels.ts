import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { labels } from "@/db/schema";
import type { ImportSource } from "@/db/schema";
import type { LabelCreateInput } from "@/lib/schemas";

export async function listLabels() {
  const db = getDb();
  return db.select().from(labels).orderBy(labels.name);
}

export async function getLabel(id: string) {
  const db = getDb();
  const rows = await db.select().from(labels).where(eq(labels.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function findOrCreateLabel(
  name: string,
  externalSource?: ImportSource,
  externalId?: string,
) {
  const db = getDb();
  if (externalSource && externalId) {
    const [byExternal] = await db
      .select()
      .from(labels)
      .where(and(eq(labels.externalSource, externalSource), eq(labels.externalId, externalId)))
      .limit(1);
    if (byExternal) return byExternal;
  }

  const existing = await db.select().from(labels).where(eq(labels.name, name)).limit(1);
  if (existing[0]) {
    if (!existing[0].externalId && externalSource && externalId) {
      const [adopted] = await db
        .update(labels)
        .set({ externalSource, externalId })
        .where(eq(labels.id, existing[0].id))
        .returning();
      if (adopted) return adopted;
    }
    return existing[0];
  }

  const [row] = await db.insert(labels).values({ name, externalSource, externalId }).returning();
  return row;
}

export async function createLabel(input: LabelCreateInput) {
  return findOrCreateLabel(input.name, input.externalSource, input.externalId);
}

export async function updateLabel(id: string, name: string) {
  const db = getDb();
  const [row] = await db.update(labels).set({ name }).where(eq(labels.id, id)).returning();
  return row ?? null;
}

export async function deleteLabel(id: string) {
  const db = getDb();
  const [row] = await db.delete(labels).where(eq(labels.id, id)).returning();
  return row ?? null;
}
