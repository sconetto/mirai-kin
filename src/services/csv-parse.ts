import Papa from "papaparse";

const ALIASES: Record<string, string[]> = {
  date: ["date", "data", "transaction date", "data da transação", "data da transacao"],
  amount: ["amount", "valor", "value"],
  currency: ["currency", "moeda"],
  category: ["category", "categoria"],
  note: ["note", "notes", "description", "descrição", "descricao", "memo"],
  account: ["account", "conta"],
  paymentType: ["payment type", "payment_type", "tipo de pagamento", "forma de pagamento"],
  counterparty: ["counterparty", "payee", "beneficiário", "beneficiario", "contraparte"],
};

function normalize(header: string): string {
  return header.trim().toLowerCase();
}

export function pick(row: Record<string, string>, field: keyof typeof ALIASES): string | undefined {
  const wanted = ALIASES[field];
  for (const [header, value] of Object.entries(row)) {
    if (wanted.includes(normalize(header)) && value !== undefined && value !== "") {
      return value;
    }
  }
  return undefined;
}

export type ParsedCsvRow = {
  rowNumber: number;
  recordDate: Date;
  amount: string;
  currency?: string;
  categoryName?: string;
  note?: string;
  paymentType?: string;
  counterparty?: string;
};

export type CsvParseError = { rowNumber: number; error: string };

/**
 * Pure CSV parsing/normalization (no database access), so it can be unit-tested
 * and reused by importers.
 */
export function parseCsvRows(csv: string): {
  rows: ParsedCsvRow[];
  errors: CsvParseError[];
} {
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });

  const rows: ParsedCsvRow[] = [];
  const errors: CsvParseError[] = [];

  (parsed.data ?? []).forEach((raw, index) => {
    const rowNumber = index + 2;
    try {
      const rawDate = pick(raw, "date");
      const rawAmount = pick(raw, "amount");
      if (!rawDate || !rawAmount) {
        throw new Error("Missing required date or amount column");
      }

      const recordDate = new Date(rawDate);
      if (Number.isNaN(recordDate.getTime())) {
        throw new Error(`Invalid date: ${rawDate}`);
      }

      rows.push({
        rowNumber,
        recordDate,
        amount: rawAmount,
        currency: pick(raw, "currency"),
        categoryName: pick(raw, "category"),
        note: pick(raw, "note"),
        paymentType: pick(raw, "paymentType"),
        counterparty: pick(raw, "counterparty"),
      });
    } catch (error) {
      errors.push({ rowNumber, error: (error as Error).message });
    }
  });

  return { rows, errors };
}
