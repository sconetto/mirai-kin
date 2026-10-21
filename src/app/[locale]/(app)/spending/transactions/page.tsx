import { getTranslations, setRequestLocale } from "next-intl/server";
import { TransactionReview } from "@/components/transaction-review";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { PAYMENT_TYPES } from "@/db/schema";
import { listAccounts } from "@/services/accounts";
import { listCategories } from "@/services/categories";
import { listTransactions } from "@/services/transactions";
import { createTransactionAction } from "../../actions";

type Search = { status?: string };

export default async function SpendingTransactionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Search>;
}) {
  const { locale } = await params;
  const search = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("transactions");
  const tc = await getTranslations("common");
  const te = await getTranslations("enums");

  const status = search.status === "reviewed" ? "reviewed" : search.status === "all" ? undefined : "pending";
  const [accounts, categories, result] = await Promise.all([
    listAccounts(),
    listCategories(),
    listTransactions({ reviewStatus: status, limit: 100 }),
  ]);

  const tabs = [
    { href: "/spending/transactions", label: t("pending"), active: !search.status || search.status === "pending" },
    { href: "/spending/transactions?status=reviewed", label: t("reviewed"), active: search.status === "reviewed" },
    { href: "/spending/transactions?status=all", label: tc("total"), active: search.status === "all" },
  ];

  const rows = result.transactions.map((transaction) => ({
    id: transaction.id,
    recordDate: transaction.recordDate.toISOString(),
    amount: transaction.amount,
    currency: transaction.currency,
    note: transaction.note,
    counterparty: transaction.counterparty,
    categoryId: transaction.categoryId,
    reviewStatus: transaction.reviewStatus,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Tabs items={tabs} />

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
                    {category.name}
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
          <CardTitle>{t("review")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionReview rows={rows} categories={categories.map(({ id, name }) => ({ id, name }))} locale={locale} />
        </CardContent>
      </Card>
    </div>
  );
}
