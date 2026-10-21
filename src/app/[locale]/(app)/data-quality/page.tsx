import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Link } from "@/i18n/navigation";
import { getDataQuality } from "@/services/reconciliation";

export default async function DataQualityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("dataQuality");
  const data = await getDataQuality();

  const rows: { key: keyof typeof data.counts; count: number; href: string }[] = [
    { key: "uncategorized", count: data.counts.uncategorized, href: data.links.uncategorized },
    { key: "duplicates", count: data.counts.duplicates, href: data.links.duplicates },
    {
      key: "unpairedTransfers",
      count: data.counts.unpairedTransfers,
      href: data.links.unpairedTransfers,
    },
    { key: "missingFx", count: data.counts.missingFx, href: data.links.missingFx },
    { key: "stalePrices", count: data.counts.stalePrices, href: data.links.stalePrices },
    {
      key: "accountsWithoutOpeningBalance",
      count: data.counts.accountsWithoutOpeningBalance,
      href: data.links.accountsWithoutOpeningBalance,
    },
    {
      key: "importRowsWithErrors",
      count: data.counts.importRowsWithErrors,
      href: data.links.importRowsWithErrors,
    },
  ];

  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <Card>
        <CardHeader>
          <CardTitle>{t("issues")}</CardTitle>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <p className="py-8 text-center text-sm text-positive">{t("noIssues")}</p>
          ) : (
            <ul className="divide-y divide-line/70">
              {rows.map((row) => (
                <li
                  key={row.key}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge tone={row.count > 0 ? "warning" : "success"}>{row.count}</Badge>
                    <span className="text-ink-2">{t(row.key)}</span>
                  </div>
                  {row.count > 0 ? (
                    <Link href={row.href} className="text-sm font-medium text-accent hover:underline">
                      {t("open")}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {data.counts.duplicates > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("duplicates")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-line/70 text-sm">
              {data.samples.duplicates.map((row, index) => (
                <li key={`${row.accountId}:${row.date}:${index}`} className="py-2 text-ink-2">
                  {row.date} · {row.amount} · {row.note ?? "—"} · {row.count}×
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
