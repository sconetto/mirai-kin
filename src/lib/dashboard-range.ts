export const DASHBOARD_RANGES = ["1m", "6m", "1y", "all", "plan"] as const;
export type DashboardRange = (typeof DASHBOARD_RANGES)[number];

export const DEFAULT_DASHBOARD_RANGE: DashboardRange = "1y";

export function parseDashboardRange(value: string | string[] | undefined): DashboardRange {
  const candidate = Array.isArray(value) ? value[0] : value;
  return (DASHBOARD_RANGES as readonly string[]).includes(candidate ?? "")
    ? (candidate as DashboardRange)
    : DEFAULT_DASHBOARD_RANGE;
}

export function historyMonths(range: DashboardRange): number | null {
  switch (range) {
    case "1m":
      return 1;
    case "6m":
      return 6;
    case "1y":
      return 12;
    default:
      return null;
  }
}

export function projectionMonths(range: DashboardRange): number {
  switch (range) {
    case "1m":
      return 12;
    case "6m":
      return 24;
    case "1y":
      return 36;
    case "all":
      return 60;
    case "plan":
      return 120;
  }
}

export function paceMonths(range: DashboardRange): number {
  switch (range) {
    case "1m":
      return 1;
    case "6m":
      return 6;
    default:
      return 12;
  }
}

export function shiftMonths(date: Date, months: number): Date {
  const shifted = new Date(date);
  shifted.setUTCMonth(shifted.getUTCMonth() + months);
  return shifted;
}
