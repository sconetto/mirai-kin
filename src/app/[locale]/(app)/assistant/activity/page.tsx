import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Link } from "@/i18n/navigation";
import { resolveCitations } from "@/lib/assistant-citations";
import { formatDate } from "@/lib/format";
import { listRecentToolCalls } from "@/services/assistant/audit";

export const dynamic = "force-dynamic";

export default async function AssistantActivityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("assistant");
  const calls = await listRecentToolCalls(100);

  return (
    <div className="space-y-6">
      <PageHeader title={t("activityTitle")} subtitle={t("activitySubtitle")}>
        <Link
          href="/assistant"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-paper"
        >
          {t("backToAssistant")}
        </Link>
        <Link
          href="/settings?section=assistant"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-paper"
        >
          {t("manage")}
        </Link>
      </PageHeader>

      <p className="rounded-lg border border-line bg-paper px-4 py-3 text-xs text-ink-3">
        {t("activityPrivacy")}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>{t("recentActivity")}</CardTitle>
        </CardHeader>
        <CardContent>
          {calls.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-3">{t("noActivity")}</p>
          ) : (
            <div className="space-y-2">
              {calls.map((call) => {
                const citations = resolveCitations(call.citations);
                return (
                  <details
                    key={call.id}
                    className="rounded-lg border border-line/70 bg-paper px-3 py-2"
                  >
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-ink">
                        {call.toolName.replaceAll("_", " ")}
                      </span>
                      <span className="text-xs text-ink-3">
                        {formatDate(call.createdAt, locale)}
                      </span>
                    </summary>
                    <div className="mt-3 space-y-2 text-xs">
                      <p className="text-ink-3">
                        {t("conversation")}:{" "}
                        <Link
                          href={`/assistant?c=${call.conversationId}`}
                          className="font-medium text-accent hover:underline"
                        >
                          {call.conversationTitle ?? t("newConversation")}
                        </Link>
                      </p>
                      {citations.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-ink-3">{t("citedSources")}</span>
                          {citations.map((citation) =>
                            citation.href ? (
                              <Link
                                key={`${citation.type}-${citation.id}`}
                                href={citation.href}
                                className="font-medium text-accent hover:underline"
                              >
                                {citation.label}
                              </Link>
                            ) : (
                              <span key={`${citation.type}-${citation.id}`} className="text-ink-2">
                                {citation.label}
                              </span>
                            ),
                          )}
                        </div>
                      ) : null}
                      {call.error ? <p className="text-negative">{call.error}</p> : null}
                      <details>
                        <summary className="cursor-pointer font-medium text-ink-3">
                          {t("toolDetails")}
                        </summary>
                        <pre className="mt-1.5 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-surface p-2 text-[11px] text-ink-2">
                          {JSON.stringify(
                            { input: call.inputSummary, output: call.outputSummary },
                            null,
                            2,
                          )}
                        </pre>
                      </details>
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
