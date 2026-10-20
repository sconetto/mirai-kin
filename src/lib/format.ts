export function intlLocale(locale: string): string {
  return locale === "en" ? "en-US" : "pt-BR";
}

export function formatCurrency(value: string | number, currency: string, locale: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  try {
    return new Intl.NumberFormat(intlLocale(locale), {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatNumber(value: string | number, locale: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 4 }).format(amount);
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function formatDate(value: string | Date, locale: string): string {
  const isDateOnly = typeof value === "string" && DATE_ONLY.test(value);
  const date =
    typeof value === "string"
      ? new Date(isDateOnly ? `${value}T00:00:00.000Z` : value)
      : value;

  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: "medium",
    ...(isDateOnly ? { timeZone: "UTC" } : {}),
  }).format(date);
}

export function formatMonth(value: string, locale: string): string {
  const date = new Date(`${value}-01T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(intlLocale(locale), {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
