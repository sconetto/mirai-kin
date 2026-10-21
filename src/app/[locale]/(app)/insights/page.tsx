import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Link } from "@/i18n/navigation";
import { getBaseCurrency } from "@/services/settings";
import { insightParams } from "@/lib/insight-params";
import { getInsights } from "@/services/insights";
import { acknowledgeInsightAction } from "../actions";

export default async function InsightsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("insights");
  const tc = await getTranslations("common");
  const baseCurrency = await getBaseCurrency();
  const insights = await getInsights();

  const tone = {
    info: "neutral",
    warning: "warning",
    critical: "danger",
  } as const;

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {insights.length === 0 ? (
        <Card>
          <CardContent>
            <p className="py-10 text-center text-sm text-ink-3">{t("empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {insights.map((insight) => (
            <Card key={`${insight.type}:${insight.signature}`}>
              <CardContent className="flex flex-wrap items-start justify-between gap-4 py-4">
                <div className="min-w-0">
                  <Badge tone={tone[insight.severity]}>{t(`severity.${insight.severity}`)}</Badge>
                  <p className="mt-2 text-sm text-ink-2">
                    {t(
                      insight.type as never,
                      insightParams(insight, locale, baseCurrency) as never,
                    )}
                  </p>
                  {insight.action ? (
                    <Link
                      href={insight.action.href}
                      className="mt-1 inline-block text-sm font-medium text-accent hover:underline"
                    >
                      {tc("view")}
                    </Link>
                  ) : null}
                </div>
                <form action={acknowledgeInsightAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="type" value={insight.type} />
                  <input type="hidden" name="signature" value={insight.signature} />
                  <Button type="submit" variant="ghost" size="sm">
                    {t("acknowledge")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
