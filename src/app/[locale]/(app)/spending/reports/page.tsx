import { getTranslations, setRequestLocale } from "next-intl/server";
import { SpendingChart } from "@/components/charts/spending-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { Tabs } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import { formatCurrency, formatMonth } from "@/lib/format";
import { getReport, listSavedReports } from "@/services/reports";
import type { ReportType } from "@/services/reports";
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
  const now = new Date();
  const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
  const defaultTo = now.toISOString().slice(0, 10);

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

  const tabs = REPORT_TYPES.map((key) => ({
    href: `/spending/reports?type=${key}&from=${from}&to=${to}${comparison ? "&comparison=1" : ""}`,
    label: t(key),
    active: key === type,
  }));

  const summary = report.summary;

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")}>
        <a
          href={`/api/reports/export?type=${type}&from=${from}&to=${to}`}
          className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
        >
          {t("export")}
        </a>
      </PageHeader>

      <Tabs items={tabs} />

      <form method="get" className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="type" value={type} />
        <label className="text-xs text-ink-3">
          {t("from")}
          <Input name="from" type="date" defaultValue={from} className="mt-1" />
        </label>
        <label className="text-xs text-ink-3">
          {t("to")}
          <Input name="to" type="date" defaultValue={to} className="mt-1" />
        </label>
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
        <Button type="submit" variant="secondary" className="mb-0.5">
          {t("apply")}
        </Button>
      </form>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("totalIncome")} value={formatCurrency(summary.income, report.currency, locale)} tone="positive" />
        <Stat label={t("totalExpenses")} value={formatCurrency(summary.expenses, report.currency, locale)} tone="negative" />
        <Stat label={t("net")} value={formatCurrency(summary.net, report.currency, locale)} />
        <Stat label={t("average")} value={formatCurrency(summary.average, report.currency, locale)} />
      </section>

      {report.comparison ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("comparison")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-ink-3">{t("previous")}</p>
              <p className="font-medium text-ink">
                {t("net")}: {formatCurrency(report.comparison.previous.net, report.currency, locale)}
              </p>
            </div>
            <div>
              <p className="text-ink-3">{t("priorYear")}</p>
              <p className="font-medium text-ink">
                {t("net")}: {formatCurrency(report.comparison.priorYear.net, report.currency, locale)}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t(type)}</CardTitle>
        </CardHeader>
        <CardContent>
          <SpendingChart data={chartData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("period")}</CardTitle>
        </CardHeader>
        <CardContent>
          {report.rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-3">{t("noData")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-ink-3">
                    <th className="pb-3 pr-4">{type === "breakdown" ? t("breakdown") : t("period")}</th>
                    <th className="pb-3 pr-4 text-right">{t("totalIncome")}</th>
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
                      <td className="py-2.5 pr-4 text-right text-positive">
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
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("save")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveReportAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="from" value={from} />
            <input type="hidden" name="to" value={to} />
            <input type="hidden" name="comparison" value={comparison ? "1" : "0"} />
            <label className="text-xs text-ink-3">
              {t("name")}
              <Input name="name" required className="mt-1" />
            </label>
            <Button type="submit">{t("save")}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("saved")}</CardTitle>
        </CardHeader>
        <CardContent>
          {saved.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-3">{t("noSaved")}</p>
          ) : (
            <ul className="divide-y divide-line/70">
              {saved.map((item) => {
                const config = item.config as {
                  type?: string;
                  from?: string;
                  to?: string;
                  comparison?: boolean;
                };
                const href = `/spending/reports?type=${config.type ?? "cashflow"}&from=${config.from ?? from}&to=${config.to ?? to}${config.comparison ? "&comparison=1" : ""}`;
                return (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={href} className="text-sm font-medium text-ink hover:underline">
                      {item.name}
                    </Link>
                    <form action={deleteReportAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={item.id} />
                      <Button type="submit" variant="ghost" size="sm" className="text-negative">
                        {t("delete")}
                      </Button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
