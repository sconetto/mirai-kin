import { getTranslations, setRequestLocale } from "next-intl/server";
import { PAYMENT_TYPES } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { localizedCategoryName } from "@/lib/category-name";
import { formatCurrency, formatDate } from "@/lib/format";
import { listAccounts } from "@/services/accounts";
import { listCategories } from "@/services/categories";
import { listTransactions } from "@/services/transactions";
import { createTransactionAction } from "../actions";
import { PageHeader } from "@/components/ui/page-header";

type Search = { from?: string; to?: string };

export default async function TransactionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Search>;
}) {
  const { locale } = await params;
  const filter = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("transactions");
  const tc = await getTranslations("common");
  const te = await getTranslations("enums");

  const [accounts, categories, result] = await Promise.all([
    listAccounts(),
    listCategories(),
    listTransactions({ from: filter.from, to: filter.to, limit: 100 }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <Card>
        <CardHeader>
          <CardTitle>{t("new")}</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-sm text-ink-3">{tc("empty")}</p>
          ) : (
            <form action={createTransactionAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input type="hidden" name="locale" value={locale} />
              <Select name="accountId" required defaultValue={accounts[0]?.id}>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </option>
                ))}
              </Select>
              <Select name="categoryId" defaultValue="">
                <option value="">{tc("none")}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {localizedCategoryName(category, locale)}
                  </option>
                ))}
              </Select>
              <Input name="amount" placeholder={tc("amount")} inputMode="decimal" required />
              <Input name="recordDate" type="datetime-local" required />
              <Input name="currency" placeholder={`${tc("currency")} (${tc("optional")})`} maxLength={3} />
              <Select name="paymentType" defaultValue="">
                <option value="">{tc("none")}</option>
                {PAYMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {te(`paymentType.${type}`)}
                  </option>
                ))}
              </Select>
              <Input name="counterparty" placeholder={t("counterparty")} />
              <Input name="note" placeholder={tc("notes")} />
              <Button type="submit">{tc("add")}</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
            <label className="text-xs text-ink-3">
              {t("filterFrom")}
              <Input name="from" type="date" defaultValue={filter.from ?? ""} className="mt-1" />
            </label>
            <label className="text-xs text-ink-3">
              {t("filterTo")}
              <Input name="to" type="date" defaultValue={filter.to ?? ""} className="mt-1" />
            </label>
            <Button type="submit" variant="secondary">
              {t("applyFilter")}
            </Button>
          </form>

          {result.transactions.length === 0 ? (
            <p className="text-sm text-ink-3">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs font-medium text-ink-3">
                  <tr>
                    <th className="py-2">{tc("date")}</th>
                    <th className="py-2">{tc("account")}</th>
                    <th className="py-2">{tc("category")}</th>
                    <th className="py-2 text-right">{tc("amount")}</th>
                    <th className="py-2 text-right">{t("baseAmount")}</th>
                    <th className="py-2">{t("paymentType")}</th>
                    <th className="py-2">{tc("notes")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {result.transactions.map((transaction) => {
                    const account = accounts.find((item) => item.id === transaction.accountId);
                    const category = categories.find((item) => item.id === transaction.categoryId);
                    return (
                      <tr key={transaction.id}>
                        <td className="py-2">{formatDate(transaction.recordDate, locale)}</td>
                        <td className="py-2 text-ink-2">{account?.name ?? "—"}</td>
                        <td className="py-2 text-ink-2">{category?.name ?? "—"}</td>
                        <td className="py-2 text-right font-medium">
                          {formatCurrency(transaction.amount, transaction.currency, locale)}
                        </td>
                        <td className="py-2 text-right text-ink-3">
                          {formatCurrency(
                            transaction.baseAmount,
                            transaction.baseCurrency,
                            locale,
                          )}
                        </td>
                        <td className="py-2 text-ink-2">
                          {transaction.paymentType
                            ? te(`paymentType.${transaction.paymentType}`)
                            : "—"}
                        </td>
                        <td className="py-2 text-ink-3">{transaction.note ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
