import { getDb } from "@/db";
import { goals, transactions } from "@/db/schema";
import {
  getSettingByKey,
  getSettings,
  updateSettings,
} from "./settings";

export const ONBOARDING_STEPS = ["currency", "import", "goal", "explanation"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export function parseOnboardingStep(value: string | undefined): OnboardingStep {
  return (ONBOARDING_STEPS as readonly string[]).includes(value ?? "")
    ? (value as OnboardingStep)
    : "currency";
}

export async function hasFinancialData(): Promise<{
  transactions: boolean;
  goals: boolean;
}> {
  const db = getDb();
  const [transaction, goal] = await Promise.all([
    db.select({ id: transactions.id }).from(transactions).limit(1),
    db.select({ id: goals.id }).from(goals).limit(1),
  ]);
  return { transactions: transaction.length > 0, goals: goal.length > 0 };
}

export async function getOnboardingStatus(): Promise<boolean> {
  const setting = await getSettingByKey("onboardingComplete");
  if (setting) return setting.value === true;
  const data = await hasFinancialData();
  return data.transactions || data.goals;
}

export async function getOnboardingState() {
  const [settings, data, setting] = await Promise.all([
    getSettings(),
    hasFinancialData(),
    getSettingByKey("onboardingComplete"),
  ]);
  return {
    baseCurrency: settings.baseCurrency,
    complete: setting ? setting.value === true : data.transactions || data.goals,
    hasTransactions: data.transactions,
    hasGoals: data.goals,
  };
}

export async function markOnboardingComplete(): Promise<void> {
  await updateSettings({ onboardingComplete: true });
}

export async function resetOnboarding(): Promise<void> {
  await updateSettings({ onboardingComplete: false });
}
