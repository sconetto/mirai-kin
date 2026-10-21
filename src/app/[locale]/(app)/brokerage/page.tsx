import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { PageHeader } from "@/components/ui/page-header";
import { Link } from "@/i18n/navigation";
import { formatCurrency, formatNumber } from "@/lib/format";
import { listPositionsWithValue } from "@/services/investments";

export default async function BrokeragePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("brokerage");
  const tc = await getTranslations("common");
  const positions = await listPositionsWithValue();

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

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
    </div>
  );
}
