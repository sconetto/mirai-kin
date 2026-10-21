import { and, eq, isNull } from "drizzle-orm";
import { getDb } from ".";
import {
  budgets,
  categories,
  recurringTransactions,
  savedReports,
  transactionRules,
  transactions,
} from "./schema";

const MERGES: { source: string; target: string }[] = [
  { source: "Dining", target: "Restaurantes" },
  { source: "Housing", target: "Casa" },
  { source: "Subscriptions", target: "Assinaturas e Streaming" },
  { source: "Health", target: "Saúde e Médicos" },
  { source: "Salário e Faturas", target: "Salary" },
  { source: "Income", target: "Other income" },
  { source: "Others", target: "Other income" },
  { source: "Earnings", target: "Juros e Dividendos" },
  { source: "Rendimentos", target: "Juros e Dividendos" },
  { source: "Carro e Moto", target: "Veículo" },
  { source: "Transport", target: "Veículo" },
  { source: "Comidas e bebidas", target: "Restaurantes" },
  { source: "Gifts", target: "Presentes" },
];

function replaceId(ids: unknown, sourceId: string, targetId: string): string[] | null {
  if (!Array.isArray(ids)) return null;
  if (!ids.includes(sourceId)) return null;
  return [...new Set(ids.map((id) => (id === sourceId ? targetId : id)))];
}

/**
 * Idempotently folds Wallet's mixed/overlapping categories into the curated
 * set, moving every reference first. Safe to run on every boot.
 */
export async function mergeDuplicateCategories(): Promise<void> {
  const db = getDb();

  for (const merge of MERGES) {
    const [source] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.name, merge.source), eq(categories.isSystem, false)))
      .limit(1);
    if (!source) continue;

    const [target] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.name, merge.target), eq(categories.isSystem, false)))
      .limit(1);
    if (!target || target.id === source.id) continue;

    await db.transaction(async (tx) => {
      await tx
        .update(transactions)
        .set({ categoryId: target.id })
        .where(eq(transactions.categoryId, source.id));
      await tx
        .update(recurringTransactions)
        .set({ categoryId: target.id })
        .where(eq(recurringTransactions.categoryId, source.id));

      const rules = await tx.select().from(transactionRules);
      for (const rule of rules) {
        const conditions = { ...(rule.conditions ?? {}) } as Record<string, unknown>;
        const actions = { ...(rule.actions ?? {}) } as Record<string, unknown>;
        let changed = false;
        if (conditions.categoryId === source.id) {
          conditions.categoryId = target.id;
          changed = true;
        }
        if (actions.categoryId === source.id) {
          actions.categoryId = target.id;
          changed = true;
        }
        if (changed) {
          await tx
            .update(transactionRules)
            .set({ conditions, actions, updatedAt: new Date() })
            .where(eq(transactionRules.id, rule.id));
        }
      }

      const budgetRows = await tx.select().from(budgets);
      for (const budget of budgetRows) {
        const next = replaceId(budget.categoryIds, source.id, target.id);
        if (next) {
          await tx.update(budgets).set({ categoryIds: next }).where(eq(budgets.id, budget.id));
        }
      }

      const reportRows = await tx.select().from(savedReports);
      for (const report of reportRows) {
        const config = { ...(report.config as Record<string, unknown>) };
        const next = replaceId(config.categoryIds, source.id, target.id);
        if (next) {
          await tx
            .update(savedReports)
            .set({ config: { ...config, categoryIds: next } })
            .where(eq(savedReports.id, report.id));
        }
      }

      await tx
        .update(categories)
        .set({ parentId: target.id })
        .where(eq(categories.parentId, source.id));
      await tx.delete(categories).where(eq(categories.id, source.id));
    });
  }
}

/**
 * Wallet records transfers under a "Transfer" category but does not always set
 * a payment type. Mark those legs so reports treat them as transfers.
 */
export async function markTransferCategories(): Promise<number> {
  const db = getDb();
  const [transfer] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.name, "Transfer"))
    .limit(1);
  if (!transfer) return 0;

  const rows = await db
    .update(transactions)
    .set({ paymentType: "transfer" })
    .where(
      and(
        eq(transactions.categoryId, transfer.id),
        isNull(transactions.paymentType),
        isNull(transactions.transferId),
      ),
    )
    .returning({ id: transactions.id });
  return rows.length;
}
