import { getTranslations, setRequestLocale } from "next-intl/server";
import { ScenarioChart } from "@/components/charts/scenario-chart";
import { TrendChart } from "@/components/charts/trend-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { formatCurrency, formatMonth, formatNumber } from "@/lib/format";
import { comparePlanScenarios } from "@/services/scenarios";
import { forecast } from "@/services/projections";
import {
  createScenarioAction,
  deleteScenarioAction,
  duplicateScenarioAction,
  setDefaultScenarioAction,
  updateScenarioAction,
} from "../actions";

const SCENARIO_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-7)",
];

async function ScenarioFields({
  scenario,
  effective,
  locale,
  errorField,
}: {
  scenario?: {
    name: string;
    overrides: {
      expectedReturn?: number;
      inflation?: number;
      monthlyContribution?: number;
      horizonMonths?: number;
    };
  };
  effective?: {
    expectedReturn: number;
    inflation: number;
    monthlyContribution: number;
    horizonMonths: number;
  };
  locale: string;
  errorField?: string | null;
}) {
  const t = await getTranslations("projections");
  const overrides = scenario?.overrides ?? {};
  const invalid = (name: string) => errorField === name;
  const error = (name: string) =>
    invalid(name) ? <p className="mt-1 text-[11px] text-negative">{t("fieldError")}</p> : null;

  return (
    <>
      <label className="text-xs text-ink-3">
        {t("name")}
        <Input
          name="name"
          defaultValue={scenario?.name}
          required
          aria-invalid={invalid("name")}
          className={`mt-1${invalid("name") ? " border-negative" : ""}`}
        />
        {error("name")}
      </label>
      <label className="text-xs text-ink-3">
        {t("returnPct")}
        <Input
          name="expectedReturnPct"
          type="number"
          step="0.1"
          defaultValue={
            overrides.expectedReturn !== undefined ? overrides.expectedReturn * 100 : ""
          }
          placeholder={effective ? formatNumber(effective.expectedReturn * 100, locale) : ""}
          aria-invalid={invalid("expectedReturn")}
          className={`mt-1${invalid("expectedReturn") ? " border-negative" : ""}`}
        />
        {error("expectedReturn")}
      </label>
      <label className="text-xs text-ink-3">
        {t("inflationPct")}
        <Input
          name="inflationPct"
          type="number"
          step="0.1"
          defaultValue={overrides.inflation !== undefined ? overrides.inflation * 100 : ""}
          placeholder={effective ? formatNumber(effective.inflation * 100, locale) : ""}
          aria-invalid={invalid("inflation")}
          className={`mt-1${invalid("inflation") ? " border-negative" : ""}`}
        />
        {error("inflation")}
      </label>
      <label className="text-xs text-ink-3">
        {t("contribution")}
        <Input
          name="monthlyContribution"
          inputMode="decimal"
          defaultValue={overrides.monthlyContribution ?? ""}
          placeholder={
            effective ? formatNumber(effective.monthlyContribution, locale) : ""
          }
          aria-invalid={invalid("monthlyContribution")}
          className={`mt-1${invalid("monthlyContribution") ? " border-negative" : ""}`}
        />
        {error("monthlyContribution")}
      </label>
      <label className="text-xs text-ink-3">
        {t("horizon")}
        <Input
          name="horizonMonths"
          type="number"
          min={12}
          max={600}
          defaultValue={overrides.horizonMonths ?? ""}
          placeholder={effective ? String(effective.horizonMonths) : ""}
          aria-invalid={invalid("horizonMonths")}
          className={`mt-1${invalid("horizonMonths") ? " border-negative" : ""}`}
        />
        {error("horizonMonths")}
      </label>
    </>
  );
}

