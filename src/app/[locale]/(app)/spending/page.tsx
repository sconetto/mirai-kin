import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { Tabs } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import { formatCurrency, formatDate } from "@/lib/format";
import { overview } from "@/services/analytics";
import { listBudgetsWithSpend } from "@/services/budgets";

export default async function SpendingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("spending");
  const tr = await getTranslations("reports");
  const tc = await getTranslations("common");

  const data = await overview(8);
  const budgets = (await listBudgetsWithSpend()).slice(0, 5);
  const net = Number(data.month.income) - Number(data.month.expenses);

  const tabs = [
    { href: "/spending", label: t("overview"), active: true },
    { href: "/spending/transactions", label: t("transactions"), active: false },
    { href: "/spending/budgets", label: t("budgets"), active: false },
    { href: "/spending/recurring", label: t("recurring"), active: false },
    { href: "/spending/reports", label: t("reports"), active: false },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")}>
        <Link
          href="/import"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
        >
          {t("importCta")}
        </Link>
      </PageHeader>

      <Tabs items={tabs} />

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
