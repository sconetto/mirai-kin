import { getSession } from "@/lib/auth";
import { getBrokerageSummary } from "@/services/brokerage";

const quote = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

export async function GET() {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const summary = await getBrokerageSummary();
  const symbolById = new Map(summary.positions.map((position) => [position.id, position.symbol]));
  const lines = ["section,symbol,currency,quantity,value,realized_gain,date"];

  for (const position of summary.positions) {
    lines.push(
      `position,${quote(position.symbol)},${position.currency},${position.quantity},${position.value},,`,
    );
  }
  for (const sale of summary.sales) {
    lines.push(
      `sale,${quote(sale.symbol)},${sale.currency},${sale.quantity},,${sale.gain.toFixed(2)},${sale.soldAt}`,
    );
  }
  for (const dividend of summary.dividends) {
    lines.push(
      `dividend,${quote(symbolById.get(dividend.positionId) ?? dividend.positionId)},${dividend.currency},,,${Number(dividend.amount).toFixed(2)},${dividend.date}`,
    );
  }

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="brokerage-export.csv"',
    },
  });
}
