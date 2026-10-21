import "dotenv/config";
import { describe, expect, it } from "vitest";
import { closeDb } from "@/db";
import { collectExportData, createFullExport } from "./export";

describe.skipIf(!process.env.DATABASE_URL)("full export", () => {
  it("collects financial domains and omits secret-like settings", async () => {
    const { domains, manifest } = await collectExportData();
    expect(domains.accounts.length).toBeGreaterThan(0);
    expect(domains.transactions.length).toBeGreaterThan(0);
    expect(manifest.app).toBe("mirai-kin");
    expect(manifest.counts.accounts).toBe(domains.accounts.length);
    expect(
      domains.settings.every((row) => !/key|secret|token|password/i.test(row.key)),
    ).toBe(true);
    await closeDb();
  });

  it("builds a zip archive", async () => {
    const buffer = await createFullExport();
    expect(buffer.length).toBeGreaterThan(100);
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
    await closeDb();
  });
});
