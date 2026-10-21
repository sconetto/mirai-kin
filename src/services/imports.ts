import { createHash } from "node:crypto";
import Papa from "papaparse";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  accounts,
  brokerageLots,
  brokerageSales,
  categories,
  dividends,
  importBatches,
  importProfiles,
  importRows,
  investmentPositions,
  transactions,
} from "@/db/schema";
import type { ImportSource } from "@/db/schema";
import { createTransaction } from "./transactions";
import { backfillTransfers } from "./transfers";
import { findCategory } from "@/lib/category-match";
import { applyImportBalance } from "./reconciliation";
import { firstMatch, listRules } from "./rules";

export type ImportField =
  | "date"
  | "amount"
  | "currency"
  | "category"
  | "note"
  | "paymentType"
  | "counterparty";

const ALIASES: Record<ImportField, string[]> = {
  date: ["date", "data", "transaction date", "data da transação", "data da transacao"],
  amount: ["amount", "valor", "value"],
  currency: ["currency", "moeda"],
  category: ["category", "categoria"],
  note: ["note", "notes", "description", "descrição", "descricao", "memo"],
  paymentType: ["payment type", "payment_type", "tipo de pagamento", "forma de pagamento"],
  counterparty: ["counterparty", "payee", "beneficiário", "beneficiario", "contraparte"],
};

export type ImportMapping = Partial<Record<ImportField, string>>;

export type NormalizedTransaction = {
  kind: "transaction";
  recordDate: string;
  amount: string;
  currency?: string;
  categoryName?: string;
  note?: string;
  paymentType?: string;
  counterparty?: string;
  externalId?: string;
  rule?: {
    id: string;
    name: string;
    categoryId?: string | null;
    markReviewed?: boolean;
    isDeductible?: boolean;
  };
};

export type NormalizedBrokerage = {
  kind: "lot" | "sale" | "dividend";
  symbol: string;
  date: string;
  quantity?: string;
  price?: string;
  amount?: string;
  fees?: string;
  currency?: string;
};

export type NormalizedRow = NormalizedTransaction | NormalizedBrokerage;

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function pickField(
  row: Record<string, string>,
  field: ImportField,
  mapping?: ImportMapping,
): string | undefined {
  const mapped = mapping?.[field];
  if (mapped && row[mapped]) return row[mapped];

  for (const [header, value] of Object.entries(row)) {
    if (ALIASES[field].includes(header.trim().toLowerCase()) && value) return value;
  }
  return undefined;
}

export function detectMapping(headers: string[]): ImportMapping {
  const row = Object.fromEntries(headers.map((header) => [header, header]));
  const mapping: ImportMapping = {};
  for (const field of Object.keys(ALIASES) as ImportField[]) {
    const value = pickField(row, field);
    if (value) mapping[field] = value;
  }
  return mapping;
}

function parseOfxDate(value: string): string {
  const digits = value.replace(/[^0-9]/g, "").slice(0, 8);
  if (digits.length !== 8) return "";
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function ofxTag(block: string, name: string): string {
  const match = block.match(new RegExp(`<${name}>([^<\\r\\n]*)`, "i"));
  return match?.[1]?.trim() ?? "";
}

export function parseOfx(content: string): NormalizedTransaction[] {
  const blocks = content.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? [];
  return blocks.map((block) => ({
    kind: "transaction" as const,
    recordDate: parseOfxDate(ofxTag(block, "DTPOSTED")),
    amount: ofxTag(block, "TRNAMT"),
    note: ofxTag(block, "MEMO") || undefined,
    counterparty: ofxTag(block, "NAME") || undefined,
    externalId: ofxTag(block, "FITID") || undefined,
  }));
}

function parseCsv(content: string, mapping?: ImportMapping): NormalizedTransaction[] {
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  });

  return (parsed.data ?? []).map((row) => ({
    kind: "transaction" as const,
    recordDate: pickField(row, "date", mapping) ?? "",
    amount: pickField(row, "amount", mapping) ?? "",
    currency: pickField(row, "currency", mapping),
    categoryName: pickField(row, "category", mapping),
    note: pickField(row, "note", mapping),
    paymentType: pickField(row, "paymentType", mapping),
    counterparty: pickField(row, "counterparty", mapping),
  }));
}

