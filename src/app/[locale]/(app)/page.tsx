import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContributionPaceChart } from "@/components/charts/contribution-pace-chart";
import { MovementWaterfall } from "@/components/charts/movement-waterfall";
import { PlanTrajectoryChart } from "@/components/charts/plan-trajectory-chart";
import { SpendingChart } from "@/components/charts/spending-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Link } from "@/i18n/navigation";
import {
  DASHBOARD_RANGES,
  parseDashboardRange,
  type DashboardRange,
} from "@/lib/dashboard-range";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { getDashboard } from "@/services/dashboard";

const STATUS_TONE = {
  on_track: "success",
  at_risk: "warning",
  off_track: "danger",
  insufficient_data: "neutral",
  no_plan: "neutral",
} as const;

const RANGE_LABEL = {
  "1m": "range1m",
  "6m": "range6m",
  "1y": "range1y",
  all: "rangeAll",
  plan: "rangePlan",
} as const satisfies Record<DashboardRange, string>;

const COMPOSITION_COLORS = {
  cash: "var(--chart-1)",
  investments: "var(--chart-3)",
  property: "var(--chart-6)",
  liabilities: "var(--negative)",
} as const;

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string | string[] }>;
}) {
  const { locale } = await params;
  const search = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const tp = await getTranslations("planner");
  const range = parseDashboardRange(search.range);
  const data = await getDashboard(range);
  const currency = data.baseCurrency;
  const composition = data.composition.map((item) => ({
    name: t(item.key),
    total: item.value,
    color: COMPOSITION_COLORS[item.key],
  }));
  const next = data.nextGoal;
  const overallLabel =
    data.overallStatus === "no_plan"
      ? t("noPlan")
      : tp(`status.${data.overallStatus}` as never);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")}>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex flex-wrap gap-0.5 rounded-lg border border-line bg-surface p-0.5"
            aria-label={t("timeRange")}
          >
            {DASHBOARD_RANGES.map((option) => (
              <Link
                key={option}
                href={`?range=${option}`}
                aria-current={range === option ? "page" : undefined}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  range === option
                    ? "bg-subtle text-ink"
                    : "text-ink-3 hover:bg-paper hover:text-ink"
                }`}
              >
                {t(RANGE_LABEL[option])}
              </Link>
            ))}
          </div>
          <Link
            href="/planner"
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:bg-paper"
          >
            {t("openPlanner")}
          </Link>
        </div>
      </PageHeader>

      <Card className="border-t-4 border-t-accent">
        <CardContent className="grid gap-5 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink-3">{t("planStatus")}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="text-3xl font-semibold tracking-tight text-ink">
                {overallLabel}
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-ink-2">
              {data.overallStatus === "no_plan"
                ? t("noPlanHint")
                : !next
                  ? t("nextOnTrack")
                  : next.status === "off_track"
                    ? t("nextOffTrack", {
                        name: next.name,
                        gap: formatCurrency(next.gap, currency, locale),
                        amount:
                          next.requiredMonthly === null
                            ? "—"
                            : formatCurrency(next.requiredMonthly, currency, locale),
                      })
                    : next.status === "at_risk"
                      ? t("nextAtRisk", {
                          name: next.name,
                          gap: formatCurrency(next.gap, currency, locale),
                        })
                      : t("nextSetup", { name: next.name })}
            </p>
            <p className="mt-3 text-xs text-ink-3">
              {t("assumptions", {
                return: formatNumber(data.assumptions.expectedReturn * 100, locale),
                inflation: formatNumber(data.assumptions.inflation * 100, locale),
                band: formatNumber(data.assumptions.returnBand * 100, locale),
              })}
            </p>
          </div>
          <div className="text-left lg:text-right">
            <p className="text-xs font-medium text-ink-3">{t("netWorth")}</p>
            <p className="tabular mt-1 text-2xl font-semibold text-ink">
              {formatCurrency(data.plan.netWorth.net, currency, locale)}
            </p>
            <p className="mt-1 text-xs text-ink-3">
              {t("assets")}: {formatCurrency(data.plan.netWorth.assets, currency, locale)}
            </p>
            <p className="text-xs text-ink-3">
              {t("liabilities")}:{" "}
              {formatCurrency(data.plan.netWorth.liabilities, currency, locale)}
            </p>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)] lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle>{t("trajectory")}</CardTitle>
            <p className="mt-1 text-xs text-ink-3">{t("trajectorySubtitle")}</p>
            {data.activeScenario ? (
              <p className="mt-1 text-xs text-ink-3">
                {t("activeScenarioDetail", {
                  name: data.activeScenario.name,
                  return: formatNumber(data.assumptions.expectedReturn * 100, locale),
                  inflation: formatNumber(data.assumptions.inflation * 100, locale),
                  contribution: formatCurrency(
                    data.assumptions.monthlyContribution,
                    currency,
                    locale,
                  ),
                  horizon: data.assumptions.horizonMonths,
                })}
              </p>
            ) : null}
          </CardHeader>
          <CardContent>
            <PlanTrajectoryChart
              data={data.points}
              goals={data.plan.goals}
              currency={currency}
              locale={locale}
            />
            {data.history.length < 2 ? (
              <p className="mt-2 text-xs text-ink-3">{t("historyBuilding")}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("goals")}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.plan.goals.length === 0 ? (
              <div className="space-y-2 py-8 text-center">
                <p className="text-sm text-ink-3">{t("noGoals")}</p>
                <Link href="/planner" className="text-sm font-medium text-accent hover:underline">
                  {t("createPlan")}
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-line/70">
                {data.plan.goals.map((goal) => (
                  <li key={goal.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href="/planner"
                          className="truncate text-sm font-medium text-ink hover:text-accent"
                        >
                          {goal.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-ink-3">
                          {goal.targetDate ? formatDate(goal.targetDate, locale) : "—"}
                        </p>
                      </div>
                      <Badge tone={STATUS_TONE[goal.status]} className="whitespace-nowrap">
                        {tp(`status.${goal.status}`)}
                      </Badge>
                    </div>
                    {goal.status === "insufficient_data" ? (
                      <p className="mt-1 text-xs text-warning">
                        {tp(`reason.${goal.reason ?? "missing_funding"}` as never)}
                      </p>
                    ) : (
                      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        <div>
                          <dt className="text-ink-3">{t("projected")}</dt>
                          <dd className="tabular text-ink-2">
                            {formatCurrency(goal.projected.base, currency, locale)}
                          </dd>
                        </div>
                        <div className="text-right">
                          <dt className="text-ink-3">{t("gap")}</dt>
                          <dd className="tabular text-ink-2">
                            {formatCurrency(goal.gap, currency, locale)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-ink-3">{t("target")}</dt>
                          <dd className="tabular text-ink-2">
                            {formatCurrency(goal.target, currency, locale)}
                          </dd>
                        </div>
                        <div className="text-right">
                          <dt className="text-ink-3">{t("requiredMonthly")}</dt>
                          <dd className="tabular text-ink-2">
                            {goal.requiredMonthly === null
                              ? "—"
                              : formatCurrency(goal.requiredMonthly, currency, locale)}
                          </dd>
                        </div>
                      </dl>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle>{t("movement")}</CardTitle>
            <p className="mt-1 text-xs text-ink-3">{t("movementSubtitle")}</p>
          </CardHeader>
          <CardContent>
            {data.movement ? (
              <MovementWaterfall movement={data.movement} currency={currency} locale={locale} />
            ) : (
              <p className="py-8 text-center text-sm text-ink-3">{t("movementUnavailable")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("contributionPace")}</CardTitle>
            <p className="mt-1 text-xs text-ink-3">{t("contributionSubtitle")}</p>
          </CardHeader>
          <CardContent>
            {data.pace ? (
              <ContributionPaceChart pace={data.pace} currency={currency} locale={locale} />
            ) : (
              <p className="py-8 text-center text-sm text-ink-3">{t("paceUnavailable")}</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.55fr)] lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle>{t("composition")}</CardTitle>
            <p className="mt-1 text-xs text-ink-3">{t("compositionSubtitle")}</p>
          </CardHeader>
          <CardContent>
            {composition.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-3">{t("compositionEmpty")}</p>
            ) : (
              <SpendingChart data={composition} currency={currency} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("thisMonth")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-ink-3">{t("income")}</span>
              <span className="tabular font-medium text-positive">
                {formatCurrency(data.currentMonth.income, currency, locale)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-ink-3">{t("spending")}</span>
              <span className="tabular font-medium text-negative">
                {formatCurrency(data.currentMonth.expenses, currency, locale)}
              </span>
            </div>
            <Link href="/spending" className="inline-block text-sm font-medium text-accent hover:underline">
              {t("viewSpending")}
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
