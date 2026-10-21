"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AssistantChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

export type AssistantChatAction = {
  id: string;
  type: string;
  status: "pending" | "confirmed" | "cancelled";
  payload: Record<string, unknown>;
  createdAt: string;
};

export function AssistantChat({
  conversationId: initialConversationId,
  initialMessages,
  initialActions,
}: {
  conversationId: string | null;
  initialMessages: AssistantChatMessage[];
  initialActions: AssistantChatAction[];
}) {
  const t = useTranslations("assistant");
  const router = useRouter();
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState(initialMessages);
  const [resolvedActions, setResolvedActions] = useState<
    Record<string, "confirmed" | "cancelled">
  >({});
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const actions = initialActions.map((action) =>
    resolvedActions[action.id] ? { ...action, status: resolvedActions[action.id] } : action,
  );

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;

    const stamp = Date.now();
    const userMessage: AssistantChatMessage = {
      id: `local-user-${stamp}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    const assistantId = `local-assistant-${stamp}`;
    const assistantMessage: AssistantChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    };

    setInput("");
    setError(null);
    setBusy(true);
    setMessages((current) => [...current, userMessage, assistantMessage]);

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId, message: text }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Assistant request failed (${response.status})`);
      }

      const nextConversationId = response.headers.get("x-conversation-id");
      if (nextConversationId && nextConversationId !== conversationId) {
        setConversationId(nextConversationId);
        window.history.replaceState(null, "", `?c=${nextConversationId}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId ? { ...message, content: answer } : message,
          ),
        );
      }
      answer += decoder.decode();

      if (!answer.trim()) {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? { ...message, content: t("emptyAnswer") }
              : message,
          ),
        );
      }
      router.refresh();
    } catch {
      setError(t("error"));
      setMessages((current) => current.filter((message) => message.id !== assistantId));
    } finally {
      setBusy(false);
    }
  }

  async function resolveAction(id: string, decision: "confirm" | "cancel") {
    setActionBusy(id);
    setError(null);
    try {
      const response = await fetch(`/api/assistant/actions/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!response.ok) throw new Error("Action failed");
      setResolvedActions((current) => ({
        ...current,
        [id]: decision === "confirm" ? "confirmed" : "cancelled",
      }));
      router.refresh();
    } catch {
      setError(t("confirmError"));
    } finally {
      setActionBusy(null);
    }
  }

  function summaryOf(action: AssistantChatAction): string {
    const summary = action.payload.summary;
    return typeof summary === "string" ? summary : action.type;
  }

  return (
    <div className="flex min-h-[32rem] flex-col rounded-xl border border-line bg-surface">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
        {messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-ink-3">{t("empty")}</p>
        ) : null}

        {messages.map((message) => {
          if (message.role === "system") {
            return (
              <p key={message.id} className="text-center text-xs text-ink-3">
                {message.content}
              </p>
            );
          }

          const isUser = message.role === "user";
          return (
            <div
              key={message.id}
              className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}
            >
              <span className="px-1 text-[11px] font-medium uppercase tracking-wide text-ink-3">
                {isUser ? t("you") : t("assistantName")}
              </span>
              <div
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  isUser
                    ? "rounded-br-md bg-accent text-on-accent"
                    : "rounded-bl-md border border-line/80 bg-paper text-ink",
                )}
              >
                {message.content || (busy && !isUser ? t("thinking") : "")}
              </div>
            </div>
          );
        })}

        {actions.length > 0 ? (
          <div className="space-y-2 border-t border-line/70 pt-4">
            {actions.map((action) => (
              <div
                key={action.id}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-sm",
                  action.status === "pending"
                    ? "border-warning/30 bg-warning-soft"
                    : "border-line bg-paper",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">
                      {t("writeProposal")}
                    </p>
                    <p className="mt-0.5 text-ink-2">{summaryOf(action)}</p>
                    {action.status === "pending" ? (
                      <p className="mt-0.5 text-xs text-ink-3">{t("notCreated")}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {action.status === "pending" ? (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={actionBusy === action.id}
                          onClick={() => void resolveAction(action.id, "cancel")}
                        >
                          {t("cancel")}
                        </Button>
                        <Button
                          size="sm"
                          disabled={actionBusy === action.id}
                          onClick={() => void resolveAction(action.id, "confirm")}
                        >
                          {t("confirm")}
                        </Button>
                      </>
                    ) : (
                      <span
                        className={cn(
                          "text-xs font-medium",
                          action.status === "confirmed" ? "text-positive" : "text-ink-3",
                        )}
                      >
                        {action.status === "confirmed" ? t("confirmed") : t("cancelled")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="border-t border-line/70 p-3 sm:p-4">
        {error ? <p className="mb-2 text-xs text-negative">{error}</p> : null}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            placeholder={t("placeholder")}
            rows={2}
            maxLength={4000}
            aria-label={t("placeholder")}
            className="min-h-[2.75rem] flex-1 resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-4 focus:ring-accent/10"
          />
          <Button type="button" onClick={() => void send()} disabled={busy || !input.trim()}>
            {busy ? t("thinking") : t("send")}
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-ink-3">{t("conversationHint")}</p>
      </div>
    </div>
  );
}
