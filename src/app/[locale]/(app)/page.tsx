import { getTranslations, setRequestLocale } from "next-intl/server";
import { SpendingChart } from "@/components/charts/spending-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-slate-500">{t("subtitle")}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("netWorth")} value={formatCurrency(data.netWorth, data.baseCurrency, locale)} />
        <Stat
          label={t("income")}
          value={formatCurrency(data.month.income, data.baseCurrency, locale)}
          tone="success"
        />
        <Stat
          label={t("expenses")}
          value={formatCurrency(data.month.expenses, data.baseCurrency, locale)}
          tone="danger"
        />
        <Stat label={t("accounts")} value={String(data.balances.length)} />
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
              <p className="text-sm text-slate-400">{tc("empty")}</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.balances.map((account) => (
                  <li key={account.id} className="flex items-center justify-between py-2 text-sm">
                    <span>{account.name}</span>
                    <span className="font-medium">
                      {formatCurrency(account.balance, account.currency, locale)}
                    </span>
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
            <p className="text-sm text-slate-400">{t("noTransactions")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2">{tc("date")}</th>
                    <th className="py-2">{tc("amount")}</th>
                    <th className="py-2">{tc("notes")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recent.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="py-2">{formatDate(transaction.recordDate, locale)}</td>
                      <td className="py-2 font-medium">
                        {formatCurrency(transaction.amount, transaction.currency, locale)}
                      </td>
                      <td className="py-2 text-slate-500">{transaction.note ?? "—"}</td>
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
}: {
  label: string;
  value: string;
  tone?: "success" | "danger";
}) {
  const color =
    tone === "success" ? "text-emerald-600" : tone === "danger" ? "text-red-600" : "text-slate-900";
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        <p className={`mt-1 text-xl font-semibold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
