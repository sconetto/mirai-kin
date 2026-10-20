import { getTranslations, setRequestLocale } from "next-intl/server";
import { BUDGET_PERIODS } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { getEnv } from "@/lib/env";
import { formatCurrency, formatDate } from "@/lib/format";
import { listBudgetsWithSpend } from "@/services/budgets";
import { createBudgetAction } from "../actions";

export default async function BudgetsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("budgets");
  const tc = await getTranslations("common");
  const te = await getTranslations("enums");
  const budgets = await listBudgetsWithSpend();
  const baseCurrency = getEnv().BASE_CURRENCY;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-slate-500">{t("subtitle")}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t("new")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createBudgetAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input type="hidden" name="locale" value={locale} />
            <Input name="name" placeholder={tc("name")} required />
            <Select name="periodType" defaultValue="monthly">
              {BUDGET_PERIODS.map((period) => (
                <option key={period} value={period}>
                  {te(`period.${period}`)}
                </option>
              ))}
            </Select>
            <Input name="startDate" type="date" required />
            <Input name="amount" placeholder={t("amount")} inputMode="decimal" required />
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
          {budgets.length === 0 ? (
            <p className="text-sm text-slate-400">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2">{tc("name")}</th>
                    <th className="py-2">{t("period")}</th>
                    <th className="py-2 text-right">{t("amount")}</th>
                    <th className="py-2 text-right">{t("spend")}</th>
                    <th className="py-2 text-right">{t("remaining")}</th>
                    <th className="py-2">{tc("status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {budgets.map((budget) => (
                    <tr key={budget.id}>
                      <td className="py-2 font-medium">{budget.name}</td>
                      <td className="py-2 text-slate-600">
                        {formatDate(budget.startDate, locale)} · {te(`period.${budget.periodType}`)}
                      </td>
                      <td className="py-2 text-right">
                        {formatCurrency(budget.amount, budget.currency, locale)}
                      </td>
                      <td className="py-2 text-right">
                        {formatCurrency(budget.spend, budget.currency, locale)}
                      </td>
                      <td className="py-2 text-right">
                        {formatCurrency(budget.remaining, budget.currency, locale)}
                      </td>
                      <td className="py-2">
                        {budget.overBudget ? (
                          <Badge tone="danger">{t("overBudget")}</Badge>
                        ) : (
                          <Badge tone="success">{t("onTrack")}</Badge>
                        )}
                      </td>
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
