import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { categoryTranslation } from "@/lib/category-translations";
import { getEnv } from "@/lib/env";
import { getDb } from "./index";
import { accounts, categories, users } from "./schema";
import { markTransferCategories, mergeDuplicateCategories } from "./category-maintenance";
import { ensureWalletCategoryGroups } from "./wallet-category-groups";

const SEED_CATEGORIES = [
  { name: "Salary", type: "income" },
  { name: "Other income", type: "income" },
  { name: "Groceries", type: "expense" },
  { name: "Transport", type: "expense" },
  { name: "Dining", type: "expense" },
  { name: "Housing", type: "expense" },
  { name: "Health", type: "expense" },
  { name: "Subscriptions", type: "expense" },
  { name: "Other", type: "expense" },
] as const;

/**
 * Idempotently ensure the single user exists, base categories are present,
 * and a default account exists. Safe to run on every boot.
 */
export async function ensureSeed(): Promise<void> {
  const env = getEnv();
  const db = getDb();

  const passwordHash =
    env.AUTH_PASSWORD_HASH ?? (await bcrypt.hash(env.AUTH_PASSWORD, 10));

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.username, env.AUTH_USERNAME))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(users).values({ username: env.AUTH_USERNAME, passwordHash });
  } else {
    await db.update(users).set({ passwordHash }).where(eq(users.id, existing[0].id));
  }

  for (const category of SEED_CATEGORIES) {
    const found = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.name, category.name))
      .limit(1);
    if (found.length === 0) {
      const translation = categoryTranslation(category.name);
      await db.insert(categories).values({
        name: category.name,
        nameEn: translation?.en ?? null,
        namePt: translation?.pt ?? null,
        type: category.type,
        isSystem: false,
      });
    }
  }

  const existingCategories = await db
    .select({
      id: categories.id,
      name: categories.name,
      nameEn: categories.nameEn,
      namePt: categories.namePt,
      isSystem: categories.isSystem,
    })
    .from(categories);
  for (const category of existingCategories) {
    if (category.isSystem) continue;
    const translation = categoryTranslation(category.name);
    if (!translation) continue;
    if (category.nameEn === translation.en && category.namePt === translation.pt) continue;
    await db
      .update(categories)
      .set({ nameEn: translation.en, namePt: translation.pt })
      .where(eq(categories.id, category.id));
  }

  await mergeDuplicateCategories();
  await ensureWalletCategoryGroups();
  const markedTransfers = await markTransferCategories();
  if (markedTransfers > 0) {
    console.log(`[categories] marked ${markedTransfers} Wallet transfer rows`);
  }

  const anyAccount = await db.select({ id: accounts.id }).from(accounts).limit(1);
  if (anyAccount.length === 0) {
    await db.insert(accounts).values({
      name: "Main",
      type: "checking",
      currency: env.BASE_CURRENCY,
      openingBalance: "0",
    });
  }
}