function parseBrokerageCsv(content: string): NormalizedBrokerage[] {
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  });

  return (parsed.data ?? []).map((row) => {
    const type = (row.type ?? row.tipo ?? "buy").toLowerCase();
    const kind: NormalizedBrokerage["kind"] =
      type.includes("sell") || type.includes("venda")
        ? "sale"
        : type.includes("div") || type.includes("provento")
          ? "dividend"
          : "lot";
    return {
      kind,
      symbol: (row.symbol ?? row.ticker ?? row.ativo ?? "").toUpperCase(),
      date: row.date ?? row.data ?? "",
      quantity: row.quantity ?? row.quantidade,
      price: row.price ?? row.preco ?? row.preço,
      amount: row.amount ?? row.valor,
      fees: row.fees ?? row.taxas,
      currency: row.currency ?? row.moeda,
    };
  });
}

function normalizeDate(value: string): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

async function findDuplicate(accountId: string, row: NormalizedTransaction): Promise<boolean> {
  const db = getDb();
  const date = normalizeDate(row.recordDate);
  if (!date) return false;
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(`${date}T23:59:59.999Z`);
  const conditions = [
    eq(transactions.accountId, accountId),
    gte(transactions.recordDate, start),
    lte(transactions.recordDate, end),
    eq(transactions.amount, row.amount),
  ];
  if (row.counterparty) {
    conditions.push(sql`lower(coalesce(${transactions.counterparty}, '')) = ${row.counterparty.toLowerCase()}`);
  } else if (row.note) {
    conditions.push(sql`lower(coalesce(${transactions.note}, '')) = ${row.note.toLowerCase()}`);
  }
  const [existing] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(...conditions))
    .limit(1);
  return Boolean(existing);
}

export async function stageImport(input: {
  source: ImportSource;
  content: string;
  fileName?: string;
  accountId?: string;
  mapping?: ImportMapping;
  openingBalance?: string;
  currentBalance?: string;
}) {
  const db = getDb();
  const fileHash = hash(input.content);

  const [existingBatch] = await db
    .select()
    .from(importBatches)
    .where(and(eq(importBatches.fileHash, fileHash), eq(importBatches.status, "committed")))
    .limit(1);
  if (existingBatch) {
    return { batch: existingBatch, rows: [], duplicateImport: true };
  }

  const [account] = input.accountId
    ? await db.select().from(accounts).where(eq(accounts.id, input.accountId)).limit(1)
    : await db.select().from(accounts).limit(1);
  const accountId = input.accountId ?? account?.id;

  const [batch] = await db
    .insert(importBatches)
    .values({
      source: input.source,
      fileName: input.fileName ?? null,
      fileHash,
      accountId: accountId ?? null,
      status: "staged",
      openingBalance: input.openingBalance ?? null,
      currentBalance: input.currentBalance ?? null,
    })
    .returning();

  const normalizedRows: NormalizedRow[] =
    input.source === "ofx"
      ? parseOfx(input.content)
      : input.source === "brokerage_csv"
        ? parseBrokerageCsv(input.content)
        : parseCsv(input.content, input.mapping);

  const rules = await listRules();
  const inserted = [];

  for (let index = 0; index < normalizedRows.length; index += 1) {
    const normalized = normalizedRows[index];
    let status: "valid" | "invalid" | "duplicate" = "valid";
    let error: string | null = null;

    if (normalized.kind === "transaction") {
      const date = normalizeDate(normalized.recordDate);
      if (!date) error = "Invalid date";
      else if (!normalized.amount || Number.isNaN(Number(normalized.amount))) error = "Invalid amount";
      else if (!accountId) error = "No account selected";
      else {
        normalized.recordDate = date;
        if (await findDuplicate(accountId, normalized)) status = "duplicate";
      }
    } else {
      const date = normalizeDate(normalized.date);
      if (!normalized.symbol) error = "Missing symbol";
      else if (!date) error = "Invalid date";
      else if (normalized.kind === "dividend" && !normalized.amount) error = "Missing dividend amount";
      else if (normalized.kind !== "dividend" && (!normalized.quantity || !normalized.price)) {
        error = "Missing quantity or price";
      } else {
        normalized.date = date;
      }
    }

    if (error) status = "invalid";

    if (normalized.kind === "transaction" && status !== "invalid" && accountId) {
      const match = firstMatch(
        {
          accountId,
          amount: normalized.amount,
          counterparty: normalized.counterparty,
          note: normalized.note,
          paymentType: normalized.paymentType,
          categoryId: null,
        },
        rules,
      );
      if (match) {
        normalized.rule = {
          id: match.ruleId,
          name: match.ruleName,
          categoryId: match.actions.categoryId ?? null,
          markReviewed: match.actions.markReviewed,
          isDeductible: match.actions.isDeductible,
        };
      }
    }

    const fingerprint =
      normalized.kind === "transaction"
        ? hash(
            `${accountId}|${normalized.recordDate}|${normalized.amount}|${normalized.counterparty ?? ""}|${normalized.note ?? ""}`,
          )
        : hash(`${normalized.kind}|${normalized.symbol}|${normalized.date}|${normalized.quantity ?? ""}|${normalized.price ?? ""}`);

    const [row] = await db
      .insert(importRows)
      .values({
        batchId: batch.id,
        rowNumber: index + 2,
        raw: normalized as unknown as object,
        normalized: normalized as unknown as object,
        status,
        error,
        fingerprint,
      })
      .returning();
    inserted.push(row);
  }

  return { batch, rows: inserted, duplicateImport: false };
}

