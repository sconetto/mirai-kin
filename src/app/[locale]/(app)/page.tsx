import { getTranslations, setRequestLocale } from "next-intl/server";
import { SpendingChart } from "@/components/charts/spending-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Link } from "@/i18n/navigation";
import { formatCurrency, formatDate } from "@/lib/format";
import { insightParams } from "@/lib/insight-params";
import { overview } from "@/services/analytics";
import { getEquity } from "@/services/equity";
import { getInsights } from "@/services/insights";

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const tc = await getTranslations("common");
  const ti = await getTranslations("insights");
  const [data, equity] = await Promise.all([overview(), getEquity()]);
  const insights = (await getInsights()).slice(0, 3);
  const topAccounts = [...data.balances]
    .sort((a, b) => Math.abs(Number(b.baseBalance)) - Math.abs(Number(a.baseBalance)))
    .slice(0, 8);
  const spending = data.spendingByCategory.map((row) => ({
    name: row.name,
    total: Number(row.total),
  }));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink-3">{t("subtitle")}</p>
      </header>

      {insights.length > 0 ? (
        <section className="grid gap-2">
          {insights.map((insight) => (
            <Card key={`${insight.type}:${insight.signature}`}>
              <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="flex items-center gap-3">
                  <Badge
                    tone={
                      insight.severity === "critical"
                        ? "danger"
                        : insight.severity === "warning"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {ti(`severity.${insight.severity}`)}
                  </Badge>
                  <p className="text-sm text-ink-2">
                    {ti(
                      insight.type as never,
                      insightParams(insight, locale, data.baseCurrency) as never,
                    )}
                  </p>
                </div>
                <Link
                  href="/insights"
                  className="text-sm font-medium text-accent hover:underline"
                >
                  {tc("view")}
                </Link>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={t("netWorth")}
          value={formatCurrency(equity.net, equity.currency, locale)}
          accent
        />
        <Stat
          label={t("income")}
          value={formatCurrency(data.month.income, data.baseCurrency, locale)}
          tone="positive"
        />
        <Stat
          label={t("expenses")}
          value={formatCurrency(data.month.expenses, data.baseCurrency, locale)}
          tone="negative"
        />
        <Stat label={t("accounts")} value={String(data.balances.length)} mono={false} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle>{t("spendingByCategory")}</CardTitle>
          </CardHeader>
          <CardContent>
            <SpendingChart data={spending} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("accounts")}</CardTitle>
          </CardHeader>
          <CardContent>
            {topAccounts.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-3">{tc("empty")}</p>
            ) : (
              <>
                <ul className="divide-y divide-line/70">
                  {topAccounts.map((account) => (
                    <li key={account.id} className="flex items-center justify-between py-3">
                      <span className="truncate pr-3 text-sm text-ink-2">{account.name}</span>
                      <Money className="shrink-0 text-sm font-medium text-ink">
                        {formatCurrency(account.balance, account.currency, locale)}
                      </Money>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/accounts"
                  className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
                >
                  {tc("view")}
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t("recentTransactions")}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-3">{t("noTransactions")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-ink-3">
                    <th className="pb-3 pr-4">{tc("date")}</th>
                    <th className="pb-3 pr-4">{tc("amount")}</th>
                    <th className="pb-3">{tc("notes")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {data.recent.map((transaction) => (
                    <tr key={transaction.id} className="transition-colors hover:bg-paper">
                      <td className="py-2.5 pr-4 text-ink-2">
                        {formatDate(transaction.recordDate, locale)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Money
                          className="font-medium"
                          tone={Number(transaction.amount) >= 0 ? "positive" : undefined}
                        >
                          {formatCurrency(transaction.amount, transaction.currency, locale)}
                        </Money>
                      </td>
                      <td className="py-2.5 text-ink-3">{transaction.note ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  mono = true,
  accent = false,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
  mono?: boolean;
  accent?: boolean;
}) {
  const color =
    tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "text-ink";
  return (
    <Card className={accent ? "border-t-2 border-t-accent" : undefined}>
      <CardContent className="py-5">
        <p className="text-sm font-medium text-ink-3">{label}</p>
        <p
          className={`mt-2 text-2xl font-semibold tracking-tight ${color} ${mono ? "font-mono tabular" : ""}`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
