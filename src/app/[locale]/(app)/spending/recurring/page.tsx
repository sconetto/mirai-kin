import { getTranslations, setRequestLocale } from "next-intl/server";
import { SpendingNav } from "@/components/spending-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import { PageHeader } from "@/components/ui/page-header";
import { formatCurrency, formatDate } from "@/lib/format";
import { listRecurringDetections, syncRecurringDetections } from "@/services/detections";
import { getUpcomingBills } from "@/services/recurring";
import { getBaseCurrency } from "@/services/settings";
import {
  confirmDetectionAction,
  ignoreDetectionAction,
  updateDetectionAction,
} from "../../actions";

const STATUS_TONE = {
  detected: "warning",
  confirmed: "success",
  ignored: "neutral",
} as const;

export default async function RecurringPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("recurring");
  const ts = await getTranslations("spending");
  const currency = await getBaseCurrency();

  await syncRecurringDetections();
  const [detections, upcoming] = await Promise.all([listRecurringDetections(), getUpcomingBills(30)]);

  return (
    <div className="space-y-6">
      <PageHeader title={ts("title")} subtitle={ts("subtitle")} tabs={<SpendingNav />} />

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
          {detections.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-3">{t("empty")}</p>
          ) : (
            <ul className="divide-y divide-line/70">
              {detections.map((detection) => (
                <li key={detection.id} className="space-y-3 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{detection.label}</p>
                      <p className="text-xs text-ink-3">
                        {formatDate(detection.nextExpected, locale)} ·{" "}
                        {t(detection.cadence as "weekly" | "monthly" | "yearly")} ·{" "}
                        {formatCurrency(detection.averageAmount, detection.currency, locale)}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[detection.status] ?? "neutral"}>
                      {t(detection.status)}
                    </Badge>
                  </div>

                  {detection.status === "detected" ? (
                    <div className="flex flex-wrap gap-2">
                      <form action={confirmDetectionAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="id" value={detection.id} />
                        <Button type="submit" size="sm">
                          {t("confirm")}
                        </Button>
                      </form>
                      <form action={ignoreDetectionAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="id" value={detection.id} />
                        <Button type="submit" size="sm" variant="secondary">
                          {t("ignore")}
                        </Button>
                      </form>
                    </div>
                  ) : null}

                  {detection.status !== "ignored" ? (
                    <form
                      action={updateDetectionAction}
                      className="flex flex-wrap items-end gap-2"
                    >
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={detection.id} />
                      <label className="text-xs text-ink-3">
                        {t("next")}
                        <Input
                          name="nextExpected"
                          type="date"
                          defaultValue={detection.nextExpected}
                          className="mt-1 h-8 w-36"
                        />
                      </label>
                      <label className="text-xs text-ink-3">
                        {t("average")}
                        <Input
                          name="averageAmount"
                          inputMode="decimal"
                          defaultValue={detection.averageAmount}
                          className="mt-1 h-8 w-28"
                        />
                      </label>
                      <label className="text-xs text-ink-3">
                        {t("cadence")}
                        <Select
                          name="cadence"
                          defaultValue={detection.cadence}
                          className="mt-1 h-8 w-28"
                        >
                          <option value="weekly">{t("weekly")}</option>
                          <option value="monthly">{t("monthly")}</option>
                          <option value="yearly">{t("yearly")}</option>
                        </Select>
                      </label>
                      <Button type="submit" size="sm" variant="ghost">
                        {t("save")}
                      </Button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
