import "dotenv/config";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/db";
import { createAccount, deleteAccount } from "./accounts";
import { assistantConversations, transactions } from "@/db/schema";
import {
  addMessage,
  cancelAssistantAction,
  confirmAssistantAction,
  createConversation,
  createPendingAction,
  listConversations,
  listMessages,
} from "./assistant";

const NOTE = "TEST assistant action";

describe.skipIf(!process.env.DATABASE_URL)("assistant persistence", () => {
  let accountId = "";
  let currency = "BRL";
  let conversationId = "";

  beforeAll(async () => {
    const account = await createAccount({
      name: "TEST assistant account",
      type: "checking",
      currency: "BRL",
      openingBalance: "0",
    });
    accountId = account.id;
    currency = account.currency;
    const conversation = await createConversation("TEST assistant conversation");
    conversationId = conversation.id;
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(transactions).where(eq(transactions.note, NOTE));
    if (conversationId) {
      await db
        .delete(assistantConversations)
        .where(eq(assistantConversations.id, conversationId));
    }
    await deleteAccount(accountId);
    await closeDb();
  });

  function payload() {
    return {
      accountId,
      amount: "-1.5",
      currency,
      recordDate: new Date().toISOString(),
      note: NOTE,
      reviewStatus: "pending" as const,
      summary: "TEST proposed transaction",
    };
  }

  it("stores messages and lists conversations", async () => {
    await addMessage({ conversationId, role: "user", content: "hello" });
    const messages = await listMessages(conversationId);
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe("user");

    const conversations = await listConversations();
    expect(conversations.some((conversation) => conversation.id === conversationId)).toBe(true);
  });

  it("confirms a pending transaction exactly once", async () => {
    const action = await createPendingAction({
      conversationId,
      type: "create_transaction",
      payload: payload(),
    });

    const result = await confirmAssistantAction(action.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const db = getDb();
    const [row] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, result.transactionId));
    expect(row.note).toBe(NOTE);
    expect(Number(row.amount)).toBe(-1.5);

    const second = await confirmAssistantAction(action.id);
    expect(second.ok).toBe(false);
  });

  it("cancels a pending action without writing", async () => {
    const action = await createPendingAction({
      conversationId,
      type: "create_transaction",
      payload: payload(),
    });

    const cancelled = await cancelAssistantAction(action.id);
    expect(cancelled?.status).toBe("cancelled");

    const confirmed = await confirmAssistantAction(action.id);
    expect(confirmed.ok).toBe(false);
  });
});