export async function listBatches() {
  const db = getDb();
  return db.select().from(importBatches).orderBy(desc(importBatches.createdAt)).limit(50);
}

export async function getBatch(id: string) {
  const db = getDb();
  const [batch] = await db.select().from(importBatches).where(eq(importBatches.id, id)).limit(1);
  if (!batch) return null;
  const rows = await db
    .select()
    .from(importRows)
    .where(eq(importRows.batchId, id))
    .orderBy(importRows.rowNumber);
  return { batch, rows };
}

export async function discardBatch(id: string) {
  const db = getDb();
  await db.delete(importBatches).where(eq(importBatches.id, id));
}

async function recomputePosition(positionId: string) {
  const db = getDb();
  const [position] = await db
    .select()
    .from(investmentPositions)
    .where(eq(investmentPositions.id, positionId))
    .limit(1);
  if (!position) return;

  const lots = await db.select().from(brokerageLots).where(eq(brokerageLots.positionId, positionId));
  const sales = await db.select().from(brokerageSales).where(eq(brokerageSales.positionId, positionId));

  const lotsQuantity = lots.reduce((sum, lot) => sum + Number(lot.quantity), 0);
  const salesQuantity = sales.reduce((sum, sale) => sum + Number(sale.quantity), 0);
  const totalCost = lots.reduce(
    (sum, lot) => sum + Number(lot.quantity) * Number(lot.costPerUnit) + Number(lot.fees),
    0,
  );
  const quantity = Math.max(0, lotsQuantity - salesQuantity);
  const avgCost = lotsQuantity > 0 ? totalCost / lotsQuantity : 0;

  await db
    .update(investmentPositions)
    .set({
      quantity: quantity.toFixed(8),
      avgCost: avgCost.toFixed(4),
      updatedAt: new Date(),
    })
    .where(eq(investmentPositions.id, positionId));
}

async function commitBrokerageRow(normalized: NormalizedBrokerage, accountId: string | null) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(investmentPositions)
    .where(eq(investmentPositions.symbol, normalized.symbol))
    .limit(1);

  let position = existing;
  if (!position) {
    if (!accountId) throw new Error("No account selected for brokerage import");
    const [created] = await db
      .insert(investmentPositions)
      .values({
        accountId,
        symbol: normalized.symbol,
        name: normalized.symbol,
        instrumentType: "stock",
        quantity: "0",
        avgCost: "0",
        currency: normalized.currency ?? "BRL",
      })
      .returning();
    position = created;
  }

  if (normalized.kind === "lot") {
    await db.insert(brokerageLots).values({
      positionId: position.id,
      acquiredAt: normalized.date,
      quantity: normalized.quantity ?? "0",
      costPerUnit: normalized.price ?? "0",
      fees: normalized.fees ?? "0",
      currency: normalized.currency ?? position.currency,
    });
  } else if (normalized.kind === "sale") {
    await db.insert(brokerageSales).values({
      positionId: position.id,
      soldAt: normalized.date,
      quantity: normalized.quantity ?? "0",
      price: normalized.price ?? "0",
      fees: normalized.fees ?? "0",
      currency: normalized.currency ?? position.currency,
    });
  } else {
    await db.insert(dividends).values({
      positionId: position.id,
      date: normalized.date,
      amount: normalized.amount ?? "0",
      currency: normalized.currency ?? position.currency,
    });
  }

  await recomputePosition(position.id);
  return position.id;
}

