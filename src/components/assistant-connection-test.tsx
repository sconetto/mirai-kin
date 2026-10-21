"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { testAssistantConnectionAction } from "@/actions/theme";
import { Button } from "@/components/ui/button";

type ConnectionResult = { ok: boolean; message: string; status?: number };

export function AssistantConnectionTest() {
  const t = useTranslations("settings");
  const [result, setResult] = useState<ConnectionResult | null>(null);
  const [pending, setPending] = useState(false);

  async function run() {
    setPending(true);
    setResult(null);
    try {
      setResult(await testAssistantConnectionAction());
    } catch {
      setResult({ ok: false, message: "The connection test failed." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-line bg-paper p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-3">{t("connectionHint")}</p>
        <Button type="button" size="sm" variant="secondary" onClick={run} disabled={pending}>
          {pending ? t("testing") : t("testConnection")}
        </Button>
      </div>
      {result ? (
        <p className={result.ok ? "text-sm text-positive" : "text-sm text-negative"}>
          {result.ok ? t("connectionOk") : t("connectionFailed")}{" "}
          <span className="text-ink-3">{result.message}</span>
        </p>
      ) : null}
    </div>
  );
}
