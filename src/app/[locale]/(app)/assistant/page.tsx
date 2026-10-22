import { MessageCircle } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AssistantChat } from "@/components/assistant-chat";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Link } from "@/i18n/navigation";
import { resolveAssistantConfig } from "@/services/settings";
import { formatDate } from "@/lib/format";
import { resolveCitations } from "@/lib/assistant-citations";
import {
  getConversation,
  listActions,
  listConversations,
  listMessages,
} from "@/services/assistant";
import { listToolCallsForMessages } from "@/services/assistant/audit";

type Search = { c?: string };

export const dynamic = "force-dynamic";

export default async function AssistantPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Search>;
}) {
  const { locale } = await params;
  const search = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("assistant");
  const config = await resolveAssistantConfig();

  if (!config) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} subtitle={t("subtitle")}>
          <Link
            href="/assistant/activity"
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-paper"
          >
            {t("activity")}
          </Link>
          <Link
            href="/settings?section=assistant"
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-paper"
          >
            {t("manage")}
          </Link>
        </PageHeader>
        <Card>
          <CardHeader>
            <CardTitle>{t("disabledTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-ink-2">
            <p>{t("disabledBody")}</p>
            <pre className="overflow-x-auto rounded-lg border border-line bg-paper p-3 text-xs text-ink-2">
              {`ASSISTANT_ENABLED=true
ASSISTANT_PROVIDER=openai-compatible
ASSISTANT_MODEL=<model>
ASSISTANT_BASE_URL=<https://api.openai.com/v1 or http://localhost:11434/v1>
ASSISTANT_API_KEY=<server-only key, not needed for local models>`}
            </pre>
            <p className="text-xs text-ink-3">{t("setup")}</p>
            <details className="rounded-lg border border-line bg-paper px-3 py-2.5">
              <summary className="cursor-pointer text-sm font-medium text-ink">
                {t("privacy")}
              </summary>
              <p className="mt-2 text-xs text-ink-3">{t("privacyBody")}</p>
            </details>
            <p className="text-xs text-ink-3">{t("disclaimer")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const conversations = await listConversations();
  const selectedId = search.c ?? conversations[0]?.id;
  const selected = selectedId ? await getConversation(selectedId) : null;
  const [messages, actions] = selected
    ? await Promise.all([listMessages(selected.id), listActions(selected.id)])
    : [[], []];
  const toolCalls = selected
    ? await listToolCallsForMessages(messages.map((message) => message.id))
    : [];
  const toolCallsByMessage = new Map<string, typeof toolCalls>();
  for (const call of toolCalls) {
    const rows = toolCallsByMessage.get(call.messageId) ?? [];
    rows.push(call);
    toolCallsByMessage.set(call.messageId, rows);
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")}>
        <Badge tone="neutral">
          {config.provider} · {config.model}
        </Badge>
        <Link
          href="/assistant/activity"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-paper"
        >
          {t("activity")}
        </Link>
        <Link
          href="/settings?section=assistant"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-paper"
        >
          {t("manage")}
        </Link>
        <Link
          href="/assistant"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-paper"
        >
          {t("newConversation")}
        </Link>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-line bg-surface p-3">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
            {t("conversations")}
          </p>
          {conversations.length === 0 ? (
            <p className="mt-3 px-2 text-sm text-ink-3">{t("empty")}</p>
          ) : (
            <ul className="mt-2 space-y-0.5">
              {conversations.map((conversation) => {
                const active = conversation.id === selected?.id;
                return (
                  <li key={conversation.id}>
                    <Link
                      href={`/assistant?c=${conversation.id}`}
                      className={`block truncate rounded-lg px-2.5 py-2 text-sm transition-colors ${
                        active
                          ? "bg-subtle font-medium text-ink"
                          : "text-ink-2 hover:bg-paper hover:text-ink"
                      }`}
                    >
                      {conversation.title ?? t("newConversation")}
                      <span className="mt-0.5 block text-[11px] text-ink-3">
                        {formatDate(conversation.updatedAt, locale)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <div className="min-w-0 space-y-3">
          <AssistantChat
            key={`${selected?.id ?? "new"}-${messages.length}-${toolCalls.length}`}
            conversationId={selected?.id ?? null}
            initialMessages={messages.map((message) => ({
              id: message.id,
              role: message.role,
              content: message.content,
              createdAt: message.createdAt.toISOString(),
              toolCalls: (toolCallsByMessage.get(message.id) ?? []).map((call) => ({
                id: call.id,
                toolName: call.toolName,
                inputSummary: call.inputSummary,
                outputSummary: call.outputSummary,
                error: call.error,
                citations: resolveCitations(call.citations),
                createdAt: call.createdAt.toISOString(),
              })),
            }))}
            initialActions={actions.map((action) => ({
              id: action.id,
              type: action.type,
              status: action.status,
              payload: action.payload,
              createdAt: action.createdAt.toISOString(),
            }))}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-xs text-ink-3">
            <span className="flex items-center gap-1.5">
              <MessageCircle className="h-3.5 w-3.5" />
              {t("disclaimer")}
            </span>
            <details>
              <summary className="cursor-pointer font-medium text-ink-2">{t("privacy")}</summary>
              <p className="mt-2 max-w-xl">{t("privacyBody")}</p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