export async function commitBatch(batchId: string, rowIds?: string[]) {
  const db = getDb();
  const [batch] = await db.select().from(importBatches).where(eq(importBatches.id, batchId)).limit(1);
  if (!batch) throw new Error("Import batch not found");

  const rows = await db.select().from(importRows).where(eq(importRows.batchId, batchId));
  const selected = rowIds ? new Set(rowIds) : null;

  const categoryRows = await db.select().from(categories);
  const rules = await listRules();

  const results: { row: number; success: boolean; id?: string; error?: string }[] = [];
  const createdTransactionIds: string[] = [];
  let importedTotal = 0;

  for (const row of rows) {
    if (row.status === "committed") continue;
    if (selected && !selected.has(row.id)) continue;
    if (!selected && row.status === "invalid") continue;

    const normalized = row.normalized as unknown as NormalizedRow;
    try {
      if (normalized.kind === "transaction") {
        if (!batch.accountId) throw new Error("No account selected");
        const category = normalized.categoryName
          ? findCategory(categoryRows, normalized.categoryName, Number(normalized.amount))
          : null;
        const baseCategoryId = category?.id ?? null;
        const transferCategory = category?.name === "Transfer";
        const match = firstMatch(
          {
            accountId: batch.accountId,
            amount: normalized.amount,
            counterparty: normalized.counterparty,
            note: normalized.note,
            paymentType: normalized.paymentType,
            categoryId: baseCategoryId,
          },
          rules,
        );
        const categoryId =
          match && match.actions.categoryId !== undefined
            ? match.actions.categoryId
            : baseCategoryId;
        const transaction = await createTransaction({
          accountId: batch.accountId,
          amount: normalized.amount,
          currency: normalized.currency,
          recordDate: `${normalized.recordDate}T12:00:00.000Z`,
          note: normalized.note ?? null,
          paymentType: transferCategory
            ? "transfer"
            : ((normalized.paymentType as never) ?? null),
          counterparty: normalized.counterparty ?? null,
          categoryId,
          labelIds: match?.actions.labelIds ?? [],
          isDeductible: match?.actions.isDeductible,
          reviewStatus: match?.actions.markReviewed ? "reviewed" : "pending",
        });
        if (match) {
          await db
            .update(transactions)
            .set({ appliedRuleId: match.ruleId })
            .where(eq(transactions.id, transaction.id));
        }
        createdTransactionIds.push(transaction.id);
        importedTotal += Number(normalized.amount);
        results.push({ row: row.rowNumber, success: true, id: transaction.id });
      } else {
        const positionId = await commitBrokerageRow(normalized, batch.accountId);
        results.push({ row: row.rowNumber, success: true, id: positionId });
      }
      await db
        .update(importRows)
        .set({ status: "committed" })
        .where(eq(importRows.id, row.id));
    } catch (error) {
      results.push({ row: row.rowNumber, success: false, error: (error as Error).message });
    }
  }

  if (createdTransactionIds.length > 0) {
    await backfillTransfers(createdTransactionIds);
  }

  if (batch.accountId && (batch.openingBalance !== null || batch.currentBalance !== null)) {
    await applyImportBalance({
      accountId: batch.accountId,
      openingBalance: batch.openingBalance,
      currentBalance: batch.currentBalance,
      importedTotal,
    });
  }

  await db
    .update(importBatches)
    .set({ status: "committed", committedAt: new Date() })
    .where(eq(importBatches.id, batchId));

  const succeeded = results.filter((result) => result.success).length;
  return {
    summary: { total: results.length, succeeded, failed: results.length - succeeded },
    results,
  };
}

export async function listProfiles() {
  const db = getDb();
  return db.select().from(importProfiles).orderBy(importProfiles.createdAt);
}

export async function saveProfile(name: string, source: ImportSource, mapping: ImportMapping) {
  const db = getDb();
  const [row] = await db.insert(importProfiles).values({ name, source, mapping }).returning();
  return row;
}

export async function deleteProfile(id: string) {
  const db = getDb();
  await db.delete(importProfiles).where(eq(importProfiles.id, id));
}
