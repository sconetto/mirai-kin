import { getTranslations, setRequestLocale } from "next-intl/server";
import { TrendChart } from "@/components/charts/trend-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { Link } from "@/i18n/navigation";
import { formatCurrency, formatDate } from "@/lib/format";
import { getEquity, getNetWorthSeries } from "@/services/equity";
import { recordSnapshotAction } from "../actions";

export default async function EquityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("equity");
  const tc = await getTranslations("common");
  const te = await getTranslations("enums");
  const tn = await getTranslations("nav");

  const equity = await getEquity();
  const snapshots = await getNetWorthSeries();

  const grouped = new Map<string, { kind: "asset" | "liability"; value: number }>();
  for (const component of equity.components) {
    const key = `${component.kind}:${component.type}`;
    const entry = grouped.get(key) ?? { kind: component.kind, value: 0 };
    entry.value += component.value;
    grouped.set(key, entry);
  }
  const maxGroup = Math.max(1, ...[...grouped.values()].map((entry) => entry.value));

  const chartData = snapshots.map((snapshot) => ({
    month: formatDate(snapshot.date, locale),
    net: Number(snapshot.net),
  }));

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")}>
        <form action={recordSnapshotAction}>
          <input type="hidden" name="locale" value={locale} />
          <Button type="submit" variant="secondary">
            {t("snapshot")}
          </Button>
        </form>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label={t("assets")} value={formatCurrency(equity.assets, equity.currency, locale)} tone="positive" />
        <Stat label={t("liabilities")} value={formatCurrency(equity.liabilities, equity.currency, locale)} tone="negative" />
        <Stat label={t("net")} value={formatCurrency(equity.net, equity.currency, locale)} accent />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("composition")}</CardTitle>
          </CardHeader>
          <CardContent>
            {grouped.size === 0 ? (
              <p className="py-8 text-center text-sm text-ink-3">{t("empty")}</p>
            ) : (
              <ul className="space-y-3">
                {[...grouped.entries()].map(([key, entry]) => {
                  const [kind, type] = key.split(":");
                  return (
                    <li key={key}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-ink-2">
                          {te.has(`accountType.${type}`) ? te(`accountType.${type}`) : type}{" "}
                          <span className="text-ink-3">
                            ({kind === "asset" ? t("asset") : t("liability")})
                          </span>
                        </span>
                        <Money className="text-sm text-ink">
                          {formatCurrency(entry.value, equity.currency, locale)}
                        </Money>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-paper">
                        <div
                          className={`h-full rounded-full ${entry.kind === "asset" ? "bg-accent" : "bg-negative"}`}
                          style={{ width: `${(entry.value / maxGroup) * 100}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("trend")}</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-3">{t("noSnapshots")}</p>
            ) : (
              <TrendChart data={chartData} dataKey="net" label={t("net")} />
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t("byCurrency")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-ink-3">
                  <th className="pb-3">{t("currency")}</th>
                  <th className="pb-3 text-right">{t("assets")}</th>
                  <th className="pb-3 text-right">{t("liabilities")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {equity.byCurrency.map((row) => (
                  <tr key={row.currency}>
                    <td className="py-2.5 text-ink-2">{row.currency}</td>
                    <td className="py-2.5 text-right text-positive">
                      {formatCurrency(row.assets, row.currency, locale)}
                    </td>
                    <td className="py-2.5 text-right text-negative">
                      {formatCurrency(row.liabilities, row.currency, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <Link href="/accounts" className="font-medium text-accent hover:underline">
              {tc("account")}
            </Link>
            <Link href="/invest" className="font-medium text-accent hover:underline">
              {tn("invest")}
            </Link>
            <Link href="/debts" className="font-medium text-accent hover:underline">
              {t("liabilities")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
