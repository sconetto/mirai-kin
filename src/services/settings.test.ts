import "dotenv/config";
import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/db";
import { settings } from "@/db/schema";
import {
  getSecretStatus,
  getSettings,
  resolveAssistantConfig,
  SettingsValidationError,
  todayInTimeZone,
  updateSettings,
} from "./settings";

const KEYS = [
  "baseCurrency",
  "timezone",
  "firstDayOfMonth",
  "defaultLocale",
  "theme",
  "fxProvider",
  "assistant",
  "backup",
];

describe.skipIf(!process.env.DATABASE_URL)("settings", () => {
  let original: (typeof settings.$inferSelect)[] = [];

  beforeAll(async () => {
    const db = getDb();
    original = await db.select().from(settings).where(inArray(settings.key, KEYS));
    await db.delete(settings).where(inArray(settings.key, KEYS));
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(settings).where(inArray(settings.key, KEYS));
    if (original.length > 0) {
      await db
        .insert(settings)
        .values(original.map((row) => ({ key: row.key, value: row.value })));
    }
    await closeDb();
  });

  it("returns validated defaults when nothing is stored", async () => {
    const current = await getSettings();
    expect(current.baseCurrency).toMatch(/^[A-Z]{3}$/);
    expect(current.timezone).toBe("UTC");
    expect(current.firstDayOfMonth).toBe(1);
    expect(current.theme).toBe("system");
    expect(current.backup.enabled).toBe(true);
  });

  it("persists localized settings", async () => {
    await updateSettings({
      timezone: "UTC",
      firstDayOfMonth: 5,
      defaultLocale: "en",
      theme: "light",
    });
    const current = await getSettings();
    expect(current.timezone).toBe("UTC");
    expect(current.firstDayOfMonth).toBe(5);
    expect(current.defaultLocale).toBe("en");
    expect(current.theme).toBe("light");
  });

  it("rejects invalid values", async () => {
    await expect(updateSettings({ baseCurrency: "BR" })).rejects.toBeInstanceOf(
      SettingsValidationError,
    );
    await expect(updateSettings({ timezone: "Mars/Olympus" })).rejects.toBeInstanceOf(
      SettingsValidationError,
    );
    await expect(updateSettings({ firstDayOfMonth: 32 })).rejects.toBeInstanceOf(
      SettingsValidationError,
    );
    await expect(
      updateSettings({ backup: { schedule: "not-cron", retentionDays: 14 } }),
    ).rejects.toBeInstanceOf(SettingsValidationError);
    await expect(
      updateSettings({ backup: { schedule: "0 3 * * *", retentionDays: 0 } }),
    ).rejects.toBeInstanceOf(SettingsValidationError);
    await expect(updateSettings({ fxProvider: "not-a-url" })).rejects.toBeInstanceOf(
      SettingsValidationError,
    );
  });

  it("formats today in an IANA timezone", () => {
    expect(todayInTimeZone("America/Sao_Paulo")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("exposes secret status without values", () => {
    const secrets = getSecretStatus();
    expect(typeof secrets.databaseUrl).toBe("boolean");
    expect(typeof secrets.apiToken).toBe("boolean");
    expect(typeof secrets.assistantConfigured).toBe("boolean");
    expect(typeof secrets.authConfigured).toBe("boolean");
  });

  it("resolves assistant settings against the environment key", async () => {
    await updateSettings({
      assistant: {
        enabled: true,
        provider: "openai-compatible",
        model: "test-model",
        baseUrl: "http://localhost:11434/v1",
      },
    });
    const resolved = await resolveAssistantConfig();
    expect(resolved?.local).toBe(true);
    expect(resolved?.model).toBe("test-model");

    await updateSettings({ assistant: { enabled: false } });
    expect(await resolveAssistantConfig()).toBeNull();
  });
});
