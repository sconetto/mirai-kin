import { ArrowDown, BookOpen, SlidersHorizontal, Upload } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ReportChart } from "@/components/charts/report-chart";
import { SpendingChart } from "@/components/charts/spending-chart";
import { SpendingNav } from "@/components/spending-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SummaryStrip } from "@/components/ui/summary-strip";
import { Tabs } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import { formatCurrency, formatDate, formatMonth } from "@/lib/format";
import { getReport, listSavedReports } from "@/services/reports";
import type { ReportType } from "@/services/reports";
import { getSettings, todayInTimeZone } from "@/services/settings";
import { deleteReportAction, saveReportAction } from "../../actions";

type Search = { type?: string; from?: string; to?: string; comparison?: string };

const REPORT_TYPES: ReportType[] = ["cashflow", "expenses", "income", "transfers", "breakdown"];

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Search>;
}) {
  const { locale } = await params;
  const search = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("reports");
  const ts = await getTranslations("spending");
  const tn = await getTranslations("nav");
  const appSettings = await getSettings();
  const defaultTo = todayInTimeZone(appSettings.timezone);
  const [year, month] = defaultTo.split("-").map(Number);
  const todayDay = Number(defaultTo.slice(8, 10));
  const monthOffset = todayDay >= appSettings.firstDayOfMonth ? 0 : -1;
  const defaultFrom = new Date(
    Date.UTC(year, month - 1 + monthOffset, appSettings.firstDayOfMonth),
  )
    .toISOString()
    .slice(0, 10);

  const type = (search.type ?? "cashflow") as ReportType;
  const from = search.from ?? defaultFrom;
  const to = search.to ?? defaultTo;
  const comparison = search.comparison === "1";

  const report = await getReport({ type, from, to, comparison });
  const saved = await listSavedReports();

  const metric =
    type === "income"
      ? "income"
      : type === "expenses" || type === "breakdown"
        ? "expenses"
        : type === "transfers"
          ? "transfers"
          : "net";

  const chartData = report.rows.map((row) => ({
    name: type === "breakdown" ? row.label : formatMonth(row.key, locale),
    total: row[metric as "income" | "expenses" | "transfers" | "net"],
  }));

  const reportTabs = REPORT_TYPES.map((key) => ({
    href: `/spending/reports?type=${key}&from=${from}&to=${to}${comparison ? "&comparison=1" : ""}`,
    label: t(key),
    active: key === type,
  }));

  const summaryItems = [
    {
      label: t("totalIncome"),
      value: formatCurrency(report.summary.income, report.currency, locale),
      tone: "positive" as const,
    },
    {
      label: t("totalExpenses"),
      value: formatCurrency(report.summary.expenses, report.currency, locale),
      tone: "negative" as const,
    },
    { label: t("net"), value: formatCurrency(report.summary.net, report.currency, locale) },
    { label: t("average"), value: formatCurrency(report.summary.average, report.currency, locale) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={ts("title")} subtitle={ts("subtitle")} tabs={<SpendingNav />}>
        <Link
          href="/import"
          aria-label={tn("import")}
          className="rounded-full border border-line/70 bg-surface p-2 text-ink-3 transition-colors hover:text-ink"
        >
          <Upload className="h-4 w-4" />
        </Link>
        <Link
          href="/learn"
          aria-label={tn("learn")}
          className="rounded-full border border-line/70 bg-surface p-2 text-ink-3 transition-colors hover:text-ink"
        >
          <BookOpen className="h-4 w-4" />
        </Link>
        <a
          href={`/api/reports/export?type=${type}&from=${from}&to=${to}`}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-paper"
        >
          {t("export")}
        </a>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <section className="min-w-0">
          <Card>
            <CardHeader className="flex items-center justify-between py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
                {t("title")}
              </p>
              <Link
                href="/spending/reports"
                aria-label={t("reset")}
                className="rounded-md border border-line p-1.5 text-ink-3 transition-colors hover:text-ink"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs items={reportTabs} variant="segmented" />

              <form method="get" className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="type" value={type} />
                  <div>
                    <p className="text-sm font-medium text-ink">{t("custom")}</p>
                    <p className="text-xs text-ink-3">
                      {formatDate(from, locale)} – {formatDate(to, locale)}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Input name="from" type="date" defaultValue={from} className="h-9 w-auto" />
                      <span className="text-xs text-ink-3">–</span>
                      <Input name="to" type="date" defaultValue={to} className="h-9 w-auto" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 pb-2 text-sm text-ink-2">
                    <input
                      type="checkbox"
                      name="comparison"
                      value="1"
                      defaultChecked={comparison}
                      className="h-4 w-4 accent-[var(--color-accent)]"
                    />
                    {t("comparison")}
                  </label>
                  <Button type="submit" variant="secondary" size="sm" className="mb-0.5">
                    {t("apply")}
                  </Button>
                </div>
              </form>

              {type === "breakdown" ? (
                <div className="space-y-3">
                  <p className="text-xs text-ink-3">{t("breakdownSubtitle")}</p>
                  <SpendingChart data={chartData} currency={report.currency} />
                </div>
              ) : (
                <ReportChart
                  data={chartData}
                  label={t(type)}
                  locale={locale}
                  currency={report.currency}
                />
              )}

              <SummaryStrip items={summaryItems} />

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-ink-3">
                      <th className="pb-3 pr-4">
                        <span className="inline-flex items-center gap-1">
                          {type === "breakdown" ? t("breakdown") : t("period")}
                          {type === "breakdown" ? null : <ArrowDown className="h-3.5 w-3.5" />}
                        </span>
                      </th>
                      <th className="hidden pb-3 pr-4 text-right sm:table-cell">{t("totalIncome")}</th>
                      <th className="pb-3 pr-4 text-right">{t("totalExpenses")}</th>
                      <th className="pb-3 text-right">{t("net")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/70">
                    {report.rows.map((row) => (
                      <tr key={row.key} className="hover:bg-paper">
                        <td className="py-2.5 pr-4 text-ink-2">
                          {type === "breakdown" ? row.label : formatMonth(row.key, locale)}
                        </td>
                        <td className="hidden py-2.5 pr-4 text-right text-positive sm:table-cell">
                          {formatCurrency(String(row.income), report.currency, locale)}
                        </td>
                        <td className="py-2.5 pr-4 text-right text-negative">
                          {formatCurrency(String(row.expenses), report.currency, locale)}
                        </td>
                        <td className="py-2.5 text-right font-medium text-ink">
                          {formatCurrency(String(row.net), report.currency, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {report.rows.length === 0 ? (
                  <p className="py-6 text-center text-sm text-ink-3">{t("noData")}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </section>

        <aside className="min-w-0 space-y-4">
          <Card>
            <CardHeader className="py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
                {t("saved")}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {saved.length === 0 ? (
                <p className="py-4 text-center text-sm text-ink-3">{t("noSaved")}</p>
              ) : (
                <ul className="space-y-2">
                  {saved.map((item) => {
                    const config = item.config as {
                      type?: string;
                      from?: string;
                      to?: string;
                      comparison?: boolean;
                    };
                    const href = `/spending/reports?type=${config.type ?? "cashflow"}&from=${config.from ?? from}&to=${config.to ?? to}${config.comparison ? "&comparison=1" : ""}`;
                    return (
                      <li key={item.id} className="rounded-lg border border-line/70 px-3 py-2">
                        <Link href={href} className="text-sm font-medium text-ink hover:underline">
                          {item.name}
                        </Link>
                        <form action={deleteReportAction} className="mt-1">
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="id" value={item.id} />
                          <button type="submit" className="text-xs text-negative hover:underline">
                            {t("delete")}
                          </button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              )}

              <form action={saveReportAction} className="space-y-2 border-t border-line/70 pt-3">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="type" value={type} />
                <input type="hidden" name="from" value={from} />
                <input type="hidden" name="to" value={to} />
                <input type="hidden" name="comparison" value={comparison ? "1" : "0"} />
                <Input name="name" required placeholder={t("name")} className="h-9" />
                <Button type="submit" size="sm" className="w-full">
                  {t("save")}
                </Button>
              </form>
            </CardContent>
          </Card>

          {report.comparison ? (
            <Card>
              <CardHeader className="py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
                  {t("comparison")}
                </p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink-3">{t("previous")}</span>
                  <span className="font-mono font-medium tabular text-ink">
                    {formatCurrency(report.comparison.previous.net, report.currency, locale)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink-3">{t("priorYear")}</span>
                  <span className="font-mono font-medium tabular text-ink">
                    {formatCurrency(report.comparison.priorYear.net, report.currency, locale)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
