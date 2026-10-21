import { getSession } from "@/lib/auth";
import { getReport, reportToCsv } from "@/services/reports";
import type { ReportType } from "@/services/reports";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const now = new Date();
  const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
  const defaultTo = now.toISOString().slice(0, 10);

  const type = (url.searchParams.get("type") ?? "cashflow") as ReportType;
  const from = url.searchParams.get("from") ?? defaultFrom;
  const to = url.searchParams.get("to") ?? defaultTo;

  const report = await getReport({ type, from, to });
  const csv = reportToCsv(report);

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="report-${type}-${from}-${to}.csv"`,
    },
  });
}
