import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { getBaseCurrency } from "@/services/settings";
import { localizedCategoryName } from "@/lib/category-name";
import { formatCurrency } from "@/lib/format";
import { getTaxSummary } from "@/services/tax";

type Search = { year?: string };

export default async function TaxPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Search>;
}) {
  const { locale } = await params;
  const search = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("tax");

  const now = new Date();
  const year = Number(search.year ?? now.getUTCFullYear());
  const summary = await getTaxSummary(year);
  const currency = await getBaseCurrency();
  const incomeTotal = summary.income.reduce((sum, row) => sum + row.total, 0);
  const years = Array.from({ length: 5 }, (_, index) => now.getUTCFullYear() - index);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")}>
        <form method="get" className="flex items-end gap-2">
          <label className="text-xs text-ink-3">
            {t("year")}
            <Select name="year" defaultValue={String(year)} className="mt-1">
              {years.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </label>
          <Button type="submit" variant="secondary">
            {t("year")}
          </Button>
        </form>
        <a
          href={`/api/tax/export?year=${year}`}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-paper"
        >
          {t("export")}
        </a>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("income")} value={formatCurrency(incomeTotal, currency, locale)} tone="positive" />
        <Stat label={t("deductible")} value={formatCurrency(summary.deductible, currency, locale)} />
        <Stat
          label={t("capitalGains")}
          value={formatCurrency(summary.capitalGains, currency, locale)}
          tone={summary.capitalGains >= 0 ? "positive" : "negative"}
        />
        <Stat label={t("dividends")} value={formatCurrency(summary.dividends, currency, locale)} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t("income")}</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.income.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-3">{t("noData")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-ink-3">
                    <th className="pb-3 pr-4">{t("category")}</th>
                    <th className="pb-3 text-right">{t("total")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {summary.income.map((row) => (
                    <tr key={row.category}>
                      <td className="py-2.5 pr-4 text-ink-2">{localizedCategoryName({ name: row.category, nameEn: row.nameEn, namePt: row.namePt }, locale)}</td>
                      <td className="py-2.5 text-right font-medium text-ink">
                        {formatCurrency(row.total, currency, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="rounded-lg border border-warning/20 bg-warning-soft px-4 py-3 text-sm text-warning">
        {t("disclaimer")}
      </p>
    </div>
  );
}
