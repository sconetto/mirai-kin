import { getTranslations, setRequestLocale } from "next-intl/server";
import { ACCOUNT_TYPES } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { getEnv } from "@/lib/env";
import { formatCurrency } from "@/lib/format";
import { listAccountBalances } from "@/services/accounts";
import { createAccountAction } from "../actions";

export default async function AccountsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("accounts");
  const tc = await getTranslations("common");
  const te = await getTranslations("enums");
  const accounts = await listAccountBalances();
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
          <form action={createAccountAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input type="hidden" name="locale" value={locale} />
            <Input name="name" placeholder={tc("name")} required />
            <Select name="type" defaultValue="checking" required>
              {ACCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {te(`accountType.${type}`)}
                </option>
              ))}
            </Select>
            <Input name="currency" defaultValue={baseCurrency} maxLength={3} required />
            <Input name="openingBalance" defaultValue="0" inputMode="decimal" />
            <Button type="submit">{tc("add")}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-sm text-ink-3">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs font-medium text-ink-3">
                  <tr>
                    <th className="py-2">{tc("name")}</th>
                    <th className="py-2">{tc("type")}</th>
                    <th className="py-2">{tc("currency")}</th>
                    <th className="py-2 text-right">{t("balance")}</th>
                    <th className="py-2">{tc("status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {accounts.map((account) => (
                    <tr key={account.id}>
                      <td className="py-2 font-medium">{account.name}</td>
                      <td className="py-2 text-ink-2">
                        {te(`accountType.${account.type}`)}
                      </td>
                      <td className="py-2 text-ink-2">{account.currency}</td>
                      <td className="py-2 text-right font-medium">
                        {formatCurrency(account.balance, account.currency, locale)}
                      </td>
                      <td className="py-2">
                        {account.archived ? (
                          <Badge tone="neutral">{t("archived")}</Badge>
                        ) : (
                          <Badge tone="success">●</Badge>
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
