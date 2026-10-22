import type { AssistantCitation } from "@/db/schema";

export type ResolvedAssistantCitation = AssistantCitation & { href: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REPORT_TYPES = new Set(["cashflow", "income", "expenses", "transfers", "breakdown"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function reportHref(id: string): string | null {
  const [type, from, to] = id.split(":");
  if (!type || !REPORT_TYPES.has(type) || !ISO_DATE.test(from ?? "") || !ISO_DATE.test(to ?? "")) {
    return null;
  }
  return `/spending/reports?type=${encodeURIComponent(type)}&from=${from}&to=${to}`;
}

export function citationHref(citation: AssistantCitation): string | null {
  if (citation.type === "report") return reportHref(citation.id);
  if (!UUID.test(citation.id)) return null;

  switch (citation.type) {
    case "account":
      return `/accounts?account=${citation.id}`;
    case "transaction":
      return `/spending/transactions?status=all#transaction-${citation.id}`;
    case "goal":
      return `/planner#goal-${citation.id}`;
    case "budget":
      return `/spending/budgets#budget-${citation.id}`;
    case "category":
      return `/spending?category=${citation.id}`;
    default:
      return null;
  }
}

export function resolveCitations(
  citations: AssistantCitation[] | null | undefined,
): ResolvedAssistantCitation[] {
  return (citations ?? []).map((citation) => ({
    ...citation,
    href: citationHref(citation),
  }));
}
