import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { beneficiaries, estateAssets, estateDocuments } from "@/db/schema";
import { listAccountBalances } from "./accounts";

export async function getEstate() {
  const db = getDb();
  const [accounts, assets, beneficiariesRows, documents] = await Promise.all([
    listAccountBalances(),
    db.select().from(estateAssets),
    db.select().from(beneficiaries).orderBy(beneficiaries.createdAt),
    db.select().from(estateDocuments).orderBy(estateDocuments.createdAt),
  ]);

  const totalShare = beneficiariesRows.reduce((sum, row) => sum + Number(row.sharePct), 0);

  return {
    accounts,
    assets,
    beneficiaries: beneficiariesRows,
    documents,
    totalShare: Number(totalShare.toFixed(2)),
  };
}

export async function createBeneficiary(input: {
  name: string;
  relationship?: string | null;
  sharePct?: string | number;
  notes?: string | null;
}) {
  const db = getDb();
  const [row] = await db
    .insert(beneficiaries)
    .values({
      name: input.name,
      relationship: input.relationship ?? null,
      sharePct: String(input.sharePct ?? "0"),
      notes: input.notes ?? null,
    })
    .returning();
  return row;
}

export async function createDocument(input: {
  name: string;
  category?: string;
  status?: string;
  notes?: string | null;
}) {
  const db = getDb();
  const [row] = await db
    .insert(estateDocuments)
    .values({
      name: input.name,
      category: input.category ?? "other",
      status: input.status ?? "missing",
      notes: input.notes ?? null,
    })
    .returning();
  return row;
}

export async function updateDocumentStatus(id: string, status: string) {
  const db = getDb();
  const [row] = await db
    .update(estateDocuments)
    .set({ status })
    .where(eq(estateDocuments.id, id))
    .returning();
  return row ?? null;
}
