import { getSession } from "@/lib/auth";
import { getTaxSummary } from "@/services/tax";

const quote = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const year = Number(new URL(request.url).searchParams.get("year") ?? new Date().getUTCFullYear());
  const summary = await getTaxSummary(year);

  const lines = [
    "section,label,value",
    ...summary.income.map((row) => `income,${quote(row.category)},${row.total.toFixed(2)}`),
    `deductible,deductible_expenses,${summary.deductible.toFixed(2)}`,
    `capital_gains,realized_capital_gains,${summary.capitalGains.toFixed(2)}`,
    `dividends,dividends,${summary.dividends.toFixed(2)}`,
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="tax-${year}.csv"`,
    },
  });
}
