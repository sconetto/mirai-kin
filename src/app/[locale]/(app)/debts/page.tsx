import { getTranslations, setRequestLocale } from "next-intl/server";
import { AMORTIZATION_METHODS, DEBT_TYPES } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { getEnv } from "@/lib/env";
import { formatCurrency, formatDate } from "@/lib/format";
import { getDebtWithSchedule, listDebts } from "@/services/debts";
import { createDebtAction } from "../actions";

export default async function DebtsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("debts");
  const tc = await getTranslations("common");
  const te = await getTranslations("enums");

  const debts = await listDebts();
  const detailed = (
    await Promise.all(debts.map((debt) => getDebtWithSchedule(debt.id)))
  ).filter((debt): debt is NonNullable<typeof debt> => debt !== null);
  const baseCurrency = getEnv().BASE_CURRENCY;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{t("title")}</h1>
        <p className="text-sm text-ink-3">{t("subtitle")}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t("new")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createDebtAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input type="hidden" name="locale" value={locale} />
            <Input name="name" placeholder={tc("name")} required />
            <Select name="type" defaultValue="installment">
              {DEBT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {te(`debtType.${type}`)}
                </option>
              ))}
            </Select>
            <Input name="principal" placeholder={t("principal")} inputMode="decimal" required />
            <Input name="interestRate" placeholder={t("rate")} inputMode="decimal" required />
            <Input name="term" placeholder={t("term")} inputMode="numeric" required />
            <Input name="startDate" type="date" required />
            <Select name="amortizationMethod" defaultValue="price">
              {AMORTIZATION_METHODS.map((method) => (
                <option key={method} value={method}>
                  {te(`amortization.${method}`)}
                </option>
              ))}
            </Select>
            <div className="flex gap-2">
              <Input name="currency" defaultValue={baseCurrency} maxLength={3} />
              <Button type="submit">{tc("add")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {detailed.length === 0 ? (
            <p className="text-sm text-ink-3">{t("empty")}</p>
          ) : (
            <div className="space-y-4">
              {detailed.map((debt) => (
                <details key={debt.id} className="rounded-lg border border-line p-3">
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{debt.name}</span>
                    <span className="text-ink-3">
                      {te(`debtType.${debt.type}`)} · {te(`amortization.${debt.amortizationMethod}`)} ·{" "}
                      {formatCurrency(debt.principal, debt.currency, locale)} · {debt.term}x
                    </span>
                  </summary>

                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="text-left text-xs font-medium text-ink-3">
                        <tr>
                          <th className="py-1">{t("period")}</th>
                          <th className="py-1">{tc("date")}</th>
                          <th className="py-1 text-right">{t("payment")}</th>
                          <th className="py-1 text-right">{t("interest")}</th>
                          <th className="py-1 text-right">{t("balance")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/70">
                        {debt.schedule.map((row) => (
                          <tr key={row.id}>
                            <td className="py-1">{row.periodNumber}</td>
                            <td className="py-1">{formatDate(row.dueDate, locale)}</td>
                            <td className="py-1 text-right">
                              {formatCurrency(row.payment, debt.currency, locale)}
                            </td>
                            <td className="py-1 text-right text-ink-3">
                              {formatCurrency(row.interest, debt.currency, locale)}
                            </td>
                            <td className="py-1 text-right">
                              {formatCurrency(row.balance, debt.currency, locale)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
