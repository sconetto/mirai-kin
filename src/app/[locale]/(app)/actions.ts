"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getBaseCurrency, SettingsValidationError, updateSettings } from "@/services/settings";
import {
  accountUpdateSchema,
  budgetCreateSchema,
  debtCreateSchema,
  goalCreateSchema,
  goalUpdateSchema,
  investmentPositionCreateSchema,
  scenarioCreateSchema,
  scenarioUpdateSchema,
  transactionCreateSchema,
} from "@/lib/schemas";
import { updateAccount } from "@/services/accounts";
import { createBudget } from "@/services/budgets";
import { importCsv } from "@/services/csv";
import { createDebt } from "@/services/debts";
import { createBeneficiary, createDocument, updateDocumentStatus } from "@/services/estate";
import { recordSnapshot } from "@/services/equity";
import { createGoal, deleteGoal, GoalValidationError, updateGoal } from "@/services/planner";
import {
  createScenario,
  deleteScenario,
  duplicateScenario,
  getScenario,
  ScenarioValidationError,
  setDefaultScenario,
  updateScenario,
} from "@/services/scenarios";
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
import { pairTransactions, unpairTransfer } from "@/services/transfers";
import { reconcileAccount, setOpeningBalance } from "@/services/reconciliation";
import { applyRules, createRule, deleteRule } from "@/services/rules";
import type { RuleActions, RuleConditions } from "@/services/rules";
import {
  confirmDetection,
  ignoreDetection,
  updateDetection,
} from "@/services/detections";
import { runBackup } from "@/services/backups";
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

const SETTINGS_SECTIONS = ["general", "localization", "appearance", "fx", "assistant", "data"] as const;

