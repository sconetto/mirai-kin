import { getTranslations, setRequestLocale } from "next-intl/server";
import { SpendingNav } from "@/components/spending-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { Link } from "@/i18n/navigation";
import { formatCurrency, formatDate } from "@/lib/format";
import { insightParams } from "@/lib/insight-params";
import { overview } from "@/services/analytics";
import { listBudgetsWithSpend } from "@/services/budgets";
import { getInsights } from "@/services/insights";

export default async function SpendingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("spending");
  const tr = await getTranslations("reports");
  const tc = await getTranslations("common");
  const ti = await getTranslations("insights");

  const data = await overview(8);
  const budgets = (await listBudgetsWithSpend()).slice(0, 5);
  const tacticalInsights = (await getInsights())
    .filter((insight) =>
      ["savings_rate", "budget_over", "budget_near", "category_spike"].includes(insight.type),
    )
    .slice(0, 3);
  const net = Number(data.month.income) - Number(data.month.expenses);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} tabs={<SpendingNav />}>
        <Link
          href="/import"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-strong"
        >
          {t("importCta")}
        </Link>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat
          label={tr("totalIncome")}
          value={formatCurrency(data.month.income, data.baseCurrency, locale)}
          tone="positive"
        />
        <Stat
          label={tr("totalExpenses")}
          value={formatCurrency(data.month.expenses, data.baseCurrency, locale)}
          tone="negative"
        />
        <Stat label={tr("net")} value={formatCurrency(String(net), data.baseCurrency, locale)} />
      </section>

      {tacticalInsights.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{ti("title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-line/70">
              {tacticalInsights.map((insight) => (
                <li
                  key={`${insight.type}:${insight.signature}`}
                  className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-start gap-2">
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
                  {insight.action ? (
                    <Link
                      href={insight.action.href}
                      className="text-sm font-medium text-accent hover:underline"
                    >
                      {tc("view")}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("topBudgets")}</CardTitle>
          </CardHeader>
          <CardContent>
            {budgets.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-3">{tc("empty")}</p>
            ) : (
              <ul className="space-y-3">
                {budgets.map((budget) => {
                  const amount = Number(budget.amount);
                  const spend = Number(budget.spend);
                  const pct = amount > 0 ? Math.min(100, (spend / amount) * 100) : 0;
                  return (
                    <li key={budget.id}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-ink">{budget.name}</span>
                        <span className="text-ink-3">
                          {formatCurrency(budget.spend, budget.currency, locale)} /{" "}
                          {formatCurrency(budget.amount, budget.currency, locale)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-paper">
                        <div
                          className={`h-full rounded-full ${budget.overBudget ? "bg-negative" : "bg-accent"}`}
                          style={{ width: `${pct}%` }}
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
            <CardTitle>{t("recent")}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-3">{tc("empty")}</p>
            ) : (
              <ul className="divide-y divide-line/70">
                {data.recent.map((transaction) => (
                  <li key={transaction.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink-2">
                        {transaction.note ?? transaction.counterparty ?? "—"}
                      </p>
                      <p className="text-xs text-ink-3">{formatDate(transaction.recordDate, locale)}</p>
                    </div>
                    <Money
                      className="text-sm font-medium"
                      tone={Number(transaction.amount) >= 0 ? "positive" : undefined}
                    >
                      {formatCurrency(transaction.amount, transaction.currency, locale)}
                    </Money>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <div className="flex gap-3 text-sm">
        <Link href="/spending/reports" className="font-medium text-accent hover:underline">
          {t("openReports")}
        </Link>
      </div>
    </div>
  );
}
