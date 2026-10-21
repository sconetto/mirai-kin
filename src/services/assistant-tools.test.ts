import "dotenv/config";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/db";
import { assistantActions, assistantConversations, transactions } from "@/db/schema";
import { createAccount, deleteAccount } from "./accounts";
import { createConversation } from "./assistant";
import { buildAssistantTools } from "./assistant/tools";

const NOTE = "TEST tool proposal";

describe.skipIf(!process.env.DATABASE_URL)("assistant tools", () => {
  let conversationId = "";
  let accountId = "";
  let accountName = "";

  beforeAll(async () => {
    const account = await createAccount({
      name: "TEST assistant tools account",
      type: "checking",
      currency: "BRL",
      openingBalance: "0",
    });
    accountId = account.id;
    accountName = account.name;
    const conversation = await createConversation("TEST tools conversation");
    conversationId = conversation.id;
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(assistantConversations).where(eq(assistantConversations.id, conversationId));
    await deleteAccount(accountId);
    await closeDb();
  });

  it("returns grounded overview data", async () => {
    const tools = buildAssistantTools(conversationId);
    const result = (await tools.get_overview.execute!({}, {} as never)) as {
      baseCurrency: string;
      netWorth: string;
      balances: unknown[];
    };
    expect(result.baseCurrency).toBeTruthy();
    expect(result.netWorth).toBeTruthy();
    expect(Array.isArray(result.balances)).toBe(true);
  });

  it("proposes a transaction without writing financial data", async () => {
    const tools = buildAssistantTools(conversationId);
    const result = await tools.propose_transaction.execute!(
      { accountName, amount: -2, date: "2026-10-21", note: NOTE },
      {} as never,
    );

    expect("requiresConfirmation" in result && result.requiresConfirmation).toBe(true);

    const db = getDb();
    const actions = await db
      .select()
      .from(assistantActions)
      .where(eq(assistantActions.conversationId, conversationId));
    expect(actions).toHaveLength(1);
    expect(actions[0].status).toBe("pending");

    const written = await db.select().from(transactions).where(eq(transactions.note, NOTE));
    expect(written).toHaveLength(0);
  });
});
