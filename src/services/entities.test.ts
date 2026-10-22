import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/db";
import { transactions } from "@/db/schema";
import { sql } from "drizzle-orm";
import { createEntity, deleteEntity, getEntity, updateEntity } from "./entities";

async function transactionCount(): Promise<number> {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions);
  return row?.count ?? 0;
}

describe.skipIf(!process.env.DATABASE_URL)("entity CRUD", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("creates, updates, and deletes an entity without creating transactions", async () => {
    const before = await transactionCount();
    const created = await createEntity({
      kind: "loan",
      name: `TEST entity ${randomUUID()}`,
      currency: "BRL",
      balance: "10000",
      interestRate: "0.12",
      termMonths: 12,
      startDate: "2026-01-01",
    });

    try {
      expect(created.kind).toBe("loan");
      expect(await getEntity(created.id)).not.toBeNull();

      const updated = await updateEntity(created.id, { name: "TEST entity updated" });
      expect(updated?.name).toBe("TEST entity updated");
      expect(await transactionCount()).toBe(before);
    } finally {
      await deleteEntity(created.id);
    }

    expect(await transactionCount()).toBe(before);
  });
});
