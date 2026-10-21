import { getTranslations, setRequestLocale } from "next-intl/server";
import { INSTRUMENT_TYPES } from "@/db/schema";
import { PortfolioChart } from "@/components/charts/portfolio-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { getBaseCurrency } from "@/services/settings";
import { formatCurrency, formatNumber } from "@/lib/format";
import { listAccounts } from "@/services/accounts";
import { listPositionsWithValue, getPortfolioHistory } from "@/services/investments";
import { createPositionAction } from "../actions";

export default async function InvestmentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("investments");
  const tc = await getTranslations("common");
  const accounts = await listAccounts();
  const positions = await listPositionsWithValue();
  const history = await getPortfolioHistory();
  const baseCurrency = await getBaseCurrency();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{t("title")}</h1>
        <p className="text-sm text-ink-3">{t("subtitle")}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t("growth")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PortfolioChart data={history} locale={locale} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("new")}</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-sm text-ink-3">{tc("empty")}</p>
          ) : (
            <form action={createPositionAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input type="hidden" name="locale" value={locale} />
              <Select name="accountId" required defaultValue={accounts[0]?.id}>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
              <Input name="symbol" placeholder={t("symbol")} required />
              <Input name="name" placeholder={tc("name")} required />
              <Select name="instrumentType" defaultValue="stock">
                {INSTRUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.toUpperCase()}
                  </option>
                ))}
              </Select>
              <Input name="quantity" placeholder={t("quantity")} inputMode="decimal" required />
              <Input name="avgCost" placeholder={t("avgCost")} inputMode="decimal" required />
              <Input name="currency" defaultValue={baseCurrency} maxLength={3} />
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
          {positions.length === 0 ? (
            <p className="text-sm text-ink-3">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs font-medium text-ink-3">
                  <tr>
                    <th className="py-2">{t("symbol")}</th>
                    <th className="py-2">{tc("name")}</th>
                    <th className="py-2 text-right">{t("quantity")}</th>
                    <th className="py-2 text-right">{t("avgCost")}</th>
                    <th className="py-2 text-right">{t("latestPrice")}</th>
                    <th className="py-2 text-right">{t("value")}</th>
                    <th className="py-2 text-right">{t("gain")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {positions.map((position) => {
                    const gain = Number(position.gain);
                    return (
                      <tr key={position.id}>
                        <td className="py-2 font-medium">{position.symbol}</td>
                        <td className="py-2 text-ink-2">{position.name}</td>
                        <td className="py-2 text-right">{formatNumber(position.quantity, locale)}</td>
                        <td className="py-2 text-right">
                          {formatCurrency(position.avgCost, position.currency, locale)}
                        </td>
                        <td className="py-2 text-right">
                          {formatCurrency(position.latestPrice, position.currency, locale)}
                        </td>
                        <td className="py-2 text-right">
                          {formatCurrency(position.value, position.currency, locale)}
                        </td>
                        <td
                          className={`py-2 text-right font-medium ${gain >= 0 ? "text-positive" : "text-negative"}`}
                        >
                          {formatCurrency(position.gain, position.currency, locale)} (
                          {position.gainPct}%)
                        </td>
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
