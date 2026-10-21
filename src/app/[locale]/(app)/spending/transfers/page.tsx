import { getTranslations, setRequestLocale } from "next-intl/server";
import { SpendingNav } from "@/components/spending-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { formatCurrency, formatDate } from "@/lib/format";
import { getUnpairedTransfers } from "@/services/reconciliation";
import { listTransfers } from "@/services/transfers";
import { pairTransferAction, unpairTransferAction } from "../../actions";

export default async function TransfersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("transfers");
  const ts = await getTranslations("spending");
  const [unpaired, transfers] = await Promise.all([getUnpairedTransfers(), listTransfers()]);

  return (
    <div className="space-y-6">
      <PageHeader title={ts("title")} subtitle={ts("subtitle")} tabs={<SpendingNav />} />

      <Card>
        <CardHeader>
          <CardTitle>{t("unpaired")}</CardTitle>
        </CardHeader>
        <CardContent>
          {unpaired.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-3">{t("none")}</p>
          ) : (
            <>
              <ul className="divide-y divide-line/70 text-sm">
                {unpaired.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="text-ink-2">
                      {formatDate(row.recordDate, locale)} · {row.accountName} ·{" "}
                      {formatCurrency(row.amount, row.currency, locale)}
                    </span>
                    <span className="text-xs text-ink-3">{row.note ?? row.counterparty ?? "—"}</span>
                  </li>
                ))}
              </ul>
              <form action={pairTransferAction} className="mt-4 grid gap-3 sm:grid-cols-3">
                <input type="hidden" name="locale" value={locale} />
                <label className="text-xs text-ink-3">
                  {t("first")}
                  <Select name="firstId" required className="mt-1">
                    {unpaired.map((row) => (
                      <option key={row.id} value={row.id}>
                        {formatDate(row.recordDate, locale)} · {row.accountName} ·{" "}
                        {formatCurrency(row.amount, row.currency, locale)}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="text-xs text-ink-3">
                  {t("second")}
                  <Select name="secondId" required className="mt-1">
                    {unpaired.map((row) => (
                      <option key={row.id} value={row.id}>
                        {formatDate(row.recordDate, locale)} · {row.accountName} ·{" "}
                        {formatCurrency(row.amount, row.currency, locale)}
                      </option>
                    ))}
                  </Select>
                </label>
                <div className="flex items-end">
                  <Button type="submit">{t("pair")}</Button>
                </div>
              </form>
              <p className="mt-2 text-xs text-ink-3">{t("pairHint")}</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("paired")}</CardTitle>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-3">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-ink-3">
                    <th className="pb-3 pr-4">{t("first")}</th>
                    <th className="pb-3 pr-4 text-right">{t("amount")}</th>
                    <th className="pb-3 pr-4">{t("status")}</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {transfers.map((transfer) => (
                    <tr key={transfer.id}>
                      <td className="py-2.5 pr-4 text-ink-2">
                        {formatDate(transfer.date, locale)}
                        {transfer.note ? (
                          <span className="block text-xs text-ink-3">{transfer.note}</span>
                        ) : null}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-ink-2">
                        {formatCurrency(transfer.amount, transfer.currency, locale)}
                        {transfer.currency !== transfer.counterCurrency ? (
                          <span className="block text-xs text-ink-3">
                            → {formatCurrency(transfer.counterAmount, transfer.counterCurrency, locale)}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge tone={transfer.status === "paired" ? "success" : "warning"}>
                          {transfer.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right">
                        <form action={unpairTransferAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="transferId" value={transfer.id} />
                          <Button type="submit" size="sm" variant="ghost">
                            {t("unpair")}
                          </Button>
                        </form>
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
