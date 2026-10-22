import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth";
import { getOnboardingState, ONBOARDING_STEPS, parseOnboardingStep } from "@/services/onboarding";
import {
  completeOnboardingAction,
  saveOnboardingCurrencyAction,
} from "../(app)/actions";

const STEP_LABEL = {
  currency: "stepCurrency",
  import: "stepImport",
  goal: "stepGoal",
  explanation: "stepExplanation",
} as const;

export default async function OnboardingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ step?: string; error?: string }>;
}) {
  const { locale } = await params;
  const search = await searchParams;
  setRequestLocale(locale);
  await requireSession(locale);

  const t = await getTranslations("onboarding");
  const tc = await getTranslations("common");
  const step = parseOnboardingStep(search.step);
  const state = await getOnboardingState();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-5 py-10">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-2">{t("subtitle")}</p>
      </div>

      <ol className="mb-4 grid gap-2 sm:grid-cols-4">
        {ONBOARDING_STEPS.map((key, index) => {
          const active = key === step;
          return (
            <li key={key}>
              <Link
                href={`/onboarding?step=${key}`}
                aria-current={active ? "step" : undefined}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                  active
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line bg-surface text-ink-3 hover:text-ink"
                }`}
              >
                <span className="font-semibold">{index + 1}</span>
                {t(STEP_LABEL[key])}
              </Link>
            </li>
          );
        })}
      </ol>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{t(`step.${step}.title` as never)}</CardTitle>
            <p className="mt-1 text-sm text-ink-2">{t(`step.${step}.body` as never)}</p>
          </div>
          <form action={completeOnboardingAction}>
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit" size="sm" variant="ghost">
              {t("skip")}
            </Button>
          </form>
        </CardHeader>
        <CardContent className="space-y-5">
          {step === "currency" ? (
            <form action={saveOnboardingCurrencyAction} className="space-y-3">
              <input type="hidden" name="locale" value={locale} />
              <label className="block max-w-xs text-xs text-ink-3">
                {t("baseCurrency")}
                <Input
                  name="baseCurrency"
                  defaultValue={state.baseCurrency}
                  maxLength={3}
                  className="mt-1 uppercase"
                  required
                />
              </label>
              {search.error ? <p className="text-xs text-negative">{t("currencyError")}</p> : null}
              <Button type="submit">{t("continue")}</Button>
            </form>
          ) : null}

          {step === "import" ? (
            <div className="space-y-4">
              <p className="rounded-lg border border-line/70 bg-paper px-3 py-2 text-xs text-ink-3">
                {state.hasTransactions ? t("importDetected") : t("importHint")}
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/import"
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-strong"
                >
                  {t("openImport")}
                </Link>
                <Link
                  href="/onboarding?step=goal"
                  className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
                >
                  {t("continue")}
                </Link>
              </div>
            </div>
          ) : null}

          {step === "goal" ? (
            <div className="space-y-4">
              <p className="rounded-lg border border-line/70 bg-paper px-3 py-2 text-xs text-ink-3">
                {state.hasGoals ? t("goalDetected") : t("goalHint")}
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/planner"
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-strong"
                >
                  {t("openPlanner")}
                </Link>
                <Link
                  href="/onboarding?step=explanation"
                  className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
                >
                  {t("continue")}
                </Link>
              </div>
            </div>
          ) : null}

          {step === "explanation" ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-line/70 bg-paper p-4">
                <p className="text-sm font-medium text-ink">{t("planFirstTitle")}</p>
                <p className="mt-1 text-sm text-ink-2">{t("planFirstBody")}</p>
              </div>
              <div className="rounded-lg border border-line/70 bg-paper p-4">
                <p className="text-sm font-medium text-ink">{t("importOnlyTitle")}</p>
                <p className="mt-1 text-sm text-ink-2">{t("importOnlyBody")}</p>
              </div>
              <form action={completeOnboardingAction}>
                <input type="hidden" name="locale" value={locale} />
                <Button type="submit">{t("finish")}</Button>
              </form>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-4 text-xs text-ink-3">
            <span>{t("progress", { current: ONBOARDING_STEPS.indexOf(step) + 1, total: 4 })}</span>
            {step !== "currency" ? (
              <Link href={`/onboarding?step=${ONBOARDING_STEPS[ONBOARDING_STEPS.indexOf(step) - 1]}`}>
                {tc("back")}
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
