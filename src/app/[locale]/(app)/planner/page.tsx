import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { GOAL_FUNDING_MODES, GOAL_TYPES } from "@/db/schema";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { getPlanner } from "@/services/planner";
import {
  createGoalAction,
  createGoalPledgeAction,
  deleteGoalAction,
  deleteGoalPledgeAction,
  fulfillGoalPledgeAction,
  updateGoalAction,
} from "../actions";

type PlannerAccount = {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
};

const STATUS_TONE = {
  on_track: "success",
  at_risk: "warning",
  off_track: "danger",
  insufficient_data: "neutral",
} as const;

function currentLabelKey(type: string) {
  if (type === "debt") return "paid";
  if (type === "income") return "currentIncome";
  return "current";
}

function targetLabelKey(type: string) {
  if (type === "purchase") return "downPayment";
  if (type === "debt") return "debtBalance";
  if (type === "income") return "targetIncome";
  return "target";
}

function projectedLabelKey(type: string) {
  if (type === "debt") return "projectedBalance";
  if (type === "income") return "projectedIncome";
  return "projected";
}

function requiredLabelKey(type: string) {
  if (type === "debt") return "requiredPayment";
  if (type === "income") return "requiredIncomeIncrease";
  return "requiredMonthly";
}

async function AllocationFields({
  accounts,
  selected,
  locale,
}: {
  accounts: PlannerAccount[];
  selected: Map<string, number>;
  locale: string;
}) {
  const t = await getTranslations("planner");
  return (
    <div className="rounded-lg border border-line/70 bg-paper/60 p-3">
      <p className="text-xs font-medium text-ink-2">{t("fundingAccounts")}</p>
      <p className="mt-1 text-xs text-ink-3">{t("fundingHint")}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => {
          const share = selected.get(account.id);
          return (
            <label
              key={account.id}
              className="flex items-center gap-2 rounded-md bg-surface px-2 py-1.5 text-xs text-ink-2"
            >
              <input
                type="checkbox"
                name="allocationAccount"
                value={account.id}
                defaultChecked={share !== undefined}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              <span className="min-w-0 flex-1 truncate">{account.name}</span>
              <span className="text-ink-3">
                {formatCurrency(account.balance, account.currency, locale)}
              </span>
              <Input
                name={`share_${account.id}`}
                type="number"
                min={0}
                max={100}
                step={1}
                defaultValue={share ?? 100}
                aria-label={`${account.name} ${t("share")}`}
                className="h-7 w-16 px-2 text-right"
              />
              <span className="text-ink-3">%</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

async function GoalFields({
  goal,
  accounts,
  locale,
  currency,
}: {
  goal?: {
    name: string;
    type: string;
    targetAmountOriginal: number;
    targetDate: string | null;
    goalCurrency: string;
    priority: number;
    fundingMode: string;
    manualCurrentAmountOriginal: number | null;
    monthlyContributionOriginal: number;
    expectedReturn: number;
    inflationRate: number;
    downPaymentPct: number | null;
    interestRate: number | null;
    allocations: { accountId: string; sharePct: number }[];
  };
  accounts: PlannerAccount[];
  locale: string;
  currency: string;
}) {
  const t = await getTranslations("planner");
  const selected = new Map(
    (goal?.allocations ?? []).map((item) => [item.accountId, item.sharePct]),
  );

  return (
    <>
      <label className="text-xs text-ink-3">
        {t("name")}
        <Input name="name" defaultValue={goal?.name} required className="mt-1" />
      </label>
      <label className="text-xs text-ink-3">
        {t("type")}
        <Select name="type" defaultValue={goal?.type ?? "savings"} className="mt-1">
          {GOAL_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(type as never)}
            </option>
          ))}
        </Select>
      </label>
      <label className="text-xs text-ink-3">
        {t("target")}
        <Input
          name="targetAmount"
          defaultValue={goal?.targetAmountOriginal}
          inputMode="decimal"
          required
          className="mt-1"
        />
      </label>
      <label className="text-xs text-ink-3">
        {t("date")}
        <Input
          name="targetDate"
          type="date"
          defaultValue={goal?.targetDate ?? ""}
          className="mt-1"
        />
      </label>
      <label className="text-xs text-ink-3">
        {t("currency")}
        <Input
          name="currency"
          defaultValue={goal?.goalCurrency ?? currency}
          maxLength={3}
          className="mt-1"
        />
      </label>
      <label className="text-xs text-ink-3">
        {t("priority")}
        <Input
          name="priority"
          type="number"
          min={1}
          defaultValue={goal?.priority ?? 1}
          className="mt-1"
        />
      </label>
      <label className="text-xs text-ink-3">
        {t("fundingMode")}
        <Select name="fundingMode" defaultValue={goal?.fundingMode ?? "accounts"} className="mt-1">
          {GOAL_FUNDING_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {mode === "manual" ? t("modeManual") : t("modeAccounts")}
            </option>
          ))}
        </Select>
      </label>
      <label className="text-xs text-ink-3">
        {t("manualCurrent")}
        <Input
          name="manualCurrentAmount"
          defaultValue={goal?.manualCurrentAmountOriginal ?? ""}
          inputMode="decimal"
          className="mt-1"
        />
      </label>
      <label className="text-xs text-ink-3">
        {t("monthlyContribution")}
        <Input
          name="monthlyContribution"
          defaultValue={goal?.monthlyContributionOriginal ?? 0}
          inputMode="decimal"
          className="mt-1"
        />
      </label>
      <label className="text-xs text-ink-3">
        {t("expectedReturn")}
        <Input
          name="expectedReturnPct"
          type="number"
          step="0.1"
          defaultValue={goal ? goal.expectedReturn * 100 : 0}
          className="mt-1"
        />
      </label>
      <label className="text-xs text-ink-3">
        {t("inflationRate")}
        <Input
          name="inflationRatePct"
          type="number"
          step="0.1"
          defaultValue={goal ? goal.inflationRate * 100 : 3}
          className="mt-1"
        />
      </label>
      <label className="text-xs text-ink-3">
        {t("downPaymentPct")}
        <Input
          name="downPaymentPct"
          type="number"
          min={0}
          max={100}
          step="1"
          defaultValue={goal?.downPaymentPct ?? 20}
          className="mt-1"
        />
      </label>
      <label className="text-xs text-ink-3">
        {t("interestRate")}
        <Input
          name="interestRatePct"
          type="number"
          step="0.1"
          defaultValue={goal?.interestRate !== null && goal?.interestRate !== undefined ? goal.interestRate * 100 : 0}
          className="mt-1"
        />
      </label>
      <p className="text-xs text-ink-3 sm:col-span-2 lg:col-span-5">{t("goalTypesHint")}</p>
      <div className="sm:col-span-2 lg:col-span-5">
        <AllocationFields accounts={accounts} selected={selected} locale={locale} />
      </div>
    </>
  );
}

