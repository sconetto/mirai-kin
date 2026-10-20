import { getTranslations, setRequestLocale } from "next-intl/server";
import { SpendingChart } from "@/components/charts/spending-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { formatCurrency, formatDate } from "@/lib/format";
import { overview } from "@/services/analytics";

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const tc = await getTranslations("common");
  const data = await overview();
  const spending = data.spendingByCategory.map((row) => ({
    name: row.name,
    total: Number(row.total),
  }));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink-3">{t("subtitle")}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={t("netWorth")}
          value={formatCurrency(data.netWorth, data.baseCurrency, locale)}
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

      <section className="grid gap-4 lg:grid-cols-2">
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
            {data.balances.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-3">{tc("empty")}</p>
            ) : (
              <ul className="divide-y divide-line/70">
                {data.balances.map((account) => (
                  <li key={account.id} className="flex items-center justify-between py-3">
                    <span className="text-sm text-ink-2">{account.name}</span>
                    <Money className="text-sm font-medium text-ink">
                      {formatCurrency(account.balance, account.currency, locale)}
                    </Money>
                  </li>
                ))}
              </ul>
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
