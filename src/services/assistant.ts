import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  assistantActions,
  assistantConversations,
  assistantMessages,
} from "@/db/schema";
import type { AssistantActionStatus, AssistantRole } from "@/db/schema";
import { transactionCreateSchema } from "@/lib/schemas";
import { createTransaction } from "./transactions";

function titleFrom(message: string): string {
  const clean = message.trim().replace(/\s+/g, " ");
  return (clean.length > 80 ? `${clean.slice(0, 77)}...` : clean) || "New conversation";
}

export async function listConversations() {
  const db = getDb();
  return db
    .select()
    .from(assistantConversations)
    .orderBy(desc(assistantConversations.updatedAt))
    .limit(50);
}

export async function getConversation(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(assistantConversations)
    .where(eq(assistantConversations.id, id))
    .limit(1);
  return row ?? null;
}

export async function createConversation(title: string) {
  const db = getDb();
  const [row] = await db
    .insert(assistantConversations)
    .values({ title: titleFrom(title) })
    .returning();
  return row;
}

export async function touchConversation(id: string) {
  const db = getDb();
  await db
    .update(assistantConversations)
    .set({ updatedAt: new Date() })
    .where(eq(assistantConversations.id, id));
}

export async function addMessage(input: {
  conversationId: string;
  role: AssistantRole;
  content: string;
  metadata?: Record<string, unknown>;
}) {
  const db = getDb();
  const [row] = await db
    .insert(assistantMessages)
    .values({
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      metadata: input.metadata ?? {},
    })
    .returning();
  await touchConversation(input.conversationId);
  return row;
}

export async function listMessages(conversationId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(assistantMessages)
    .where(eq(assistantMessages.conversationId, conversationId))
    .orderBy(assistantMessages.createdAt);
  return rows.slice(-100);
}

export async function createPendingAction(input: {
  conversationId: string;
  type: "create_transaction";
  payload: Record<string, unknown>;
}) {
  const db = getDb();
  const [row] = await db
    .insert(assistantActions)
    .values({
      conversationId: input.conversationId,
      type: input.type,
      payload: input.payload,
    })
    .returning();
  return row;
}

export async function listActions(conversationId: string) {
  const db = getDb();
  return db
    .select()
    .from(assistantActions)
    .where(eq(assistantActions.conversationId, conversationId))
    .orderBy(desc(assistantActions.createdAt));
}

export async function getAction(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(assistantActions)
    .where(eq(assistantActions.id, id))
    .limit(1);
  return row ?? null;
}

async function setActionStatus(id: string, status: AssistantActionStatus) {
  const db = getDb();
  const [row] = await db
    .update(assistantActions)
    .set({ status, resolvedAt: status === "pending" ? null : new Date() })
    .where(eq(assistantActions.id, id))
    .returning();
  return row ?? null;
}

export type ConfirmActionResult =
  | { ok: true; transactionId: string }
  | { ok: false; error: string };

/**
 * Claims a pending action atomically, then applies it. Only one concurrent
 * confirmation can win because the status transition is the lock.
 */
export async function confirmAssistantAction(id: string): Promise<ConfirmActionResult> {
  const db = getDb();
  const [claimed] = await db
    .update(assistantActions)
    .set({ status: "confirmed", resolvedAt: new Date() })
    .where(and(eq(assistantActions.id, id), eq(assistantActions.status, "pending")))
    .returning();

  if (!claimed) {
    return { ok: false, error: "This action is no longer pending." };
  }

  try {
    if (claimed.type !== "create_transaction") {
      await setActionStatus(claimed.id, "pending");
      return { ok: false, error: "Unsupported action type." };
    }

    const parsed = transactionCreateSchema.safeParse(claimed.payload);
    if (!parsed.success) {
      await setActionStatus(claimed.id, "pending");
      return { ok: false, error: "The proposed transaction is invalid." };
    }

    const transaction = await createTransaction(parsed.data);
    return { ok: true, transactionId: transaction.id };
  } catch (error) {
    await setActionStatus(claimed.id, "pending");
    return {
      ok: false,
      error: error instanceof Error ? error.message : "The transaction could not be created.",
    };
  }
}

export async function cancelAssistantAction(id: string) {
  const db = getDb();
  const [row] = await db
    .update(assistantActions)
    .set({ status: "cancelled", resolvedAt: new Date() })
    .where(and(eq(assistantActions.id, id), eq(assistantActions.status, "pending")))
    .returning();
  return row ?? null;
}
