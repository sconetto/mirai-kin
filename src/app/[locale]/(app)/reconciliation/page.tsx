import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { formatCurrency, formatDate } from "@/lib/format";
import { getAccount, listAccounts } from "@/services/accounts";
import {
  getCreditCardCycle,
  listReconciliations,
} from "@/services/reconciliation";
import { getToday } from "@/services/settings";
import {
  reconcileAccountAction,
  setOpeningBalanceAction,
  updateCreditCardAction,
} from "../actions";

type Search = { account?: string };

const STATUS_TONE = {
  reconciled: "success",
  discrepancy: "danger",
  open: "neutral",
} as const;

export default async function ReconciliationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Search>;
}) {
  const { locale } = await params;
  const search = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("reconciliation");
  const tc = await getTranslations("common");
  const accounts = await listAccounts();
  const selectedId = search.account ?? accounts[0]?.id;
  const account = selectedId ? await getAccount(selectedId) : null;
  const [history, cycle, today] = await Promise.all([
    account ? listReconciliations(account.id) : Promise.resolve([]),
    account ? getCreditCardCycle(account.id) : Promise.resolve(null),
    getToday(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {accounts.length === 0 ? (
        <Card>
          <CardContent>
            <p className="py-8 text-center text-sm text-ink-3">{tc("empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="pt-5">
              <form method="get" className="flex flex-wrap items-end gap-2">
                <label className="text-xs text-ink-3">
                  {t("selectAccount")}
                  <Select name="account" defaultValue={account?.id} className="mt-1">
                    {accounts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.currency})
                      </option>
                    ))}
                  </Select>
                </label>
                <Button type="submit" variant="secondary">
                  {tc("view")}
                </Button>
              </form>
            </CardContent>
          </Card>

          {account ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {account.name} · {t("openingBalance")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge tone={account.openingBalanceCaptured ? "success" : "warning"}>
                      {account.openingBalanceCaptured ? t("openingCaptured") : t("openingMissing")}
                    </Badge>
                    <span className="text-ink-3">
                      {formatCurrency(account.openingBalance, account.currency, locale)}
                    </span>
                  </div>
                  <form action={setOpeningBalanceAction} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="accountId" value={account.id} />
                    <Input
                      name="openingBalance"
                      defaultValue={account.openingBalance}
                      inputMode="decimal"
                      aria-label={t("openingBalance")}
                      className="h-9 w-40"
                    />
                    <Button type="submit" size="sm" variant="secondary">
                      {t("saveOpening")}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("statement")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form action={reconcileAccountAction} className="grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="accountId" value={account.id} />
                    <label className="text-xs text-ink-3">
                      {t("date")}
                      <Input name="date" type="date" defaultValue={today} className="mt-1" />
                    </label>
                    <label className="text-xs text-ink-3">
                      {t("statementBalance")}
                      <Input name="statementBalance" inputMode="decimal" className="mt-1" required />
                    </label>
                    <label className="text-xs text-ink-3 sm:col-span-2">
                      {t("note")}
                      <Input name="note" className="mt-1" />
                    </label>
                    <div className="sm:col-span-2">
                      <Button type="submit">{t("reconcile")}</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {account.type === "credit_card" ? (
                <Card>
                  <CardHeader>
                    <CardTitle>{t("creditCard")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <form action={updateCreditCardAction} className="grid gap-3 sm:grid-cols-3">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="accountId" value={account.id} />
                      <label className="text-xs text-ink-3">
                        {t("closeDay")}
                        <Input
                          name="statementCloseDay"
                          type="number"
                          min={1}
                          max={31}
                          defaultValue={account.statementCloseDay ?? ""}
                          className="mt-1"
                        />
                      </label>
                      <label className="text-xs text-ink-3">
                        {t("dueDay")}
                        <Input
                          name="dueDay"
                          type="number"
                          min={1}
                          max={31}
                          defaultValue={account.dueDay ?? ""}
                          className="mt-1"
                        />
                      </label>
                      <label className="text-xs text-ink-3">
                        {t("limit")}
                        <Input
                          name="creditLimit"
                          inputMode="decimal"
                          defaultValue={account.creditLimit ?? ""}
                          className="mt-1"
                        />
                      </label>
                      <div className="sm:col-span-3">
                        <Button type="submit" size="sm" variant="secondary">
                          {tc("save")}
                        </Button>
                      </div>
                    </form>

                    {cycle ? (
                      <div className="rounded-lg border border-line bg-paper p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-ink">{t("cycle")}</span>
                          <span className="text-ink-3">
                            {formatDate(cycle.cycleStart, locale)} →{" "}
                            {formatDate(cycle.cycleEnd, locale)}
                          </span>
                        </div>
                        <p className="mt-1 text-ink-2">
                          {t("cycleTotal")}:{" "}
                          {formatCurrency(cycle.total, account.currency, locale)}
                        </p>
                        <p className="text-ink-3">
                          {t("dueDate")}: {formatDate(cycle.dueDate, locale)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-ink-3">{t("noCycle")}</p>
                    )}
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle>{t("history")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {history.length === 0 ? (
                    <p className="py-8 text-center text-sm text-ink-3">{t("empty")}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs font-medium text-ink-3">
                            <th className="pb-3 pr-4">{t("date")}</th>
                            <th className="pb-3 pr-4 text-right">{t("statementCol")}</th>
                            <th className="pb-3 pr-4 text-right">{t("computed")}</th>
                            <th className="pb-3 pr-4 text-right">{t("difference")}</th>
                            <th className="pb-3">{t("status")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line/70">
                          {history.map((row) => (
                            <tr key={row.id}>
                              <td className="py-2 pr-4 text-ink-2">{formatDate(row.date, locale)}</td>
                              <td className="py-2 pr-4 text-right text-ink-2">
                                {formatCurrency(row.statementBalance, account.currency, locale)}
                              </td>
                              <td className="py-2 pr-4 text-right text-ink-3">
                                {formatCurrency(row.computedBalance, account.currency, locale)}
                              </td>
                              <td className="py-2 pr-4 text-right text-ink-3">
                                {formatCurrency(row.difference, account.currency, locale)}
                              </td>
                              <td className="py-2">
                                <Badge tone={STATUS_TONE[row.status] ?? "neutral"}>
                                  {t(row.status)}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