export default async function PlannerPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const search = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("planner");
  const tc = await getTranslations("common");
  const planner = await getPlanner();
  const currency = planner.baseCurrency;

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {search.error ? (
        <Card className="border-negative/40 bg-negative-soft">
          <CardContent className="py-3 text-sm text-negative">
            {search.error === "pledge" ? t("pledgeValidationError") : t("validationError")}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={t("netWorth")}
          value={formatCurrency(planner.netWorth.net, currency, locale)}
        />
        <Stat label={t("liquid")} value={formatCurrency(planner.liquid, currency, locale)} />
        <Stat
          label={t("essential")}
          value={formatCurrency(planner.essentialMonthly, currency, locale)}
        />
        <Stat
          label={t("runway")}
          value={t("runwayValue", { months: planner.runwayMonths })}
          mono={false}
          accent
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t("newGoal")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createGoalAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input type="hidden" name="locale" value={locale} />
            <GoalFields accounts={planner.accounts} locale={locale} currency={currency} />
            <div className="sm:col-span-2 lg:col-span-5">
              <Button type="submit">{tc("add")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {planner.goals.length === 0 ? (
        <Card>
          <CardContent>
            <p className="py-10 text-center text-sm text-ink-3">{t("empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {planner.goals.map((goal) => (
            <Card key={goal.id}>
              <CardHeader className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle>{goal.name}</CardTitle>
                  <p className="mt-1 text-xs text-ink-3">
                    {t(goal.type as never)} · {t("priority")} {goal.priority}
                    {goal.targetDate ? ` · ${formatDate(goal.targetDate, locale)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={STATUS_TONE[goal.status]}>{t(`status.${goal.status}`)}</Badge>
                  <form action={deleteGoalAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={goal.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      {tc("delete")}
                    </Button>
                  </form>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-xs text-ink-3">{t(currentLabelKey(goal.type))}</dt>
                    <dd className="tabular mt-0.5 font-medium text-ink">
                      {formatCurrency(goal.current, currency, locale)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-3">{t(targetLabelKey(goal.type))}</dt>
                    <dd className="tabular mt-0.5 font-medium text-ink">
                      {formatCurrency(goal.target, currency, locale)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-3">{t(projectedLabelKey(goal.type))}</dt>
                    <dd className="tabular mt-0.5 font-medium text-ink">
                      {formatCurrency(goal.projected.base, currency, locale)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-3">{t(requiredLabelKey(goal.type))}</dt>
                    <dd className="tabular mt-0.5 font-medium text-ink">
                      {goal.requiredMonthly === null
                        ? "—"
                        : formatCurrency(goal.requiredMonthly, currency, locale)}
                    </dd>
                  </div>
                </dl>
                {goal.type === "purchase" ? (
                  <p className="text-xs text-ink-3">
                    {t("purchaseBreakdown", {
                      price: formatCurrency(goal.purchasePrice ?? 0, currency, locale),
                      downPayment: formatCurrency(goal.downPayment ?? 0, currency, locale),
                      financed: formatCurrency(goal.financedAmount ?? 0, currency, locale),
                    })}
                  </p>
                ) : null}
                {goal.type === "debt" && goal.interestRate !== null ? (
                  <p className="text-xs text-ink-3">
                    {t("interestLine", {
                      rate: formatNumber(goal.interestRate * 100, locale),
                    })}
                  </p>
                ) : null}

                {goal.status === "insufficient_data" ? (
                  <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
                    {t(`reason.${goal.reason ?? "missing_funding"}`)}
                  </p>
                ) : (
                  <div className="space-y-1">
                    <div className="flex justify-between gap-3 text-xs text-ink-3">
                      <span>{t("progress")}</span>
                      <span>
                        {formatNumber(goal.progress, locale)}% · {t("gap")}:{" "}
                        {formatCurrency(goal.gap, currency, locale)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-paper">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${Math.min(100, Math.max(0, goal.progress))}%` }}
                      />
                    </div>
                    <p className="text-xs text-ink-3">
                      {t("range", {
                        conservative: formatCurrency(goal.projected.conservative, currency, locale),
                        optimistic: formatCurrency(goal.projected.optimistic, currency, locale),
                      })}
                    </p>
                  </div>
                )}

                {goal.withdrawalTotal > 0 ? (
                  <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
                    {t("withdrawalWarning", {
                      amount: formatCurrency(goal.withdrawalTotal, currency, locale),
                      count: goal.withdrawals.length,
                    })}
                  </p>
                ) : null}

                <details className="rounded-lg border border-line/70 px-3 py-2">
                  <summary className="cursor-pointer text-sm font-medium text-ink">
                    {t("pledges")}
                    {goal.pledged > 0
                      ? ` · ${formatCurrency(goal.pledged, currency, locale)}`
                      : ""}
                  </summary>
                  <div className="mt-3 space-y-3">
                    {goal.pledges.length === 0 ? (
                      <p className="text-xs text-ink-3">{t("noPledges")}</p>
                    ) : (
                      <ul className="divide-y divide-line/70">
                        {goal.pledges.map((pledge) => (
                          <li
                            key={pledge.id}
                            className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
                          >
                            <div className="min-w-0">
                              <p className="tabular text-sm text-ink">
                                {formatCurrency(pledge.amount, pledge.currency, locale)}
                              </p>
                              <p className="mt-0.5 text-xs text-ink-3">
                                {formatDate(pledge.dueDate, locale)} ·{" "}
                                {t(`pledgeStatus.${pledge.status}`)}
                                {pledge.notes ? ` · ${pledge.notes}` : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              {pledge.status === "open" ? (
                                <form action={fulfillGoalPledgeAction}>
                                  <input type="hidden" name="locale" value={locale} />
                                  <input type="hidden" name="id" value={pledge.id} />
                                  <Button type="submit" size="sm" variant="ghost">
                                    {t("fulfillPledge")}
                                  </Button>
                                </form>
                              ) : null}
                              <form action={deleteGoalPledgeAction}>
                                <input type="hidden" name="locale" value={locale} />
                                <input type="hidden" name="id" value={pledge.id} />
                                <Button type="submit" size="sm" variant="ghost">
                                  {tc("delete")}
                                </Button>
                              </form>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    <form
                      action={createGoalPledgeAction}
                      className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
                    >
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="goalId" value={goal.id} />
                      <label className="text-xs text-ink-3">
                        {t("pledgeAmount")}
                        <Input
                          name="amount"
                          inputMode="decimal"
                          required
                          className="mt-1"
                        />
                      </label>
                      <label className="text-xs text-ink-3">
                        {t("currency")}
                        <Input
                          name="currency"
                          defaultValue={goal.goalCurrency}
                          maxLength={3}
                          className="mt-1"
                        />
                      </label>
                      <label className="text-xs text-ink-3">
                        {t("pledgeDueDate")}
                        <Input name="dueDate" type="date" required className="mt-1" />
                      </label>
                      <label className="text-xs text-ink-3">
                        {t("pledgeNotes")}
                        <Input name="notes" className="mt-1" />
                      </label>
                      <div className="flex items-end">
                        <Button type="submit" size="sm" variant="secondary">
                          {t("addPledge")}
                        </Button>
                      </div>
                    </form>
                    <p className="text-xs text-ink-3">{t("pledgeHint")}</p>
                  </div>
                </details>

                <details className="rounded-lg border border-line/70 px-3 py-2">
                  <summary className="cursor-pointer text-sm font-medium text-ink">
                    {t("editGoal")}
                  </summary>
                  <form
                    action={updateGoalAction}
                    className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
                  >
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={goal.id} />
                    <GoalFields
                      goal={goal}
                      accounts={planner.accounts}
                      locale={locale}
                      currency={currency}
                    />
                    <div className="sm:col-span-2 lg:col-span-5">
                      <Button type="submit" size="sm" variant="secondary">
                        {tc("save")}
                      </Button>
                    </div>
                  </form>
                </details>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-ink-3">{t("note")}</p>
    </div>
  );
}
