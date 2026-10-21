import "dotenv/config";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/db";
import { transactions, transfers } from "@/db/schema";
import { createAccount, deleteAccount } from "./accounts";
import { createTransaction } from "./transactions";
import { createTransfer, pairTransactions, unpairTransfer } from "./transfers";

describe.skipIf(!process.env.DATABASE_URL)("transfers (database)", () => {
  let brlId = "";
  let brl2Id = "";
  let usdId = "";

  beforeAll(async () => {
    const brl = await createAccount({ name: "TEST transfer BRL 1", type: "checking", currency: "BRL", openingBalance: "0" });
    const brl2 = await createAccount({ name: "TEST transfer BRL 2", type: "checking", currency: "BRL", openingBalance: "0" });
    const usd = await createAccount({ name: "TEST transfer USD", type: "checking", currency: "USD", openingBalance: "0" });
    brlId = brl.id;
    brl2Id = brl2.id;
    usdId = usd.id;
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(transactions).where(eq(transactions.note, "TEST transfer"));
    await db.delete(transactions).where(eq(transactions.note, "TEST pair"));
    await db.delete(transfers).where(eq(transfers.note, "TEST transfer"));
    await db.delete(transfers).where(eq(transfers.note, "TEST pair"));
    await deleteAccount(brlId);
    await deleteAccount(brl2Id);
    await deleteAccount(usdId);
    await closeDb();
  });

  it("creates, pairs, and unpairs a same-currency transfer", async () => {
    if (!brlId || !brl2Id) return;
    const result = await createTransfer({
      fromAccountId: brlId,
      toAccountId: brl2Id,
      amount: "100",
      currency: "BRL",
      date: new Date().toISOString(),
      note: "TEST transfer",
    });

    expect(Number(result.transfer.amount)).toBe(100);
    expect(result.transfer.status).toBe("paired");
    expect(Number(result.transfer.rate)).toBe(1);
    expect(Number(result.out.amount)).toBe(-100);
    expect(Number(result.in.amount)).toBe(100);
    expect(result.out.transferId).toBe(result.transfer.id);
    expect(result.in.transferId).toBe(result.transfer.id);

    await unpairTransfer(result.transfer.id);

    const db = getDb();
    const [out] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, result.out.id))
      .limit(1);
    const [inLeg] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, result.in.id))
      .limit(1);
    expect(out.transferId).toBeNull();
    expect(inLeg.transferId).toBeNull();
  });

  it("creates a cross-currency transfer with a rate", async () => {
    if (!brlId || !usdId) return;
    const result = await createTransfer({
      fromAccountId: usdId,
      toAccountId: brlId,
      amount: "100",
      currency: "USD",
      counterAmount: "500",
      counterCurrency: "BRL",
      date: new Date().toISOString(),
      note: "TEST transfer",
    });

    expect(Number(result.transfer.rate)).toBe(5);
    expect(result.transfer.counterCurrency).toBe("BRL");
    expect(Number(result.in.amount)).toBe(500);
    expect(result.in.currency).toBe("BRL");

    await unpairTransfer(result.transfer.id);
  });

  it("pairs two existing transactions manually", async () => {
    if (!brlId || !brl2Id) return;
    const date = new Date().toISOString();
    const out = await createTransaction({
      accountId: brlId,
      amount: "-100",
      currency: "BRL",
      recordDate: date,
      note: "TEST pair",
    });
    const inbound = await createTransaction({
      accountId: brl2Id,
      amount: "100",
      currency: "BRL",
      recordDate: date,
      note: "TEST pair",
    });

    const transfer = await pairTransactions(out.id, inbound.id);
    expect(transfer.status).toBe("paired");
    expect(Number(transfer.amount)).toBe(100);

    const db = getDb();
    const [pairedOut] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, out.id))
      .limit(1);
    expect(pairedOut.transferId).toBe(transfer.id);

    await unpairTransfer(transfer.id);
  });
});
