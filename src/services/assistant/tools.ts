import { tool } from "ai";
import { z } from "@/lib/zod";
import { overview } from "@/services/analytics";
import { listAccounts } from "@/services/accounts";
import { listBudgetsWithSpend } from "@/services/budgets";
import { listCategories } from "@/services/categories";
import { getInsights } from "@/services/insights";
import { getPlanner } from "@/services/planner";
import { forecast } from "@/services/projections";
import { getReport } from "@/services/reports";
import type { ReportType } from "@/services/reports";
import { listTransactions } from "@/services/transactions";
import { transactionCreateSchema } from "@/lib/schemas";
import { createPendingAction } from "@/services/assistant";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .describe("ISO date, e.g. 2026-01-31");

function last90Days() {
  const to = new Date();
  const from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate() - 90));
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

async function resolveAccount(name: string) {
  const accounts = await listAccounts();
  const needle = name.trim().toLowerCase();
  const exact = accounts.find((account) => account.name.toLowerCase() === needle);
  const partial = accounts.find((account) => account.name.toLowerCase().includes(needle));
  return { account: exact ?? partial ?? null, accounts };
}

async function resolveCategory(name: string) {
  const categories = await listCategories();
  const needle = name.trim().toLowerCase();
  const matches = categories.filter((category) => category.name.toLowerCase().includes(needle));
  return { category: matches[0] ?? null, categories, matches };
}

