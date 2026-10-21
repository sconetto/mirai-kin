import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { getEnv } from "@/lib/env";
import { formatCurrency, formatDate } from "@/lib/format";
import { detectRecurring, getUpcomingBills } from "@/services/recurring";

export default async function RecurringPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("recurring");
  const tc = await getTranslations("common");
  const currency = getEnv().BASE_CURRENCY;

  const [candidates, upcoming] = await Promise.all([detectRecurring(), getUpcomingBills(30)]);

  const tabs = [
    { href: "/spending", label: tc("back"), active: false },
    { href: "/spending/recurring", label: t("title"), active: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Tabs items={tabs} />

      <Card>
        <CardHeader>
          <CardTitle>{t("upcoming")}</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-3">{t("empty")}</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((candidate) => (
                <li
                  key={`${candidate.key}:${candidate.nextExpected}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line/70 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-ink">{candidate.label}</span>
                  <span className="text-ink-3">{formatDate(candidate.nextExpected, locale)}</span>
                  <Money className="text-sm text-ink">
                    {formatCurrency(candidate.averageAmount, currency, locale)}
                  </Money>
                  <Badge tone="warning">{t(candidate.cadence)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-3">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-ink-3">
                    <th className="pb-3 pr-4">{t("label")}</th>
                    <th className="pb-3 pr-4">{t("cadence")}</th>
                    <th className="pb-3 pr-4">{t("next")}</th>
                    <th className="pb-3 pr-4 text-right">{t("average")}</th>
                    <th className="pb-3 pr-4 text-right">{t("occurrences")}</th>
                    <th className="pb-3 text-right">{t("confidence")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {candidates.map((candidate) => (
                    <tr key={candidate.key} className="hover:bg-paper">
                      <td className="py-2.5 pr-4 text-ink-2">{candidate.label}</td>
                      <td className="py-2.5 pr-4 text-ink-3">{t(candidate.cadence)}</td>
                      <td className="py-2.5 pr-4 text-ink-2">
                        {formatDate(candidate.nextExpected, locale)}
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        <Money>{formatCurrency(candidate.averageAmount, currency, locale)}</Money>
                      </td>
                      <td className="py-2.5 pr-4 text-right text-ink-3">{candidate.occurrences}</td>
                      <td className="py-2.5 text-right text-ink-3">
                        {Math.round(candidate.confidence * 100)}%
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
