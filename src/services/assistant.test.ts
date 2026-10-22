import "dotenv/config";
import { randomUUID } from "node:crypto";
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
import {
  listRecentToolCalls,
  listToolCallsForMessages,
  recordAssistantToolCalls,
  sanitizeAuditValue,
} from "./assistant/audit";
import { citationHref } from "@/lib/assistant-citations";

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

  it("records sanitized tool calls with citations", async () => {
    const message = await addMessage({
      conversationId,
      role: "assistant",
      content: "You spent on coffee.",
    });
    const transactionId = randomUUID();
    await recordAssistantToolCalls({
      messageId: message.id,
      conversationId,
      calls: [
        {
          toolCallId: "call-1",
          toolName: "search_transactions",
          input: {
            from: "2026-01-01",
            to: "2026-01-31",
            query: "coffee",
            apiKey: "should-not-be-stored",
          },
          output: {
            count: 1,
            transactions: [
              {
                id: transactionId,
                accountId,
                account: "TEST assistant account",
                date: "2026-01-10",
                amount: "-4.5",
                currency: "BRL",
                note: "coffee",
              },
            ],
          },
        },
      ],
    });

    const [stored] = await listToolCallsForMessages([message.id]);
    expect(stored.toolName).toBe("search_transactions");
    expect(stored.inputSummary.apiKey).toBe("[redacted]");
    expect(stored.citations.some((citation) => citation.id === transactionId)).toBe(true);
    expect(stored.citations.some((citation) => citation.id === accountId)).toBe(true);
    expect(citationHref(stored.citations[0])).toContain("/spending/transactions");

    const recent = await listRecentToolCalls(10);
    expect(recent.some((call) => call.id === stored.id)).toBe(true);
  });

  it("truncates long audit values", () => {
    const sanitized = sanitizeAuditValue({
      note: "a".repeat(400),
      nested: { token: "secret", ok: true },
    }) as Record<string, unknown>;
    expect(String(sanitized.note)).toHaveLength(240);
    expect((sanitized.nested as Record<string, unknown>).token).toBe("[redacted]");
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
