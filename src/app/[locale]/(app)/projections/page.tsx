import { getTranslations, setRequestLocale } from "next-intl/server";
import { ScenarioChart } from "@/components/charts/scenario-chart";
import { TrendChart } from "@/components/charts/trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatMonth } from "@/lib/format";
import { compareScenarios, forecast } from "@/services/projections";
import { PageHeader } from "@/components/ui/page-header";

export default async function ProjectionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("projections");
  const tc = await getTranslations("common");
  const data = await forecast(12);
  const comparison = await compareScenarios(12);
  const [baseScenario, optimisticScenario, pessimisticScenario] = comparison.scenarios;
  const scenarioChart = baseScenario.months.map((month, index) => ({
    month: formatMonth(month.month, locale),
    base: month.cumulative,
    optimistic: optimisticScenario.months[index]?.cumulative ?? 0,
    pessimistic: pessimisticScenario.months[index]?.cumulative ?? 0,
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

      <Card>
        <CardHeader>
          <CardTitle>{t("scenarios")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScenarioChart
            data={scenarioChart}
            labels={{
              base: t("base"),
              optimistic: t("optimistic"),
              pessimistic: t("pessimistic"),
            }}
            currency={comparison.baseCurrency}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {comparison.scenarios.map((scenario) => (
              <div key={scenario.key} className="rounded-lg border border-line bg-surface p-3">
                <p className="text-xs font-medium text-ink-3">{t(scenario.key)}</p>
                <p
                  className={`mt-1 text-lg font-semibold ${
                    scenario.totalNet >= 0 ? "text-positive" : "text-negative"
                  }`}
                >
                  {formatCurrency(scenario.totalNet, comparison.baseCurrency, locale)}
                </p>
              </div>
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
          <p className="mt-3 text-xs text-ink-3">{tc("optional")}: recurring transactions + debt schedules</p>
        </CardContent>
      </Card>
    </div>
  );
}
