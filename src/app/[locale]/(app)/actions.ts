"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getEnv } from "@/lib/env";
import {
  accountCreateSchema,
  budgetCreateSchema,
  debtCreateSchema,
  investmentPositionCreateSchema,
  transactionCreateSchema,
} from "@/lib/schemas";
import { createAccount } from "@/services/accounts";
import { createBudget } from "@/services/budgets";
import { importCsv } from "@/services/csv";
import { createDebt } from "@/services/debts";
import { createPosition } from "@/services/investments";
import { createTransaction } from "@/services/transactions";

function field(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (value === null) return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}

function localeOf(formData: FormData): string {
  return field(formData, "locale") ?? "pt-BR";
}

export async function createAccountAction(formData: FormData) {
  const locale = localeOf(formData);
  const input = accountCreateSchema.parse({
    name: field(formData, "name"),
    type: field(formData, "type"),
    currency: field(formData, "currency") ?? getEnv().BASE_CURRENCY,
    openingBalance: field(formData, "openingBalance") ?? "0",
  });
  await createAccount(input);
  revalidatePath(`/${locale}/accounts`);
  revalidatePath(`/${locale}`);
}

export async function createTransactionAction(formData: FormData) {
  const locale = localeOf(formData);
  const input = transactionCreateSchema.parse({
    accountId: field(formData, "accountId"),
    categoryId: field(formData, "categoryId") ?? null,
    amount: field(formData, "amount"),
    currency: field(formData, "currency"),
    recordDate: field(formData, "recordDate"),
    note: field(formData, "note") ?? null,
    paymentType: field(formData, "paymentType") ?? null,
    counterparty: field(formData, "counterparty") ?? null,
  });
  await createTransaction(input);
  revalidatePath(`/${locale}/transactions`);
  revalidatePath(`/${locale}`);
}

export async function createBudgetAction(formData: FormData) {
  const locale = localeOf(formData);
  const input = budgetCreateSchema.parse({
    name: field(formData, "name"),
    periodType: field(formData, "periodType") ?? "monthly",
    startDate: field(formData, "startDate"),
    amount: field(formData, "amount"),
    currency: field(formData, "currency") ?? getEnv().BASE_CURRENCY,
  });
  await createBudget(input);
  revalidatePath(`/${locale}/budgets`);
}

export async function createPositionAction(formData: FormData) {
  const locale = localeOf(formData);
  const input = investmentPositionCreateSchema.parse({
    accountId: field(formData, "accountId"),
    symbol: field(formData, "symbol"),
    name: field(formData, "name"),
    instrumentType: field(formData, "instrumentType"),
    quantity: field(formData, "quantity"),
    avgCost: field(formData, "avgCost"),
    currency: field(formData, "currency") ?? getEnv().BASE_CURRENCY,
  });
  await createPosition(input);
  revalidatePath(`/${locale}/investments`);
}

export async function createDebtAction(formData: FormData) {
  const locale = localeOf(formData);
  const input = debtCreateSchema.parse({
    name: field(formData, "name"),
    type: field(formData, "type"),
    principal: field(formData, "principal"),
    interestRate: field(formData, "interestRate"),
    term: field(formData, "term"),
    startDate: field(formData, "startDate"),
    amortizationMethod: field(formData, "amortizationMethod"),
    currency: field(formData, "currency") ?? getEnv().BASE_CURRENCY,
    accountId: field(formData, "accountId") ?? null,
  });
  await createDebt(input);
  revalidatePath(`/${locale}/debts`);
}

export async function importCsvAction(formData: FormData) {
  const locale = localeOf(formData);
  const csv = String(formData.get("csv") ?? "");
  const accountId = field(formData, "accountId");
  await importCsv(csv, { accountId });
  revalidatePath(`/${locale}/transactions`);
  redirect(`/${locale}/transactions`);
}
