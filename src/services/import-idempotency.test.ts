import "dotenv/config";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/db";
import { transactions } from "@/db/schema";
import { createAccount, deleteAccount } from "./accounts";
import { createCategory, deleteCategory } from "./categories";
import { createLabel, deleteLabel } from "./labels";
import { createRecurring } from "./projections";
import { createTransaction } from "./transactions";

describe.skipIf(!process.env.DATABASE_URL)("idempotent imports", () => {
  let accountId = "";
  let categoryId = "";
  let labelId = "";

  beforeAll(async () => {
    const account = await createAccount({
      name: `TEST idempotent account ${randomUUID()}`,
      type: "checking",
      currency: "BRL",
    });
    accountId = account.id;
  });

  afterAll(async () => {
    if (labelId) await deleteLabel(labelId);
    if (categoryId) await deleteCategory(categoryId);
    if (accountId) await deleteAccount(accountId);
    await closeDb();
  });

  it("returns the existing account for a repeated import", async () => {
    const name = `TEST idempotent account ${randomUUID()}`;
    const first = await createAccount({ name, type: "checking", currency: "BRL" });
    const second = await createAccount({ name, type: "checking", currency: "BRL" });
    expect(second.id).toBe(first.id);
    await deleteAccount(first.id);
  });

  it("returns the existing category for a repeated import", async () => {
    const name = `TEST idempotent category ${randomUUID()}`;
    const first = await createCategory({ name, type: "expense" });
    const second = await createCategory({ name, type: "expense" });
    categoryId = first.id;
    expect(second.id).toBe(first.id);
  });

  it("returns the existing label for a repeated import", async () => {
    const name = `TEST idempotent label ${randomUUID()}`;
    const first = await createLabel({ name });
    const second = await createLabel({ name });
    labelId = first.id;
    expect(second.id).toBe(first.id);
  });

  it("returns the existing transaction for the same external id", async () => {
    const externalId = `test-${randomUUID()}`;
    const input = {
      accountId,
      amount: "12.34",
      currency: "BRL",
      recordDate: "2026-01-02T12:00:00.000Z",
      note: "TEST idempotent transaction",
      externalSource: "wallet_mcp" as const,
      externalId,
    };
    const first = await createTransaction(input);
    const second = await createTransaction(input);
    expect(second.id).toBe(first.id);

    const rows = await getDb()
      .select()
      .from(transactions)
      .where(eq(transactions.externalId, externalId));
    expect(rows).toHaveLength(1);
  });

  it("adopts a legacy row by its import fingerprint", async () => {
    const externalId = `test-${randomUUID()}`;
    const legacy = await createTransaction({
      accountId,
      amount: "56.78",
      currency: "BRL",
      recordDate: "2026-02-03T12:00:00.000Z",
      note: "TEST legacy transaction",
    });
    const adopted = await createTransaction({
      accountId,
      amount: "56.78",
      currency: "BRL",
      recordDate: "2026-02-03T12:00:00.000Z",
      note: "TEST legacy transaction",
      externalSource: "wallet_mcp",
      externalId,
    });
    expect(adopted.id).toBe(legacy.id);
    expect(adopted.externalId).toBe(externalId);
  });

  it("uses the note when legacy rows share a counterparty and amount", async () => {
    const firstLegacy = await createTransaction({
      accountId,
      amount: "78.90",
      currency: "BRL",
      recordDate: "2026-02-04T12:00:00.000Z",
      counterparty: "TEST shared shop",
      note: "TEST first installment",
    });
    const secondLegacy = await createTransaction({
      accountId,
      amount: "78.90",
      currency: "BRL",
      recordDate: "2026-02-04T12:00:00.000Z",
      counterparty: "TEST shared shop",
      note: "TEST second installment",
    });
    const firstExternal = `test-${randomUUID()}`;
    const secondExternal = `test-${randomUUID()}`;
    const firstAdopted = await createTransaction({
      accountId,
      amount: "78.90",
      currency: "BRL",
      recordDate: "2026-02-04T12:00:00.000Z",
      counterparty: "TEST shared shop",
      note: "TEST first installment",
      externalSource: "wallet_mcp",
      externalId: firstExternal,
    });
    const secondAdopted = await createTransaction({
      accountId,
      amount: "78.90",
      currency: "BRL",
      recordDate: "2026-02-04T12:00:00.000Z",
      counterparty: "TEST shared shop",
      note: "TEST second installment",
      externalSource: "wallet_mcp",
      externalId: secondExternal,
    });
    expect(firstAdopted.id).toBe(firstLegacy.id);
    expect(secondAdopted.id).toBe(secondLegacy.id);
  });

  it("returns the existing recurring transaction for the same external id", async () => {
    const externalId = `test-${randomUUID()}`;
    const input = {
      accountId,
      amount: "-10",
      currency: "BRL",
      frequency: "monthly" as const,
      startDate: "2026-03-05",
      note: "TEST recurring import",
      externalSource: "wallet_mcp" as const,
      externalId,
    };
    const first = await createRecurring(input);
    const second = await createRecurring(input);
    expect(second.id).toBe(first.id);
  });
});