export default async function ProjectionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; field?: string; scenarioId?: string }>;
}) {
  const { locale } = await params;
  const search = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("projections");
  const tc = await getTranslations("common");
  const data = await forecast(12);
  const comparison = await comparePlanScenarios();
  const scenarios = comparison.scenarios;
  const createErrorField =
    search.error === "validation" && !search.scenarioId ? search.field : null;
  const scenarioErrorField = (id: string) =>
    search.error === "validation" && search.scenarioId === id ? search.field : null;
  const defaultScenario = scenarios.find((scenario) => scenario.isDefault) ?? scenarios[0];
  const chartScenarios = [
    ...(defaultScenario ? [defaultScenario] : []),
    ...scenarios.filter((scenario) => scenario.id !== defaultScenario?.id).slice(0, 3),
  ];
  const monthKeys = [
    ...new Set(
      chartScenarios.flatMap((scenario) =>
        scenario.trajectory.points.map((point) => point.date.slice(0, 7)),
      ),
    ),
  ].sort();
  const scenarioChart = monthKeys.map((month) => {
    const row: Record<string, string | number | null> = {
      month: formatMonth(month, locale),
    };
    for (const scenario of chartScenarios) {
      const point = scenario.trajectory.points.find(
        (item) => item.date.slice(0, 7) === month,
      );
      row[`scenario_${scenario.id}`] = point?.base ?? null;
    }
    return row;
  });
  const series = chartScenarios.map((scenario, index) => ({
    key: `scenario_${scenario.id}`,
    label: scenario.isDefault ? `${scenario.name} (${t("default")})` : scenario.name,
    color: SCENARIO_COLORS[index % SCENARIO_COLORS.length],
  }));

  const chartData = data.months.map((month) => ({
    month: formatMonth(month.month, locale),
    net: month.net,
    income: month.income,
    expenses: month.expenses,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {search.error ? (
        <Card className="border-negative/40 bg-negative-soft">
          <CardContent className="py-3 text-sm text-negative">
            {t("scenarioValidationError")}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("newScenario")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createScenarioAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <input type="hidden" name="locale" value={locale} />
            <ScenarioFields locale={locale} errorField={createErrorField} />
            <label className="flex items-center gap-2 pt-5 text-xs text-ink-3">
              <input
                type="checkbox"
                name="isDefault"
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              {t("makeDefault")}
            </label>
            <div className="flex items-end sm:col-span-2 lg:col-span-6">
              <Button type="submit" size="sm">
                {tc("add")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("scenarios")}</CardTitle>
          <p className="mt-1 text-xs text-ink-3">
            {defaultScenario
              ? t("activeScenario", { name: defaultScenario.name })
              : t("noScenarios")}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScenarioChart data={scenarioChart} series={series} currency={comparison.baseCurrency} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-medium text-ink-3">
                <tr>
                  <th className="py-2 pr-3">{t("scenario")}</th>
                  <th className="py-2 pr-3 text-right">{t("return")}</th>
                  <th className="py-2 pr-3 text-right">{t("inflation")}</th>
                  <th className="py-2 pr-3 text-right">{t("contribution")}</th>
                  <th className="py-2 pr-3 text-right">{t("horizon")}</th>
                  <th className="py-2 text-right">{t("projectedNet")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {scenarios.map((scenario) => (
                  <tr key={scenario.id}>
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-ink">{scenario.name}</span>
                        {scenario.isDefault ? (
                          <Badge tone="success">{t("default")}</Badge>
                        ) : null}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right text-ink-2">
                      {formatNumber(scenario.assumptions.expectedReturn * 100, locale)}%
                    </td>
                    <td className="py-2.5 pr-3 text-right text-ink-2">
                      {formatNumber(scenario.assumptions.inflation * 100, locale)}%
                    </td>
                    <td className="py-2.5 pr-3 text-right text-ink-2">
                      {formatCurrency(
                        scenario.assumptions.monthlyContribution,
                        comparison.baseCurrency,
                        locale,
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-ink-2">
                      {scenario.assumptions.horizonMonths}
                    </td>
                    <td className="py-2.5 text-right font-medium text-ink">
                      {formatCurrency(scenario.totalNet, comparison.baseCurrency, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3">
            {scenarios.map((scenario) => (
              <details key={scenario.id} className="rounded-lg border border-line/70 px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium text-ink">
                  {t("editScenario", { name: scenario.name })}
                </summary>
                <form action={updateScenarioAction} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={scenario.id} />
                  <ScenarioFields
                    scenario={scenario}
                    effective={scenario.assumptions}
                    locale={locale}
                    errorField={scenarioErrorField(scenario.id)}
                  />
                  <div className="flex items-end gap-2 pt-1">
                    <Button type="submit" size="sm" variant="secondary">
                      {tc("save")}
                    </Button>
                  </div>
                </form>
                <p className="mt-2 text-[11px] text-ink-3">{t("inheritHint")}</p>
                <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-line/70 pt-3">
                  {!scenario.isDefault ? (
                    <form action={setDefaultScenarioAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={scenario.id} />
                      <Button type="submit" size="sm" variant="ghost">
                        {t("setDefault")}
                      </Button>
                    </form>
                  ) : null}
                  <form action={duplicateScenarioAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={scenario.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      {t("duplicate")}
                    </Button>
                  </form>
                  <form action={deleteScenarioAction} className="flex items-end gap-2">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={scenario.id} />
                    {scenario.isDefault && scenarios.length > 1 ? (
                      <label className="text-xs text-ink-3">
                        {t("replacement")}
                        <select
                          name="replacementDefaultId"
                          required
                          className="mt-1 block h-8 rounded-lg border border-line bg-surface px-2 text-xs text-ink"
                        >
                          <option value="">{t("choose")}</option>
                          {scenarios
                            .filter((item) => item.id !== scenario.id)
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                        </select>
                        {scenarioErrorField(scenario.id) === "replacementDefaultId" ? (
                          <p className="mt-1 text-[11px] text-negative">{t("fieldError")}</p>
                        ) : null}
                      </label>
                    ) : null}
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      disabled={scenarios.length <= 1}
                    >
                      {tc("delete")}
                    </Button>
                  </form>
                </div>
              </details>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("net")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart data={chartData} dataKey="net" label={t("net")} currency={data.baseCurrency} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("horizon")}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.months.length === 0 ? (
            <p className="text-sm text-ink-3">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs font-medium text-ink-3">
                  <tr>
                    <th className="py-2">{t("month")}</th>
                    <th className="py-2 text-right">{t("income")}</th>
                    <th className="py-2 text-right">{t("expenses")}</th>
                    <th className="py-2 text-right">{t("debtPayments")}</th>
                    <th className="py-2 text-right">{t("net")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {data.months.map((month) => (
                    <tr key={month.month}>
                      <td className="py-2">{formatMonth(month.month, locale)}</td>
                      <td className="py-2 text-right text-positive">
                        {formatCurrency(month.income, data.baseCurrency, locale)}
                      </td>
                      <td className="py-2 text-right text-negative">
                        {formatCurrency(month.expenses, data.baseCurrency, locale)}
                      </td>
                      <td className="py-2 text-right text-ink-2">
                        {formatCurrency(month.debtPayments, data.baseCurrency, locale)}
                      </td>
                      <td className="py-2 text-right font-medium">
                        {formatCurrency(month.net, data.baseCurrency, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-ink-3">
            {tc("optional")}: recurring transactions + debt schedules
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
