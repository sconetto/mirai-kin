import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { transactionRules, transactions } from "@/db/schema";
import type { TransactionRule } from "@/db/schema";

export type RuleConditions = {
  counterparty?: { operator: "contains" | "equals"; value: string };
  note?: { operator: "contains" | "equals"; value: string };
  amountMin?: number;
  amountMax?: number;
  accountId?: string;
  paymentType?: string;
  categoryId?: string;
};

export type RuleActions = {
  categoryId?: string | null;
  labelIds?: string[];
  markReviewed?: boolean;
  isDeductible?: boolean;
};

export type RuleDraft = {
  accountId: string;
  amount: string | number;
  counterparty?: string | null;
  note?: string | null;
  paymentType?: string | null;
  categoryId?: string | null;
};

export type RuleMatch = {
  ruleId: string;
  ruleName: string;
  actions: RuleActions;
};

function textMatches(
  actual: string | null | undefined,
  condition: { operator: "contains" | "equals"; value: string } | undefined,
): boolean {
  if (!condition?.value) return true;
  const value = (actual ?? "").toLowerCase();
  const target = condition.value.toLowerCase();
  return condition.operator === "equals" ? value === target : value.includes(target);
}

export function matchRule(draft: RuleDraft, rule: TransactionRule): boolean {
  const conditions = (rule.conditions ?? {}) as RuleConditions;
  if (!textMatches(draft.counterparty, conditions.counterparty)) return false;
  if (!textMatches(draft.note, conditions.note)) return false;
  if (conditions.amountMin !== undefined && Number(draft.amount) < conditions.amountMin) {
    return false;
  }
  if (conditions.amountMax !== undefined && Number(draft.amount) > conditions.amountMax) {
    return false;
  }
  if (conditions.accountId && conditions.accountId !== draft.accountId) return false;
  if (conditions.paymentType && conditions.paymentType !== draft.paymentType) return false;
  if (conditions.categoryId && conditions.categoryId !== draft.categoryId) return false;
  return true;
}

export function firstMatch(draft: RuleDraft, rules: TransactionRule[]): RuleMatch | null {
  for (const rule of [...rules].sort((a, b) => a.priority - b.priority)) {
    if (!rule.enabled) continue;
    if (matchRule(draft, rule)) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        actions: (rule.actions ?? {}) as RuleActions,
      };
    }
  }
  return null;
}

export async function listRules() {
  const db = getDb();
  return db
    .select()
    .from(transactionRules)
    .orderBy(asc(transactionRules.priority), asc(transactionRules.createdAt));
}

export async function createRule(input: {
  name: string;
  priority?: number;
  enabled?: boolean;
  conditions: RuleConditions;
  actions: RuleActions;
}) {
  const db = getDb();
  const [row] = await db
    .insert(transactionRules)
    .values({
      name: input.name,
      priority: input.priority ?? 100,
      enabled: input.enabled ?? true,
      conditions: input.conditions as unknown as Record<string, unknown>,
      actions: input.actions as unknown as Record<string, unknown>,
    })
    .returning();
  return row;
}

export async function updateRule(
  id: string,
  patch: {
    name?: string;
    priority?: number;
    enabled?: boolean;
    conditions?: RuleConditions;
    actions?: RuleActions;
  },
) {
  const db = getDb();
  const [row] = await db
    .update(transactionRules)
    .set({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
      ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
      ...(patch.conditions !== undefined
        ? { conditions: patch.conditions as unknown as Record<string, unknown> }
        : {}),
      ...(patch.actions !== undefined
        ? { actions: patch.actions as unknown as Record<string, unknown> }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(transactionRules.id, id))
    .returning();
  return row ?? null;
}

export async function deleteRule(id: string) {
  const db = getDb();
  const [row] = await db.delete(transactionRules).where(eq(transactionRules.id, id)).returning();
  return row ?? null;
}

async function candidateTransactions(input: {
  from: string;
  to: string;
  accountId?: string;
  limit?: number;
}) {
  const db = getDb();
  const conditions = [
    gte(transactions.recordDate, new Date(`${input.from.slice(0, 10)}T00:00:00.000Z`)),
    lte(transactions.recordDate, new Date(`${input.to.slice(0, 10)}T23:59:59.999Z`)),
    sql`${transactions.reviewStatus} <> 'split'`,
  ];
  if (input.accountId) conditions.push(eq(transactions.accountId, input.accountId));

  return db
    .select()
    .from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.recordDate))
    .limit(input.limit ?? 500);
}

export async function previewRules(input: {
  from: string;
  to: string;
  accountId?: string;
  ruleId?: string;
}) {
  const allRules = await listRules();
  const rules = input.ruleId
    ? allRules.filter((rule) => rule.id === input.ruleId)
    : allRules.filter((rule) => rule.enabled);
  const rows = await candidateTransactions(input);

  const matches = rows.flatMap((row) => {
    const match = firstMatch(
      {
        accountId: row.accountId,
        amount: row.amount,
        counterparty: row.counterparty,
        note: row.note,
        paymentType: row.paymentType,
        categoryId: row.categoryId,
      },
      rules,
    );
    if (!match) return [];
    return [
      {
        transactionId: row.id,
        date: row.recordDate.toISOString().slice(0, 10),
        amount: row.amount,
        currency: row.currency,
        note: row.note,
        ...match,
      },
    ];
  });

  return { total: rows.length, matched: matches.length, matches: matches.slice(0, 50) };
}

export async function applyRules(input: {
  from: string;
  to: string;
  accountId?: string;
  ruleId?: string;
}) {
  const allRules = await listRules();
  const rules = input.ruleId
    ? allRules.filter((rule) => rule.id === input.ruleId)
    : allRules.filter((rule) => rule.enabled);
  const rows = await candidateTransactions(input);
  const db = getDb();
  let updated = 0;

  for (const row of rows) {
    const match = firstMatch(
      {
        accountId: row.accountId,
        amount: row.amount,
        counterparty: row.counterparty,
        note: row.note,
        paymentType: row.paymentType,
        categoryId: row.categoryId,
      },
      rules,
    );
    if (!match) continue;

    const actions = match.actions;
    const labelIds = [...new Set([...(row.labelIds ?? []), ...(actions.labelIds ?? [])])];

    await db
      .update(transactions)
      .set({
        ...(actions.categoryId !== undefined ? { categoryId: actions.categoryId } : {}),
        ...(actions.labelIds !== undefined ? { labelIds } : {}),
        ...(actions.markReviewed ? { reviewStatus: "reviewed" as const } : {}),
        ...(actions.isDeductible !== undefined ? { isDeductible: actions.isDeductible } : {}),
        appliedRuleId: match.ruleId,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, row.id));
    updated += 1;
  }

  return { matched: updated, updated };
}