export async function saveSettingsAction(formData: FormData) {
  const locale = localeOf(formData);
  const requested = field(formData, "section") ?? "general";
  const section = (SETTINGS_SECTIONS as readonly string[]).includes(requested)
    ? requested
    : "general";

  let error: string | null = null;
  let redirectLocale = locale;
  try {
    if (section === "general") {
      await updateSettings({
        baseCurrency: field(formData, "baseCurrency") ?? "",
        timezone: field(formData, "timezone") ?? "",
        firstDayOfMonth: Number(field(formData, "firstDayOfMonth") ?? 1),
      });
    } else if (section === "localization") {
      const defaultLocale = field(formData, "defaultLocale") === "en" ? "en" : "pt-BR";
      await updateSettings({ defaultLocale });
      redirectLocale = defaultLocale;
      const store = await cookies();
      store.set("NEXT_LOCALE", defaultLocale, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    } else if (section === "appearance") {
      await updateSettings({
        theme: field(formData, "theme") === "light" ? "light" : "system",
      });
    } else if (section === "fx") {
      await updateSettings({ fxProvider: field(formData, "fxProvider") ?? "" });
    } else if (section === "assistant") {
      await updateSettings({
        assistant: {
          enabled: formData.get("assistantEnabled") === "on",
          provider: field(formData, "assistantProvider") ?? "openai-compatible",
          model: field(formData, "assistantModel") ?? "",
          baseUrl: field(formData, "assistantBaseUrl") ?? "",
        },
      });
    } else {
      await updateSettings({
        backup: {
          enabled: formData.get("backupEnabled") === "on",
          schedule: field(formData, "backupSchedule") ?? "0 3 * * *",
          retentionDays: Number(field(formData, "backupRetentionDays") ?? 14),
        },
      });
    }
  } catch (caught) {
    error =
      caught instanceof SettingsValidationError
        ? caught.message
        : "The settings could not be saved.";
  }

  if (error) {
    redirect(`/${locale}/settings?section=${section}&error=${encodeURIComponent(error)}`);
  }

  revalidatePath(`/${locale}/settings`);
  revalidatePath(`/${redirectLocale}/settings`);
  redirect(`/${redirectLocale}/settings?section=${section}&saved=1`);
}

export async function setOpeningBalanceAction(formData: FormData) {
  const locale = localeOf(formData);
  const accountId = field(formData, "accountId");
  const openingBalance = field(formData, "openingBalance");
  if (accountId && openingBalance) {
    await setOpeningBalance(accountId, openingBalance);
  }
  revalidatePath(`/${locale}/accounts`);
  revalidatePath(`/${locale}/data-quality`);
}

export async function reconcileAccountAction(formData: FormData) {
  const locale = localeOf(formData);
  const accountId = field(formData, "accountId");
  const date = field(formData, "date");
  const statementBalance = field(formData, "statementBalance");
  if (accountId && date && statementBalance) {
    await reconcileAccount({
      accountId,
      date,
      statementBalance,
      note: field(formData, "note") ?? null,
    });
  }
  revalidatePath(`/${locale}/accounts`);
  revalidatePath(`/${locale}/reconciliation`);
  revalidatePath(`/${locale}/data-quality`);
}

export async function pairTransferAction(formData: FormData) {
  const locale = localeOf(formData);
  const firstId = field(formData, "firstId");
  const secondId = field(formData, "secondId");
  if (firstId && secondId) {
    await pairTransactions(firstId, secondId);
  }
  revalidatePath(`/${locale}/spending/transactions`);
  revalidatePath(`/${locale}/data-quality`);
}

export async function unpairTransferAction(formData: FormData) {
  const locale = localeOf(formData);
  const transferId = field(formData, "transferId");
  if (transferId) {
    await unpairTransfer(transferId);
  }
  revalidatePath(`/${locale}/spending/transactions`);
  revalidatePath(`/${locale}/data-quality`);
}

export async function updateCreditCardAction(formData: FormData) {
  const locale = localeOf(formData);
  const accountId = field(formData, "accountId");
  if (!accountId) return;

  const closeDay = Number(field(formData, "statementCloseDay") ?? 0);
  const dueDay = Number(field(formData, "dueDay") ?? 0);
  const creditLimit = field(formData, "creditLimit");

  await updateAccount(accountId, {
    statementCloseDay: closeDay >= 1 && closeDay <= 31 ? closeDay : null,
    dueDay: dueDay >= 1 && dueDay <= 31 ? dueDay : null,
    creditLimit: creditLimit ?? null,
  });

  revalidatePath(`/${locale}/reconciliation`);
  revalidatePath(`/${locale}/accounts`);
}

export async function createRuleAction(formData: FormData) {
  const locale = localeOf(formData);
  const name = field(formData, "name");
  if (!name) return;

  const conditions: RuleConditions = {};
  const counterparty = field(formData, "counterparty");
  if (counterparty) conditions.counterparty = { operator: "contains", value: counterparty };
  const amountMin = field(formData, "amountMin");
  const amountMax = field(formData, "amountMax");
  if (amountMin) conditions.amountMin = Number(amountMin);
  if (amountMax) conditions.amountMax = Number(amountMax);
  const accountId = field(formData, "conditionAccountId");
  if (accountId) conditions.accountId = accountId;

  const actions: RuleActions = {};
  const categoryId = field(formData, "categoryId");
  if (categoryId) actions.categoryId = categoryId;
  if (formData.get("markReviewed") === "on") actions.markReviewed = true;
  if (formData.get("isDeductible") === "on") actions.isDeductible = true;

  await createRule({
    name,
    priority: Number(field(formData, "priority") ?? 100),
    conditions,
    actions,
  });
  revalidatePath(`/${locale}/rules`);
}

export async function deleteRuleAction(formData: FormData) {
  const locale = localeOf(formData);
  const id = field(formData, "id");
  if (id) await deleteRule(id);
  revalidatePath(`/${locale}/rules`);
}

export async function applyRulesAction(formData: FormData) {
  const locale = localeOf(formData);
  const from = field(formData, "from");
  const to = field(formData, "to");
  if (from && to) {
    await applyRules({ from, to });
  }
  revalidatePath(`/${locale}/rules`);
  revalidatePath(`/${locale}/spending/transactions`);
}

export async function confirmDetectionAction(formData: FormData) {
  const locale = localeOf(formData);
  const id = field(formData, "id");
  if (id) await confirmDetection(id);
  revalidatePath(`/${locale}/spending/recurring`);
}

export async function ignoreDetectionAction(formData: FormData) {
  const locale = localeOf(formData);
  const id = field(formData, "id");
  if (id) await ignoreDetection(id);
  revalidatePath(`/${locale}/spending/recurring`);
}

export async function updateDetectionAction(formData: FormData) {
  const locale = localeOf(formData);
  const id = field(formData, "id");
  if (!id) return;

  const nextExpected = field(formData, "nextExpected");
  const averageAmount = field(formData, "averageAmount");
  const cadence = field(formData, "cadence");

  await updateDetection(id, {
    ...(nextExpected ? { nextExpected } : {}),
    ...(averageAmount ? { averageAmount: Number(averageAmount) } : {}),
    ...(cadence ? { cadence: cadence as "weekly" | "monthly" | "yearly" } : {}),
  });
  revalidatePath(`/${locale}/spending/recurring`);
}

export async function runBackupAction(formData: FormData) {
  const locale = localeOf(formData);
  await runBackup();
  revalidatePath(`/${locale}/settings`);
}

export async function updateAccountAction(formData: FormData) {
  const locale = localeOf(formData);
  const id = field(formData, "id");
  if (!id) return;

  const type = field(formData, "type") ?? "checking";
  const input = accountUpdateSchema.parse({
    name: field(formData, "name"),
    type,
    currency: field(formData, "currency"),
    openingBalance: field(formData, "openingBalance"),
    ownershipType: field(formData, "ownershipType") ?? "personal",
    assetSubtype:
      type === "investment" || type === "asset"
        ? (field(formData, "assetSubtype") ?? null)
        : null,
    statementCloseDay:
      type === "credit_card" && field(formData, "statementCloseDay")
        ? Number(field(formData, "statementCloseDay"))
        : null,
    dueDay:
      type === "credit_card" && field(formData, "dueDay")
        ? Number(field(formData, "dueDay"))
        : null,
    creditLimit:
      type === "credit_card" ? (field(formData, "creditLimit") ?? null) : null,
  });

  await updateAccount(id, input);
  revalidatePath(`/${locale}/accounts`);
  revalidatePath(`/${locale}`);

  const returnTo = field(formData, "returnTo");
  const target = returnTo && /^\/accounts(?:\?.*)?$/.test(returnTo) ? returnTo : "/accounts";
  redirect(`/${locale}${target}`);
}

export async function setAccountArchivedAction(formData: FormData) {
  const locale = localeOf(formData);
  const id = field(formData, "id");
  if (!id) return;
  await updateAccount(id, { archived: formData.get("archived") === "true" });
  revalidatePath(`/${locale}/accounts`);
  revalidatePath(`/${locale}`);
}

function scenarioFormValues(formData: FormData) {
  const expectedReturn = field(formData, "expectedReturnPct");
  const inflation = field(formData, "inflationPct");
  const monthlyContribution = field(formData, "monthlyContribution");
  const horizonMonths = field(formData, "horizonMonths");
  return {
    ...(expectedReturn ? { expectedReturn: Number(expectedReturn) / 100 } : {}),
    ...(inflation ? { inflation: Number(inflation) / 100 } : {}),
    ...(monthlyContribution ? { monthlyContribution: Number(monthlyContribution) } : {}),
    ...(horizonMonths ? { horizonMonths: Number(horizonMonths) } : {}),
  };
}

function scenarioErrorRedirect(
  locale: string,
  fieldName?: string,
  scenarioId?: string,
): never {
  const params = new URLSearchParams({ error: "validation" });
  if (fieldName) params.set("field", fieldName.split(".").at(-1) ?? fieldName);
  if (scenarioId) params.set("scenarioId", scenarioId);
  redirect(`/${locale}/projections?${params.toString()}`);
}

export async function createScenarioAction(formData: FormData) {
  const locale = localeOf(formData);
  const parsed = scenarioCreateSchema.safeParse({
    name: field(formData, "name"),
    assumptions: scenarioFormValues(formData),
    isDefault: formData.get("isDefault") === "on",
  });
  if (!parsed.success) {
    scenarioErrorRedirect(locale, parsed.error.issues[0]?.path.join("."));
  }
  try {
    await createScenario(parsed.data);
  } catch (error) {
    if (error instanceof ScenarioValidationError) {
      scenarioErrorRedirect(locale, error.fields?.[0]);
    }
    throw error;
  }
  revalidatePath(`/${locale}/projections`);
}

export async function updateScenarioAction(formData: FormData) {
  const locale = localeOf(formData);
  const id = field(formData, "id");
  if (!id) return;
  const current = await getScenario(id);
  const existing =
    current?.assumptions && typeof current.assumptions === "object"
      ? (current.assumptions as Record<string, unknown>)
      : {};
  const parsed = scenarioUpdateSchema.safeParse({
    name: field(formData, "name"),
    assumptions: { ...existing, ...scenarioFormValues(formData) },
  });
  if (!parsed.success) {
    scenarioErrorRedirect(locale, parsed.error.issues[0]?.path.join("."), id);
  }
  try {
    await updateScenario(id, parsed.data);
  } catch (error) {
    if (error instanceof ScenarioValidationError) {
      scenarioErrorRedirect(locale, error.fields?.[0], id);
    }
    throw error;
  }
  revalidatePath(`/${locale}/projections`);
}

export async function duplicateScenarioAction(formData: FormData) {
  const locale = localeOf(formData);
  const id = field(formData, "id");
  if (!id) return;
  try {
    await duplicateScenario(id);
  } catch (error) {
    if (error instanceof ScenarioValidationError) {
      scenarioErrorRedirect(locale, error.fields?.[0], id);
    }
    throw error;
  }
  revalidatePath(`/${locale}/projections`);
}

export async function setDefaultScenarioAction(formData: FormData) {
  const locale = localeOf(formData);
  const id = field(formData, "id");
  if (!id) return;
  await setDefaultScenario(id);
  revalidatePath(`/${locale}/projections`);
}

export async function deleteScenarioAction(formData: FormData) {
  const locale = localeOf(formData);
  const id = field(formData, "id");
  if (!id) return;
  try {
    await deleteScenario(id, field(formData, "replacementDefaultId"));
  } catch (error) {
    if (error instanceof ScenarioValidationError) {
      scenarioErrorRedirect(locale, error.fields?.[0], id);
    }
    throw error;
  }
  revalidatePath(`/${locale}/projections`);
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
    currency: field(formData, "currency") ?? await getBaseCurrency(),
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
    currency: field(formData, "currency") ?? await getBaseCurrency(),
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
    currency: field(formData, "currency") ?? await getBaseCurrency(),
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

  const result = await stageImport({
    source,
    content,
    fileName,
    accountId,
    mapping,
    openingBalance: field(formData, "openingBalance"),
    currentBalance: field(formData, "currentBalance"),
  });
  redirect(`/${locale}/import?batch=${result.batch.id}`);
}

export async function deleteProfileAction(formData: FormData) {
  const locale = localeOf(formData);
  const id = field(formData, "id");
  if (id) await deleteProfile(id);
  revalidatePath(`/${locale}/import`);
}

function goalFormValues(formData: FormData) {
  const allocationAccountIds = formData
    .getAll("allocationAccount")
    .map(String)
    .filter(Boolean);
  const allocations = allocationAccountIds.map((accountId) => ({
    accountId,
    sharePct: field(formData, `share_${accountId}`) ?? 100,
  }));
  const expectedReturn = field(formData, "expectedReturnPct");
  const inflationRate = field(formData, "inflationRatePct");
  const downPaymentPct = field(formData, "downPaymentPct");
  const interestRate = field(formData, "interestRatePct");

  return {
    name: field(formData, "name"),
    type: field(formData, "type") ?? "savings",
    targetAmount: field(formData, "targetAmount") ?? "0",
    targetDate: field(formData, "targetDate") ?? null,
    currency: field(formData, "currency"),
    priority: field(formData, "priority") ?? 1,
    fundingMode: field(formData, "fundingMode") ?? "accounts",
    manualCurrentAmount: field(formData, "manualCurrentAmount") ?? null,
    monthlyContribution: field(formData, "monthlyContribution") ?? "0",
    expectedReturn: expectedReturn ? Number(expectedReturn) / 100 : 0,
    inflationRate: inflationRate ? Number(inflationRate) / 100 : null,
    downPaymentPct: downPaymentPct ? Number(downPaymentPct) : null,
    interestRate: interestRate ? Number(interestRate) / 100 : null,
    allocations,
    notes: field(formData, "notes") ?? null,
  };
}

export async function createGoalAction(formData: FormData) {
  const locale = localeOf(formData);
  const parsed = goalCreateSchema.safeParse(await goalFormValues(formData));
  if (!parsed.success) redirect(`/${locale}/planner?error=validation`);

  try {
    await createGoal(parsed.data);
  } catch (error) {
    if (error instanceof GoalValidationError) {
      redirect(`/${locale}/planner?error=validation`);
    }
    throw error;
  }
  revalidatePath(`/${locale}/planner`);
}

export async function updateGoalAction(formData: FormData) {
  const locale = localeOf(formData);
  const id = field(formData, "id");
  if (!id) return;
  const parsed = goalUpdateSchema.safeParse(await goalFormValues(formData));
  if (!parsed.success) redirect(`/${locale}/planner?error=validation`);

  try {
    await updateGoal(id, parsed.data);
  } catch (error) {
    if (error instanceof GoalValidationError) {
      redirect(`/${locale}/planner?error=validation`);
    }
    throw error;
  }
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