export function buildAssistantTools(conversationId: string) {
  return {
    get_overview: tool({
      description:
        "Current financial overview: net worth, this month's income and expenses, account balances, and top spending categories. Use this first for broad 'how am I doing' questions.",
      inputSchema: z.object({}),
      execute: async () => {
        const data = await overview();
        return {
          baseCurrency: data.baseCurrency,
          netWorth: data.netWorth,
          month: data.month,
          balances: data.balances.map((account) => ({
            name: account.name,
            type: account.type,
            currency: account.currency,
            balance: account.balance,
            baseBalance: account.baseBalance,
          })),
          topSpending: data.spendingByCategory.slice(0, 8),
        };
      },
    }),

    get_report: tool({
      description:
        "Aggregated report for a date range. Types: cashflow (income/expenses/net), income, expenses, transfers, breakdown (by category). Returns base-currency summary and period rows.",
      inputSchema: z.object({
        type: z.enum(["cashflow", "income", "expenses", "transfers", "breakdown"]),
        from: isoDate,
        to: isoDate,
      }),
      execute: async (input) => {
        const report = await getReport({
          type: input.type as ReportType,
          from: input.from,
          to: input.to,
        });
        return {
          type: report.type,
          from: report.from,
          to: report.to,
          currency: report.currency,
          summary: report.summary,
          rowCount: report.rows.length,
          rows: report.rows.slice(0, 24),
        };
      },
    }),

    search_transactions: tool({
      description:
        "Search reviewed transactions in a date range. Optionally filter by account name, category name, or text in the note/counterparty.",
      inputSchema: z.object({
        from: isoDate.optional(),
        to: isoDate.optional(),
        accountName: z.string().optional(),
        categoryName: z.string().optional(),
        query: z.string().optional().describe("Text to match in note or counterparty"),
        limit: z.number().int().min(1).max(50).optional(),
      }),
      execute: async (input) => {
        const range = last90Days();
        const from = input.from ?? range.from;
        const to = input.to ?? range.to;
        const limit = input.limit ?? 20;

        let accountId: string | undefined;
        if (input.accountName) {
          const resolved = await resolveAccount(input.accountName);
          if (!resolved.account) {
            return {
              error: `Account "${input.accountName}" was not found.`,
              availableAccounts: resolved.accounts.map((account) => account.name),
            };
          }
          accountId = resolved.account.id;
        }

        let categoryId: string | undefined;
        if (input.categoryName) {
          const resolved = await resolveCategory(input.categoryName);
          if (!resolved.category) {
            return {
              error: `Category "${input.categoryName}" was not found.`,
              availableCategories: resolved.categories.map((category) => category.name),
            };
          }
          categoryId = resolved.category.id;
        }

        const [accounts, categories, result] = await Promise.all([
          listAccounts(),
          listCategories(),
          listTransactions({ from, to, accountId, categoryId, limit: 100 }),
        ]);
        const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
        const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
        const needle = input.query?.trim().toLowerCase();

        const transactions = result.transactions
          .filter((transaction) => {
            if (!needle) return true;
            return (
              transaction.note?.toLowerCase().includes(needle) ||
              transaction.counterparty?.toLowerCase().includes(needle)
            );
          })
          .slice(0, limit)
          .map((transaction) => ({
            date: transaction.recordDate.toISOString().slice(0, 10),
            amount: transaction.amount,
            currency: transaction.currency,
            account: accountNames.get(transaction.accountId) ?? transaction.accountId,
            category: transaction.categoryId
              ? (categoryNames.get(transaction.categoryId) ?? null)
              : null,
            note: transaction.note,
            counterparty: transaction.counterparty,
            reviewStatus: transaction.reviewStatus,
          }));

        return { from, to, count: transactions.length, transactions };
      },
    }),

    list_budgets: tool({
      description: "List budgets with their limit, spend, remaining amount, and over-budget flag.",
      inputSchema: z.object({}),
      execute: async () => {
        const budgets = await listBudgetsWithSpend();
        return budgets.map((budget) => ({
          name: budget.name,
          periodType: budget.periodType,
          startDate: budget.startDate,
          endDate: budget.endDate,
          currency: budget.currency,
          amount: budget.amount,
          spend: budget.spend,
          remaining: budget.remaining,
          overBudget: budget.overBudget,
        }));
      },
    }),

    get_insights: tool({
      description:
        "Deterministic insights about savings rate, budget variance, category spikes, recurring bills, debt, allocation drift, net worth, and cash-flow risk.",
      inputSchema: z.object({}),
      execute: async () => {
        const insights = await getInsights();
        return insights.map((insight) => ({
          type: insight.type,
          severity: insight.severity,
          data: insight.data,
          action: insight.action,
        }));
      },
    }),

    get_forecast: tool({
      description:
        "Deterministic cash-flow forecast from recurring transactions and debt schedules, in the base currency.",
      inputSchema: z.object({
        months: z.number().int().min(1).max(24).optional(),
      }),
      execute: async (input) => {
        const data = await forecast(input.months ?? 6);
        return {
          baseCurrency: data.baseCurrency,
          horizonMonths: data.horizonMonths,
          months: data.months,
        };
      },
    }),

    get_planner: tool({
      description:
        "Financial plan status: goals with progress/priority, liquid balance, essential monthly spending, and emergency runway in months.",
      inputSchema: z.object({}),
      execute: async () => {
        const planner = await getPlanner();
        return {
          liquid: planner.liquid,
          essentialMonthly: planner.essentialMonthly,
          runwayMonths: planner.runwayMonths,
          goals: planner.goals.map((goal) => ({
            name: goal.name,
            type: goal.type,
            targetAmount: goal.targetAmount,
            currency: goal.currency,
            targetDate: goal.targetDate,
            priority: goal.priority,
            current: goal.current,
            progress: goal.progress,
          })),
        };
      },
    }),

    propose_transaction: tool({
      description:
        "Propose a manual transaction correction or entry. This does NOT write financial data: it creates a pending action that the user must confirm in the UI. Use only when the user asks to add or correct a transaction.",
      inputSchema: z.object({
        accountName: z.string().describe("Account name, as shown in the app"),
        amount: z
          .number()
          .describe("Negative for expenses, positive for income. Do not use currency symbols."),
        date: isoDate,
        currency: z.string().length(3).optional().describe("ISO currency, e.g. BRL"),
        categoryName: z.string().optional(),
        note: z.string().max(500).optional(),
      }),
      execute: async (input) => {
        if (!Number.isFinite(input.amount) || input.amount === 0) {
          return { error: "Amount must be a non-zero number." };
        }

        const resolvedAccount = await resolveAccount(input.accountName);
        if (!resolvedAccount.account) {
          return {
            error: `Account "${input.accountName}" was not found.`,
            availableAccounts: resolvedAccount.accounts.map((account) => account.name),
          };
        }

        let categoryId: string | null = null;
        let categoryName: string | null = null;
        if (input.categoryName) {
          const resolvedCategory = await resolveCategory(input.categoryName);
          if (!resolvedCategory.category) {
            return {
              error: `Category "${input.categoryName}" was not found.`,
              availableCategories: resolvedCategory.categories.map((category) => category.name),
            };
          }
          categoryId = resolvedCategory.category.id;
          categoryName = resolvedCategory.category.name;
        }

        const currency = (input.currency ?? resolvedAccount.account.currency).toUpperCase();
        const recordDate = new Date(`${input.date}T12:00:00.000Z`);
        if (Number.isNaN(recordDate.getTime())) {
          return { error: "Invalid date. Use YYYY-MM-DD." };
        }

        const summary = `${input.amount} ${currency} in ${resolvedAccount.account.name} on ${input.date}${
          categoryName ? ` (${categoryName})` : ""
        }${input.note ? ` — ${input.note}` : ""}`;

        const payload = {
          accountId: resolvedAccount.account.id,
          categoryId,
          amount: String(input.amount),
          currency,
          recordDate: recordDate.toISOString(),
          note: input.note ?? null,
          reviewStatus: "pending" as const,
          summary,
        };

        const parsed = transactionCreateSchema.safeParse(payload);
        if (!parsed.success) {
          return {
            error: "The transaction proposal is invalid.",
            issues: parsed.error.issues.map((issue) => issue.message),
          };
        }

        const action = await createPendingAction({
          conversationId,
          type: "create_transaction",
          payload,
        });

        return {
          actionId: action.id,
          status: "pending",
          requiresConfirmation: true,
          summary,
          message:
            "The transaction has NOT been created. Tell the user to review and confirm it in the assistant panel.",
        };
      },
    }),
  };
}
