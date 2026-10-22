import { asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  assistantConversations,
  assistantToolCalls,
} from "@/db/schema";
import type { AssistantCitation, AssistantCitationType } from "@/db/schema";

const SENSITIVE_KEY = /(api[_-]?key|token|secret|password|authorization|cookie)/i;
const MAX_STRING = 240;
const MAX_ARRAY = 8;
const MAX_KEYS = 20;
const MAX_DEPTH = 3;

function truncate(value: string): string {
  return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING - 3)}...` : value;
}

function auditError(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const sanitized = sanitizeAuditValue(value);
  return truncate(typeof sanitized === "string" ? sanitized : JSON.stringify(sanitized));
}

/**
 * Keeps the audit trail useful without persisting full datasets or secrets.
 */
export function sanitizeAuditValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return truncate(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (depth >= MAX_DEPTH) return "[truncated]";
  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY).map((item) => sanitizeAuditValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>).slice(0, MAX_KEYS)) {
      result[key] = SENSITIVE_KEY.test(key) ? "[redacted]" : sanitizeAuditValue(entry, depth + 1);
    }
    return result;
  }
  return truncate(String(value));
}

function addCitation(
  citations: AssistantCitation[],
  type: AssistantCitationType,
  id: unknown,
  label: unknown,
): void {
  if (typeof id !== "string" || id.trim().length === 0) return;
  if (citations.some((citation) => citation.type === type && citation.id === id)) return;
  citations.push({
    type,
    id,
    label:
      typeof label === "string" && label.trim().length > 0
        ? truncate(label.trim())
        : type,
  });
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function arrayValue(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(objectValue)
    .filter((item): item is Record<string, unknown> => item !== null);
}

export function citationsForToolCall(
  toolName: string,
  input: unknown,
  output: unknown,
): AssistantCitation[] {
  const citations: AssistantCitation[] = [];
  const inputObject = objectValue(input);

  if (toolName === "get_overview") {
    const data = objectValue(output);
    for (const account of arrayValue(data?.balances)) {
      addCitation(citations, "account", account.id, account.name);
    }
  }

  if (toolName === "search_transactions") {
    const data = objectValue(output);
    for (const transaction of arrayValue(data?.transactions)) {
      addCitation(
        citations,
        "transaction",
        transaction.id,
        [transaction.date, transaction.amount, transaction.currency, transaction.note]
          .filter(Boolean)
          .join(" "),
      );
      addCitation(citations, "account", transaction.accountId, transaction.account);
    }
  }

  if (toolName === "get_planner") {
    const data = objectValue(output);
    for (const goal of arrayValue(data?.goals)) {
      addCitation(citations, "goal", goal.id, goal.name);
    }
  }

  if (toolName === "get_report" && inputObject) {
    const type = typeof inputObject.type === "string" ? inputObject.type : "report";
    const from = typeof inputObject.from === "string" ? inputObject.from : "";
    const to = typeof inputObject.to === "string" ? inputObject.to : "";
    addCitation(citations, "report", `${type}:${from}:${to}`, `${type} ${from}–${to}`);
  }

  if (toolName === "list_budgets") {
    for (const budget of arrayValue(output)) {
      addCitation(citations, "budget", budget.id, budget.name);
    }
  }

  if (toolName === "propose_transaction") {
    const data = objectValue(output);
    addCitation(citations, "account", data?.accountId, inputObject?.accountName);
    addCitation(citations, "category", data?.categoryId, inputObject?.categoryName);
  }

  return citations;
}

export type AssistantToolCallInput = {
  toolCallId: string;
  toolName: string;
  input: unknown;
  output?: unknown;
  error?: unknown;
};

export async function recordAssistantToolCalls(input: {
  messageId: string;
  conversationId: string;
  calls: AssistantToolCallInput[];
}): Promise<number> {
  if (input.calls.length === 0) return 0;
  const db = getDb();
  const rows = input.calls.map((call) => {
    const sanitizedInput = sanitizeAuditValue(call.input);
    return {
      messageId: input.messageId,
      conversationId: input.conversationId,
      toolCallId: call.toolCallId,
      toolName: call.toolName,
      inputSummary:
        objectValue(sanitizedInput) ?? ({ value: sanitizedInput } as Record<string, unknown>),
      outputSummary: call.output === undefined ? null : sanitizeAuditValue(call.output),
      error: auditError(call.error),
      citations: citationsForToolCall(call.toolName, call.input, call.output),
    };
  });
  await db.insert(assistantToolCalls).values(rows);
  return rows.length;
}

export async function listToolCallsForMessages(messageIds: string[]) {
  if (messageIds.length === 0) return [];
  const db = getDb();
  return db
    .select()
    .from(assistantToolCalls)
    .where(inArray(assistantToolCalls.messageId, messageIds))
    .orderBy(asc(assistantToolCalls.createdAt));
}

export async function listRecentToolCalls(limit = 100) {
  const db = getDb();
  return db
    .select({
      id: assistantToolCalls.id,
      messageId: assistantToolCalls.messageId,
      conversationId: assistantToolCalls.conversationId,
      toolCallId: assistantToolCalls.toolCallId,
      toolName: assistantToolCalls.toolName,
      inputSummary: assistantToolCalls.inputSummary,
      outputSummary: assistantToolCalls.outputSummary,
      error: assistantToolCalls.error,
      citations: assistantToolCalls.citations,
      createdAt: assistantToolCalls.createdAt,
      conversationTitle: assistantConversations.title,
    })
    .from(assistantToolCalls)
    .innerJoin(
      assistantConversations,
      eq(assistantToolCalls.conversationId, assistantConversations.id),
    )
    .orderBy(desc(assistantToolCalls.createdAt))
    .limit(limit);
}
