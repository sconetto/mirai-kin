import { getDb } from "@/db";
import { accounts, categories } from "@/db/schema";
import type { PaymentType } from "@/db/schema";
import { parseCsvRows } from "./csv-parse";
import { createTransaction } from "./transactions";

export type CsvImportResult = {
  row: number;
  success: boolean;
  id?: string;
  error?: string;
};

export async function importCsv(csv: string, options: { accountId?: string } = {}) {
  const { rows, errors } = parseCsvRows(csv);
  const db = getDb();

  let accountId = options.accountId;
  if (!accountId) {
    const [first] = await db.select({ id: accounts.id }).from(accounts).limit(1);
    if (!first) {
      throw new Error("No account available for import");
    }
    accountId = first.id;
  }

  const categoryRows = await db.select().from(categories);
  const categoryByName = new Map<string, string>();
  for (const category of categoryRows) {
    categoryByName.set(category.name.toLowerCase(), category.id);
    if (category.nameEn) categoryByName.set(category.nameEn.toLowerCase(), category.id);
    if (category.namePt) categoryByName.set(category.namePt.toLowerCase(), category.id);
  }

  const results: CsvImportResult[] = errors.map((error) => ({
    row: error.rowNumber,
    success: false,
    error: error.error,
  }));

  for (const row of rows) {
    try {
      const transaction = await createTransaction({
        accountId,
        amount: row.amount,
        currency: row.currency,
        recordDate: row.recordDate.toISOString(),
        note: row.note ?? null,
        paymentType: (row.paymentType as PaymentType | undefined) ?? null,
        counterparty: row.counterparty ?? null,
        categoryId: row.categoryName
          ? (categoryByName.get(row.categoryName.toLowerCase()) ?? null)
          : null,
      });
      results.push({ row: row.rowNumber, success: true, id: transaction.id });
    } catch (error) {
      results.push({ row: row.rowNumber, success: false, error: (error as Error).message });
    }
  }

  results.sort((a, b) => a.row - b.row);
  const succeeded = results.filter((result) => result.success).length;

  return {
    summary: { total: results.length, succeeded, failed: results.length - succeeded },
    results,
  };
}
