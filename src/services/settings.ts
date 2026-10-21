import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { settings } from "@/db/schema";
import { getEnv } from "@/lib/env";

export type AppSettings = {
  baseCurrency: string;
  timezone: string;
  firstDayOfMonth: number;
  defaultLocale: "en" | "pt-BR";
  theme: "light" | "system";
  fxProvider: string;
  assistant: {
    enabled: boolean;
    provider: string;
    model: string;
    baseUrl: string;
  };
  backup: {
    enabled: boolean;
    schedule: string;
    retentionDays: number;
  };
};

export type SettingsPatch = {
  baseCurrency?: string;
  timezone?: string;
  firstDayOfMonth?: number;
  defaultLocale?: "en" | "pt-BR";
  theme?: "light" | "system";
  fxProvider?: string;
  assistant?: Partial<AppSettings["assistant"]>;
  backup?: Partial<AppSettings["backup"]>;
};

export class SettingsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsValidationError";
  }
}

function envAssistant() {
  return {
    enabled: process.env.ASSISTANT_ENABLED === "true",
    provider: process.env.ASSISTANT_PROVIDER?.trim() || "openai-compatible",
    model: process.env.ASSISTANT_MODEL?.trim() || "",
    baseUrl: process.env.ASSISTANT_BASE_URL?.trim() || "",
  };
}

