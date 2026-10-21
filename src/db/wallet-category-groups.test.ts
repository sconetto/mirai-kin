import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/db";
import { categories } from "@/db/schema";
import {
  ensureWalletCategoryGroups,
  isWalletGroupCategory,
  WALLET_GROUP_EXTERNAL_PREFIX,
} from "./wallet-category-groups";

describe("wallet category groups", () => {
  it("recognizes synthetic group parents", () => {
    expect(isWalletGroupCategory({ externalId: `${WALLET_GROUP_EXTERNAL_PREFIX}housing` })).toBe(
      true,
    );
    expect(isWalletGroupCategory({ externalId: "wallet_entity_123" })).toBe(false);
    expect(isWalletGroupCategory({ externalId: null })).toBe(false);
  });
});

describe.skipIf(!process.env.DATABASE_URL)("wallet category group backfill", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("is idempotent and keeps existing categories parented", async () => {
    await ensureWalletCategoryGroups();
    const first = await getDb()
      .select({ id: categories.id, externalId: categories.externalId })
      .from(categories);
    await ensureWalletCategoryGroups();
    const second = await getDb()
      .select({ id: categories.id, externalId: categories.externalId, parentId: categories.parentId })
      .from(categories);

    const firstGroups = first.filter((row) =>
      row.externalId?.startsWith(WALLET_GROUP_EXTERNAL_PREFIX),
    );
    const groups = second.filter((row) => row.externalId?.startsWith(WALLET_GROUP_EXTERNAL_PREFIX));
    const groupIds = new Set(groups.map((row) => row.id));
    expect(groups.length).toBeGreaterThan(0);
    expect(groups.map((row) => row.id).sort()).toEqual(firstGroups.map((row) => row.id).sort());
    expect(second.filter((row) => row.parentId && groupIds.has(row.parentId)).length).toBeGreaterThan(
      0,
    );
  });
});
