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
import { createBeneficiary, createDocument, updateDocumentStatus } from "@/services/estate";
import { recordSnapshot } from "@/services/equity";
import { createGoal, deleteGoal, updateGoal } from "@/services/planner";
import {
  commitBatch,
  deleteProfile,
  detectMapping,
  discardBatch,
  listProfiles,
  saveProfile,
  stageImport,
} from "@/services/imports";
import type { ImportMapping } from "@/services/imports";
import { acknowledgeInsight } from "@/services/insights";
import { createPosition } from "@/services/investments";
import { deleteSavedReport, saveReport } from "@/services/reports";
import type { ReportConfig } from "@/services/reports";
import { bulkRecategorize, createTransaction, markReviewed } from "@/services/transactions";
import { pairTransactions } from "@/services/transfers";
import type { ImportSource } from "@/db/schema";

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
  redirect(`/${locale}/spending/transactions`);
}

export async function bulkTransactionAction(formData: FormData) {
  const locale = localeOf(formData);
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (ids.length > 0) {
    const intent = field(formData, "intent");
    if (intent === "pair") {
      if (ids.length === 2) {
        await pairTransactions(ids[0], ids[1]);
      }
    } else if (intent === "recategorize") {
      const categoryId = field(formData, "categoryId") ?? null;
      await bulkRecategorize(ids, categoryId, true);
    } else {
      await markReviewed(ids);
    }
  }
  revalidatePath(`/${locale}/spending/transactions`);
  revalidatePath(`/${locale}`);
}

export async function saveReportAction(formData: FormData) {
  const locale = localeOf(formData);
  const name = field(formData, "name");
  if (!name) return;
  const config: ReportConfig = {
    type: (field(formData, "type") ?? "cashflow") as ReportConfig["type"],
    from: field(formData, "from") ?? "",
    to: field(formData, "to") ?? "",
    comparison: field(formData, "comparison") === "1",
  };
  await saveReport(name, config);
  revalidatePath(`/${locale}/spending/reports`);
}

export async function deleteReportAction(formData: FormData) {
  const locale = localeOf(formData);
  const id = field(formData, "id");
  if (id) await deleteSavedReport(id);
  revalidatePath(`/${locale}/spending/reports`);
}

export async function acknowledgeInsightAction(formData: FormData) {
  const locale = localeOf(formData);
  const type = field(formData, "type");
  const signature = field(formData, "signature");
  if (type && signature) {
    await acknowledgeInsight(type as never, signature);
  }
  revalidatePath(`/${locale}/insights`);
  revalidatePath(`/${locale}`);
}

export async function recordSnapshotAction(formData: FormData) {
  const locale = localeOf(formData);
  await recordSnapshot();
  revalidatePath(`/${locale}/equity`);
}

export async function stageImportAction(formData: FormData) {
  const locale = localeOf(formData);
  const source = (field(formData, "source") ?? "csv") as ImportSource;
  const accountId = field(formData, "accountId");
  const file = formData.get("file");
  let content = field(formData, "content") ?? "";
  let fileName: string | undefined;

  if (file instanceof File && file.size > 0) {
    content = await file.text();
    fileName = file.name;
  }

  if (!content.trim()) {
    redirect(`/${locale}/import`);
  }

  const saveName = field(formData, "saveProfileName");
  if (saveName && source === "csv") {
    const headers = content.split(/\r?\n/)[0].split(",").map((header) => header.trim());
    await saveProfile(saveName, source, detectMapping(headers) as ImportMapping);
  }

  const profileId = field(formData, "profileId");
  let mapping: ImportMapping | undefined;
  if (profileId) {
    const profiles = await listProfiles();
    const profile = profiles.find((item) => item.id === profileId);
    mapping = (profile?.mapping as ImportMapping | undefined) ?? undefined;
  }

  const result = await stageImport({ source, content, fileName, accountId, mapping });
  redirect(`/${locale}/import?batch=${result.batch.id}`);
}

export async function deleteProfileAction(formData: FormData) {
  const locale = localeOf(formData);
  const id = field(formData, "id");
  if (id) await deleteProfile(id);
  revalidatePath(`/${locale}/import`);
}

export async function createGoalAction(formData: FormData) {
  const locale = localeOf(formData);
  const name = field(formData, "name");
  if (!name) return;
  await createGoal({
    name,
    type: (field(formData, "type") ?? "custom") as never,
    targetAmount: field(formData, "targetAmount") ?? "0",
    targetDate: field(formData, "targetDate") ?? null,
    currency: field(formData, "currency") ?? getEnv().BASE_CURRENCY,
    priority: Number(field(formData, "priority") ?? 1),
  });
  revalidatePath(`/${locale}/planner`);
}

export async function updateGoalAction(formData: FormData) {
  const locale = localeOf(formData);
  const id = field(formData, "id");
  if (!id) return;
  const targetAmount = field(formData, "targetAmount");
  const priority = field(formData, "priority");
  await updateGoal(id, {
    targetAmount: targetAmount ?? undefined,
    targetDate: field(formData, "targetDate") ?? null,
    priority: priority ? Number(priority) : undefined,
  });
  revalidatePath(`/${locale}/planner`);
}

export async function deleteGoalAction(formData: FormData) {
  const locale = localeOf(formData);
  const id = field(formData, "id");
  if (id) await deleteGoal(id);
  revalidatePath(`/${locale}/planner`);
}

export async function createBeneficiaryAction(formData: FormData) {
  const locale = localeOf(formData);
  const name = field(formData, "name");
  if (!name) return;
  await createBeneficiary({
    name,
    relationship: field(formData, "relationship") ?? null,
    sharePct: field(formData, "sharePct") ?? "0",
    notes: field(formData, "notes") ?? null,
  });
  revalidatePath(`/${locale}/estate`);
}

export async function createDocumentAction(formData: FormData) {
  const locale = localeOf(formData);
  const name = field(formData, "name");
  if (!name) return;
  await createDocument({
    name,
    category: field(formData, "category") ?? "other",
    status: field(formData, "status") ?? "missing",
    notes: field(formData, "notes") ?? null,
  });
  revalidatePath(`/${locale}/estate`);
}

export async function updateDocumentStatusAction(formData: FormData) {
  const locale = localeOf(formData);
  const id = field(formData, "id");
  const status = field(formData, "status");
  if (id && status) await updateDocumentStatus(id, status);
  revalidatePath(`/${locale}/estate`);
}

export async function commitImportAction(formData: FormData) {
  const locale = localeOf(formData);
  const batchId = field(formData, "batchId");
  if (!batchId) return;
  const rowIds = formData.getAll("rowIds").map(String).filter(Boolean);
  await commitBatch(batchId, rowIds);
  revalidatePath(`/${locale}/spending/transactions`);
  redirect(`/${locale}/spending/transactions`);
}

export async function discardImportAction(formData: FormData) {
  const locale = localeOf(formData);
  const batchId = field(formData, "batchId");
  if (batchId) await discardBatch(batchId);
  redirect(`/${locale}/import`);
}