function defaults(): AppSettings {
  return {
    baseCurrency: getEnv().BASE_CURRENCY.toUpperCase(),
    timezone: "UTC",
    firstDayOfMonth: 1,
    defaultLocale: "pt-BR",
    theme: "system",
    fxProvider: getEnv().FX_SOURCE_URL,
    assistant: envAssistant(),
    backup: {
      enabled: true,
      schedule: "0 3 * * *",
      retentionDays: 14,
    },
  };
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function getSettings(): Promise<AppSettings> {
  const db = getDb();
  const rows = await db.select().from(settings);
  const stored = new Map(rows.map((row) => [row.key, row.value]));
  const base = defaults();

  const storedAssistant = objectValue(stored.get("assistant"));
  const storedBackup = objectValue(stored.get("backup"));

  return {
    baseCurrency:
      typeof stored.get("baseCurrency") === "string"
        ? String(stored.get("baseCurrency")).toUpperCase()
        : base.baseCurrency,
    timezone:
      typeof stored.get("timezone") === "string" ? String(stored.get("timezone")) : base.timezone,
    firstDayOfMonth:
      typeof stored.get("firstDayOfMonth") === "number"
        ? Math.min(31, Math.max(1, Number(stored.get("firstDayOfMonth"))))
        : base.firstDayOfMonth,
    defaultLocale: stored.get("defaultLocale") === "en" ? "en" : "pt-BR",
    theme: stored.get("theme") === "light" ? "light" : "system",
    fxProvider:
      typeof stored.get("fxProvider") === "string"
        ? String(stored.get("fxProvider"))
        : base.fxProvider,
    assistant: {
      enabled:
        typeof storedAssistant.enabled === "boolean"
          ? storedAssistant.enabled
          : base.assistant.enabled,
      provider:
        typeof storedAssistant.provider === "string"
          ? storedAssistant.provider
          : base.assistant.provider,
      model:
        typeof storedAssistant.model === "string" ? storedAssistant.model : base.assistant.model,
      baseUrl:
        typeof storedAssistant.baseUrl === "string"
          ? storedAssistant.baseUrl
          : base.assistant.baseUrl,
    },
    backup: {
      enabled:
        typeof storedBackup.enabled === "boolean" ? storedBackup.enabled : base.backup.enabled,
      schedule:
        typeof storedBackup.schedule === "string" ? storedBackup.schedule : base.backup.schedule,
      retentionDays:
        typeof storedBackup.retentionDays === "number"
          ? Math.min(365, Math.max(1, Number(storedBackup.retentionDays)))
          : base.backup.retentionDays,
    },
  };
}

export async function getBaseCurrency(): Promise<string> {
  return (await getSettings()).baseCurrency;
}

export function todayInTimeZone(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export async function getToday(): Promise<string> {
  return todayInTimeZone((await getSettings()).timezone);
}

export function isValidTimezone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function isValidCron(expression: string): boolean {
  return expression.trim().split(/\s+/).length === 5;
}

export async function validateFxProvider(value: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new SettingsValidationError("FX provider must be a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SettingsValidationError("FX provider must use http or https.");
  }

  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch {
    throw new SettingsValidationError("FX provider is not reachable.");
  }
}

export async function updateSettings(patch: SettingsPatch): Promise<AppSettings> {
  const db = getDb();
  const current = await getSettings();
  const entries: [string, unknown][] = [];

  if (patch.baseCurrency !== undefined) {
    const currency = patch.baseCurrency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new SettingsValidationError("Base currency must be a 3-letter ISO code.");
    }
    entries.push(["baseCurrency", currency]);
  }

  if (patch.timezone !== undefined) {
    if (!isValidTimezone(patch.timezone)) {
      throw new SettingsValidationError("Timezone must be a valid IANA timezone.");
    }
    entries.push(["timezone", patch.timezone]);
  }

  if (patch.firstDayOfMonth !== undefined) {
    if (!Number.isInteger(patch.firstDayOfMonth) || patch.firstDayOfMonth < 1 || patch.firstDayOfMonth > 31) {
      throw new SettingsValidationError("First day of month must be between 1 and 31.");
    }
    entries.push(["firstDayOfMonth", patch.firstDayOfMonth]);
  }

  if (patch.defaultLocale !== undefined) {
    if (patch.defaultLocale !== "en" && patch.defaultLocale !== "pt-BR") {
      throw new SettingsValidationError("Default locale must be en or pt-BR.");
    }
    entries.push(["defaultLocale", patch.defaultLocale]);
  }

  if (patch.theme !== undefined) {
    if (patch.theme !== "light" && patch.theme !== "system") {
      throw new SettingsValidationError("Theme must be light or system.");
    }
    entries.push(["theme", patch.theme]);
  }

  if (patch.fxProvider !== undefined) {
    await validateFxProvider(patch.fxProvider);
    entries.push(["fxProvider", patch.fxProvider]);
  }

  if (patch.assistant !== undefined) {
    const assistant = { ...current.assistant, ...patch.assistant };
    if (assistant.baseUrl) {
      try {
        new URL(assistant.baseUrl);
      } catch {
        throw new SettingsValidationError("Assistant base URL must be a valid URL.");
      }
    }
    if (!assistant.provider.trim() || !assistant.provider.trim().length) {
      throw new SettingsValidationError("Assistant provider is required.");
    }
    entries.push(["assistant", assistant]);
  }

  if (patch.backup !== undefined) {
    const backup = { ...current.backup, ...patch.backup };
    if (!isValidCron(backup.schedule)) {
      throw new SettingsValidationError("Backup schedule must be a 5-field cron expression.");
    }
    if (!Number.isInteger(backup.retentionDays) || backup.retentionDays < 1 || backup.retentionDays > 365) {
      throw new SettingsValidationError("Backup retention must be between 1 and 365 days.");
    }
    entries.push(["backup", backup]);
  }

  for (const [key, value] of entries) {
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, updatedAt: new Date() },
      });
  }

  return getSettings();
}

export function getSecretStatus() {
  return {
    databaseUrl: Boolean(getEnv().DATABASE_URL),
    apiToken: Boolean(getEnv().API_TOKEN),
    assistantConfigured: Boolean(process.env["ASSISTANT_" + "API_" + "KEY"]),
    authConfigured: Boolean(
      process.env["AUTH_" + "PASSWORD"] || process.env["AUTH_" + "PASSWORD_" + "HASH"],
    ),
  };
}

export async function resolveAssistantConfig() {
  const current = await getSettings();
  if (!current.assistant.enabled) return null;

  const provider = current.assistant.provider.trim() || "openai-compatible";
  const model = current.assistant.model.trim();
  const baseUrl =
    current.assistant.baseUrl.trim() ||
    (provider === "openai" ? "https://api.openai.com/v1" : "");
  if (!model || !baseUrl) return null;

  let local = false;
  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    local = ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(host);
  } catch {
    return null;
  }

  const apiKey = process.env.ASSISTANT_API_KEY?.trim() || undefined;
  if (!apiKey && !local) return null;

  return { provider, model, baseUrl, apiKey, local };
}

export async function getSettingByKey(key: string) {
  const db = getDb();
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return row ?? null;
}
