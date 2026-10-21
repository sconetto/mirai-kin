/* eslint-disable @next/next/no-html-link-for-pages */
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AssistantConnectionTest } from "@/components/assistant-connection-test";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { ThemePicker } from "@/components/theme-picker";
import { Tabs } from "@/components/ui/tabs";
import { formatDate } from "@/lib/format";
import { listBackups } from "@/services/backups";
import { getSecretStatus, getSettings } from "@/services/settings";
import { runBackupAction, saveSettingsAction } from "../actions";

type Search = { section?: string; error?: string; saved?: string };

const SECTIONS = [
  "general",
  "localization",
  "appearance",
  "fx",
  "assistant",
  "data",
] as const;

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Search>;
}) {
  const { locale } = await params;
  const search = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("settings");
  const tc = await getTranslations("common");
  const settings = await getSettings();
  const secrets = getSecretStatus();
  const backups = await listBackups();
  const section = (SECTIONS.includes(search.section as never) ? search.section : "general") as
    | (typeof SECTIONS)[number];

  const tabs = SECTIONS.map((key) => ({
    href: `/settings?section=${key}`,
    label: t(key),
    active: key === section,
  }));

  const secretRows = [
    { label: t("database"), configured: secrets.databaseUrl },
    { label: t("apiToken"), configured: secrets.apiToken },
    { label: t("assistantSecret"), configured: secrets.assistantConfigured },
    { label: t("authSecret"), configured: secrets.authConfigured },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Tabs items={tabs} variant="pills" />

      {search.error ? (
        <p className="rounded-lg border border-negative/20 bg-negative-soft px-4 py-3 text-sm text-negative">
          {search.error}
        </p>
      ) : null}
      {search.saved ? (
        <p className="rounded-lg border border-positive/20 bg-positive-soft px-4 py-3 text-sm text-positive">
          {t("saved")}
        </p>
      ) : null}

      {section === "general" ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("general")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={saveSettingsAction} className="grid gap-4 sm:grid-cols-3">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="section" value="general" />
              <label className="text-xs text-ink-3">
                {t("baseCurrency")}
                <Input name="baseCurrency" defaultValue={settings.baseCurrency} maxLength={3} className="mt-1" />
              </label>
              <label className="text-xs text-ink-3">
                {t("timezone")}
                <Input name="timezone" defaultValue={settings.timezone} className="mt-1" />
              </label>
              <label className="text-xs text-ink-3">
                {t("firstDay")}
                <Input
                  name="firstDayOfMonth"
                  type="number"
                  min={1}
                  max={31}
                  defaultValue={settings.firstDayOfMonth}
                  className="mt-1"
                />
              </label>
              <div className="sm:col-span-3">
                <Button type="submit">{tc("save")}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {section === "localization" ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("localization")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={saveSettingsAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="section" value="localization" />
              <label className="text-xs text-ink-3">
                {t("language")}
                <Select name="defaultLocale" defaultValue={settings.defaultLocale} className="mt-1">
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en">English (US)</option>
                </Select>
              </label>
              <div className="sm:col-span-2">
                <Button type="submit">{tc("save")}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {section === "appearance" ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("appearance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ThemePicker />
          </CardContent>
        </Card>
      ) : null}

      {section === "fx" ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("fx")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={saveSettingsAction} className="grid gap-4">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="section" value="fx" />
              <label className="text-xs text-ink-3">
                {t("fxProvider")}
                <Input name="fxProvider" defaultValue={settings.fxProvider} className="mt-1" />
              </label>
              <p className="text-xs text-ink-3">{t("fxHint")}</p>
              <div>
                <Button type="submit">{tc("save")}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {section === "assistant" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("assistant")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={saveSettingsAction} className="grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="section" value="assistant" />
                <label className="flex items-center gap-2 text-sm text-ink-2 sm:col-span-2">
                  <input
                    type="checkbox"
                    name="assistantEnabled"
                    defaultChecked={settings.assistant.enabled}
                    className="h-4 w-4 accent-[var(--color-accent)]"
                  />
                  {t("assistantEnabled")}
                </label>
                <label className="text-xs text-ink-3">
                  {t("provider")}
                  <Input
                    name="assistantProvider"
                    defaultValue={settings.assistant.provider}
                    className="mt-1"
                  />
                </label>
                <label className="text-xs text-ink-3">
                  {t("model")}
                  <Input name="assistantModel" defaultValue={settings.assistant.model} className="mt-1" />
                </label>
                <label className="text-xs text-ink-3 sm:col-span-2">
                  {t("baseUrl")}
                  <Input
                    name="assistantBaseUrl"
                    defaultValue={settings.assistant.baseUrl}
                    className="mt-1"
                  />
                </label>
                <p className="text-xs text-ink-3 sm:col-span-2">{t("assistantHint")}</p>
                <div className="sm:col-span-2">
                  <Button type="submit">{tc("save")}</Button>
                </div>
                <div className="sm:col-span-2">
                  <AssistantConnectionTest />
                </div>
              </form>
            </CardContent>
          </Card>
          <SecretCard
            title={t("secretsTitle")}
            body={t("secretsBody")}
            rows={secretRows}
            configuredLabel={t("configured")}
            notConfiguredLabel={t("notConfigured")}
          />

          <Card>
            <CardHeader>
              <CardTitle>{t("backupHistory")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <form action={runBackupAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <Button type="submit" size="sm">
                    {t("backupNow")}
                  </Button>
                </form>
                <a
                  href="/api/export"
                  className="whitespace-nowrap rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-paper"
                >
                  {t("downloadExport")}
                </a>
              </div>
              {backups.length === 0 ? (
                <p className="text-sm text-ink-3">{t("noBackups")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-medium text-ink-3">
                        <th className="pb-3 pr-4">{t("created")}</th>
                        <th className="pb-3 pr-4 text-right">{t("size")}</th>
                        <th className="pb-3 pr-4">{t("status")}</th>
                        <th className="pb-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/70">
                      {backups.map((backup) => (
                        <tr key={backup.id}>
                          <td className="py-2 pr-4 text-ink-2">
                            {formatDate(backup.createdAt, locale)}
                          </td>
                          <td className="py-2 pr-4 text-right text-ink-3">
                            {(backup.sizeBytes / 1024).toFixed(1)} KB
                          </td>
                          <td className="py-2 pr-4">
                            <Badge tone={backup.status === "success" ? "success" : "danger"}>
                              {backup.status === "success" ? t("backupSuccess") : t("backupFailed")}
                            </Badge>
                          </td>
                          <td className="py-2 text-right">
                            {backup.status === "success" ? (
                              <a
                                href={`/api/backups/${backup.id}`}
                                className="text-sm font-medium text-accent hover:underline"
                              >
                                {t("download")}
                              </a>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {section === "data" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("data")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={saveSettingsAction} className="grid gap-4 sm:grid-cols-3">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="section" value="data" />
                <label className="flex items-center gap-2 text-sm text-ink-2 sm:col-span-3">
                  <input
                    type="checkbox"
                    name="backupEnabled"
                    defaultChecked={settings.backup.enabled}
                    className="h-4 w-4 accent-[var(--color-accent)]"
                  />
                  {t("backupEnabled")}
                </label>
                <label className="text-xs text-ink-3">
                  {t("schedule")}
                  <Input name="backupSchedule" defaultValue={settings.backup.schedule} className="mt-1" />
                </label>
                <label className="text-xs text-ink-3">
                  {t("retentionDays")}
                  <Input
                    name="backupRetentionDays"
                    type="number"
                    min={1}
                    max={365}
                    defaultValue={settings.backup.retentionDays}
                    className="mt-1"
                  />
                </label>
                <div className="sm:col-span-3">
                  <Button type="submit">{tc("save")}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
          <SecretCard
            title={t("secretsTitle")}
            body={t("secretsBody")}
            rows={secretRows}
            configuredLabel={t("configured")}
            notConfiguredLabel={t("notConfigured")}
          />
        </div>
      ) : null}
    </div>
  );
}

function SecretCard({
  title,
  body,
  rows,
  configuredLabel,
  notConfiguredLabel,
}: {
  title: string;
  body: string;
  rows: { label: string; configured: boolean }[];
  configuredLabel: string;
  notConfiguredLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-ink-3">{body}</p>
        <ul className="mt-3 divide-y divide-line/70">
          {rows.map((row) => (
            <li key={row.label} className="flex items-center justify-between py-2 text-sm">
              <span className="text-ink-2">{row.label}</span>
              <span className={row.configured ? "text-positive" : "text-ink-3"}>
                {row.configured ? configuredLabel : notConfiguredLabel}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
