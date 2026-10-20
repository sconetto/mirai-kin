import { getTranslations, setRequestLocale } from "next-intl/server";
import { TrendChart } from "@/components/charts/trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatMonth } from "@/lib/format";
import { forecast } from "@/services/projections";

export default async function ProjectionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("projections");
  const tc = await getTranslations("common");
  const data = await forecast(12);

  const chartData = data.months.map((month) => ({
    month: formatMonth(month.month, locale),
    net: month.net,
    income: month.income,
    expenses: month.expenses,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-slate-500">{t("subtitle")}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t("net")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart data={chartData} dataKey="net" label={t("net")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("horizon")}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.months.length === 0 ? (
            <p className="text-sm text-slate-400">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2">{t("month")}</th>
                    <th className="py-2 text-right">{t("income")}</th>
                    <th className="py-2 text-right">{t("expenses")}</th>
                    <th className="py-2 text-right">{t("debtPayments")}</th>
                    <th className="py-2 text-right">{t("net")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.months.map((month) => (
                    <tr key={month.month}>
                      <td className="py-2">{formatMonth(month.month, locale)}</td>
                      <td className="py-2 text-right text-emerald-600">
                        {formatCurrency(month.income, data.baseCurrency, locale)}
                      </td>
                      <td className="py-2 text-right text-red-600">
                        {formatCurrency(month.expenses, data.baseCurrency, locale)}
                      </td>
                      <td className="py-2 text-right text-slate-600">
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
          <p className="mt-3 text-xs text-slate-400">{tc("optional")}: recurring transactions + debt schedules</p>
        </CardContent>
      </Card>
    </div>
  );
}
