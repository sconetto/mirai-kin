/* eslint-disable @next/next/no-html-link-for-pages */
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { PageHeader } from "@/components/ui/page-header";
import { Link } from "@/i18n/navigation";
import { formatCurrency, formatNumber } from "@/lib/format";
import { getBrokerageSummary } from "@/services/brokerage";

export default async function BrokeragePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("brokerage");
  const tc = await getTranslations("common");
  const summary = await getBrokerageSummary();
  const positions = summary.positions;

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")}>
        <a
          href="/api/brokerage/export"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-paper"
        >
          {t("export")}
        </a>
      </PageHeader>

      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-ink-3">{t("note")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-3">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-ink-3">
                    <th className="pb-3 pr-4">{t("symbol")}</th>
                    <th className="pb-3 pr-4">{tc("name")}</th>
                    <th className="pb-3 pr-4 text-right">{tc("amount")}</th>
                    <th className="pb-3 pr-4 text-right">{t("value")}</th>
                    <th className="pb-3 text-right">{t("gain")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {positions.map((position) => {
                    const gain = Number(position.gain);
                    return (
                      <tr key={position.id} className="hover:bg-paper">
                        <td className="py-2.5 pr-4 font-medium text-ink">{position.symbol}</td>
                        <td className="py-2.5 pr-4 text-ink-2">{position.name}</td>
                        <td className="py-2.5 pr-4 text-right text-ink-3">
                          {formatNumber(position.quantity, locale)}
                        </td>
                        <td className="py-2.5 pr-4 text-right">
                          <Money>{formatCurrency(position.value, position.currency, locale)}</Money>
                        </td>
                        <td
                          className={`py-2.5 text-right font-medium ${gain >= 0 ? "text-positive" : "text-negative"}`}
                        >
                          {formatCurrency(position.gain, position.currency, locale)} ({position.gainPct}%)
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4">
            <Link href="/invest" className="text-sm font-medium text-accent hover:underline">
              {tc("view")}
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("allocation")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-3">
          {(
            [
              ["byInstrument", t("byInstrument"), summary.allocation.byInstrument],
              ["byCurrency", t("byCurrency"), summary.allocation.byCurrency],
              ["byAccount", t("byAccount"), summary.allocation.byAccount],
            ] as const
          ).map(([key, label, items]) => (
            <div key={key}>
              <p className="text-xs font-medium text-ink-3">{label}</p>
              {items.length === 0 ? (
                <p className="mt-2 text-sm text-ink-3">—</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {items.map((item) => (
                    <li key={item.key}>
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="truncate text-ink-2">{item.key}</span>
                        <span className="text-ink-3">{item.share}%</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-paper">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${item.share}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
