import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { labels } from "@/db/schema";
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

export async function findOrCreateLabel(name: string) {
  const db = getDb();
  const existing = await db.select().from(labels).where(eq(labels.name, name)).limit(1);
  if (existing[0]) return existing[0];
  const [row] = await db.insert(labels).values({ name }).returning();
  return row;
}

export async function createLabel(input: LabelCreateInput) {
  return findOrCreateLabel(input.name);
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
