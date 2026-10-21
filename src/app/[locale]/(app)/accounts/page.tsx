import { getTranslations, setRequestLocale } from "next-intl/server";
import { ACCOUNT_TYPES, ASSET_SUBTYPES, OWNERSHIP_TYPES } from "@/db/schema";
import type { AccountType, AssetSubtype } from "@/db/schema";
import { BalanceChart } from "@/components/charts/balance-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { AccountEditForm } from "@/components/account-edit-form";
import { PageHeader } from "@/components/ui/page-header";
import { Link } from "@/i18n/navigation";
import { formatCurrency, formatNumber } from "@/lib/format";
import { listAccountBalances, listAccountGrowth } from "@/services/accounts";
import { overview } from "@/services/analytics";
import { getBaseCurrency } from "@/services/settings";
import { setAccountArchivedAction } from "../actions";

type Search = {
  ownership?: string;
  type?: string;
  assetSubtype?: string;
  account?: string;
};

export default async function AccountsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Search>;
}) {
  const { locale } = await params;
  const search = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("accounts");
  const tc = await getTranslations("common");
  const te = await getTranslations("enums");
  const [allAccounts, analytics, growth, baseCurrency] = await Promise.all([
    listAccountBalances(),
    overview(),
    listAccountGrowth(),
    getBaseCurrency(),
  ]);

  const ownership =
    search.ownership === "personal" || search.ownership === "company"
      ? search.ownership
      : undefined;
  const type = (ACCOUNT_TYPES as readonly string[]).includes(search.type ?? "")
    ? (search.type as AccountType)
    : undefined;
  const subtypeApplicable = !type || type === "investment" || type === "asset";
  const assetSubtype =
    subtypeApplicable && (ASSET_SUBTYPES as readonly string[]).includes(search.assetSubtype ?? "")
      ? (search.assetSubtype as AssetSubtype)
      : undefined;
  const matchesFilters = (account: (typeof allAccounts)[number]) =>
    (!ownership || account.ownershipType === ownership) &&
    (!type || account.type === type) &&
    (!assetSubtype || account.assetSubtype === assetSubtype);
  const activeAccounts = allAccounts.filter(
    (account) => !account.archived && matchesFilters(account),
  );
  const archivedAccounts = allAccounts.filter(
    (account) => account.archived && matchesFilters(account),
  );
  const selected = search.account
    ? (allAccounts.find((account) => account.id === search.account) ?? null)
    : null;
  const activeIds = new Set(activeAccounts.map((account) => account.id));
  const chartData = analytics.balances
    .filter((account) => activeIds.has(account.id))
    .map((account) => ({
      id: account.id,
      name: account.name,
      total: Number(account.baseBalance),
      type: account.type,
      ownershipType: account.ownershipType,
      assetSubtype: account.assetSubtype,
    }));
  const growthRows = growth.filter((row) => activeIds.has(row.accountId));

  const filterParams = new URLSearchParams();
  if (ownership) filterParams.set("ownership", ownership);
  if (type) filterParams.set("type", type);
  if (assetSubtype) filterParams.set("assetSubtype", assetSubtype);
  const filterQuery = filterParams.toString();
  const listHref = `/accounts${filterQuery ? `?${filterQuery}` : ""}`;

  const ownershipLabel = (value: string) =>
    value === "company" ? t("ownershipCompany") : t("ownershipPersonal");
  const editHref = (accountId: string) => {
    const params = new URLSearchParams(filterQuery);
    params.set("account", accountId);
    return `/accounts?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")}>
        <Link
          href="/import"
          className="whitespace-nowrap rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-paper"
        >
          {t("importAccounts")}
        </Link>
      </PageHeader>

      <p className="text-xs text-ink-3">{t("importHint")}</p>

      {selected ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {t("editAccount")} · {selected.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AccountEditForm account={selected} locale={locale} cancelHref={listHref} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("balanceChart")}</CardTitle>
          <p className="mt-1 text-xs text-ink-3">
            {t("chartBaseCurrency", { currency: baseCurrency })}
          </p>
        </CardHeader>
        <CardContent>
          <form
            method="get"
            className="grid gap-3 border-b border-line/70 pb-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <label className="text-xs text-ink-3">
              {t("ownership")}
              <Select name="ownership" defaultValue={ownership ?? ""} className="mt-1">
                <option value="">{t("allOwnership")}</option>
                {OWNERSHIP_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {ownershipLabel(value)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-xs text-ink-3">
              {tc("type")}
              <Select name="type" defaultValue={type ?? ""} className="mt-1">
                <option value="">{t("allTypes")}</option>
                {ACCOUNT_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {te(`accountType.${value}`)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-xs text-ink-3">
              {t("assetSubtype")}
              <Select
                name="assetSubtype"
                defaultValue={assetSubtype ?? ""}
                disabled={!subtypeApplicable}
                className="mt-1"
              >
                <option value="">{t("allSubtypes")}</option>
                {ASSET_SUBTYPES.map((value) => (
                  <option key={value} value={value}>
                    {t(`assetSubtypeLabels.${value}` as never)}
                  </option>
                ))}
              </Select>
            </label>
            <div className="flex items-end gap-3">
              <Button type="submit" size="sm" variant="secondary">
                {t("applyFilters")}
              </Button>
              {filterQuery ? (
                <Link
                  href="/accounts"
                  className="pb-2 text-sm font-medium text-ink-3 hover:text-ink"
                >
                  {t("clearFilters")}
                </Link>
              ) : null}
            </div>
          </form>
          <div className="pt-4">
            <BalanceChart data={chartData} locale={locale} currency={baseCurrency} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {activeAccounts.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-3">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs font-medium text-ink-3">
                  <tr>
                    <th className="py-2 pr-4">{tc("name")}</th>
                    <th className="py-2 pr-4">{tc("type")}</th>
                    <th className="py-2 pr-4">{t("ownership")}</th>
                    <th className="py-2 pr-4">{tc("currency")}</th>
                    <th className="py-2 pr-4 text-right">{t("balance")}</th>
                    <th className="py-2 pr-4">{t("creditLimit")}</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {activeAccounts.map((account) => (
                    <tr key={account.id} className="align-top">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-ink">{account.name}</p>
                        {account.assetSubtype ? (
                          <p className="mt-0.5 text-xs text-ink-3">
                            {t(`assetSubtypeLabels.${account.assetSubtype}` as never)}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4 text-ink-2">{te(`accountType.${account.type}`)}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={account.ownershipType === "company" ? "warning" : "neutral"}>
                          {ownershipLabel(account.ownershipType)}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-ink-2">{account.currency}</td>
                      <td className="py-3 pr-4 text-right font-medium text-ink">
                        {formatCurrency(account.balance, account.currency, locale)}
                      </td>
                      <td className="py-3 pr-4">
                        {account.type === "credit_card" ? (
                          <div className="min-w-36">
                            <p className="text-xs text-ink-2">
                              {formatCurrency(account.creditUsed ?? 0, account.currency, locale)} /{" "}
                              {account.creditLimit
                                ? formatCurrency(account.creditLimit, account.currency, locale)
                                : t("noLimit")}
                            </p>
                            {account.creditUtilization !== null ? (
                              <div className="mt-1 flex items-center gap-2">
                                <div className="h-1.5 w-20 rounded-full bg-paper">
                                  <div
                                    className="h-full rounded-full bg-accent"
                                    style={{
                                      width: `${Math.min(100, Math.max(0, account.creditUtilization))}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-[11px] text-ink-3">
                                  {formatNumber(account.creditUtilization, locale)}%
                                </span>
                              </div>
                            ) : null}
                            {account.creditAvailable !== null ? (
                              <p className="mt-0.5 text-[11px] text-ink-3">
                                {t("creditAvailable")}:{" "}
                                {formatCurrency(account.creditAvailable, account.currency, locale)}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Link
                            href={editHref(account.id)}
                            className="whitespace-nowrap rounded-lg px-2 py-1 text-sm font-medium text-accent hover:bg-paper"
                          >
                            {tc("edit")}
                          </Link>
                          <form action={setAccountArchivedAction}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="id" value={account.id} />
                            <input type="hidden" name="archived" value="true" />
                            <Button type="submit" size="sm" variant="ghost">
                              {t("archive")}
                            </Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <details className="mt-4 rounded-lg border border-line bg-paper px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium text-ink">
              {t("archivedAccounts")} ({archivedAccounts.length})
            </summary>
            {archivedAccounts.length === 0 ? (
              <p className="py-3 text-sm text-ink-3">{t("noArchived")}</p>
            ) : (
              <ul className="mt-2 divide-y divide-line/70">
                {archivedAccounts.map((account) => (
                  <li
                    key={account.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                  >
                    <span className="text-ink-2">
                      {account.name}
                      <span className="ml-2 text-xs text-ink-3">
                        {te(`accountType.${account.type}`)} ·{" "}
                        {ownershipLabel(account.ownershipType)} ·{" "}
                        {formatCurrency(account.balance, account.currency, locale)}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Link
                        href={editHref(account.id)}
                        className="rounded-lg px-2 py-1 text-sm font-medium text-accent hover:bg-surface"
                      >
                        {tc("edit")}
                      </Link>
                      <form action={setAccountArchivedAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="id" value={account.id} />
                        <input type="hidden" name="archived" value="false" />
                        <Button type="submit" size="sm" variant="ghost">
                          {t("restore")}
                        </Button>
                      </form>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </details>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("growth")}</CardTitle>
          <p className="mt-1 text-xs text-ink-3">{t("growthSubtitle")}</p>
        </CardHeader>
        <CardContent>
          {growthRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-3">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-ink-3">
                    <th className="pb-3 pr-4">{tc("name")}</th>
                    <th className="pb-3 pr-4 text-right">{t("months")}</th>
                    <th className="pb-3 pr-4 text-right">{t("investedCapital")}</th>
                    <th className="pb-3 pr-4 text-right">{t("currentBalance")}</th>
                    <th className="pb-3 pr-4 text-right">{t("growthAmount")}</th>
                    <th className="pb-3 pr-4 text-right">{t("avgMonthlyGrowth")}</th>
                    <th className="pb-3 text-right">{t("naturalIncome")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {growthRows.map((row) => (
                    <tr key={row.accountId}>
                      <td className="py-2.5 pr-4 font-medium text-ink">{row.name}</td>
                      <td className="py-2.5 pr-4 text-right text-ink-3">{row.months}</td>
                      <td className="py-2.5 pr-4 text-right text-ink-2">
                        {formatCurrency(row.investedCapital, row.currency, locale)}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-ink-2">
                        {formatCurrency(row.currentBalance, row.currency, locale)}
                      </td>
                      <td
                        className={`py-2.5 pr-4 text-right font-medium ${
                          row.growth >= 0 ? "text-positive" : "text-negative"
                        }`}
                      >
                        {formatCurrency(row.growth, row.currency, locale)}
                        <span className="block text-xs text-ink-3">
                          {row.growthPct === null ? "—" : `${formatNumber(row.growthPct, locale)}%`}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-right text-ink-2">
                        {formatCurrency(row.averageMonthlyGrowth, row.currency, locale)}
                        <span className="block text-xs text-ink-3">
                          {row.averageMonthlyGrowthPct === null
                            ? "—"
                            : `${formatNumber(row.averageMonthlyGrowthPct, locale)}%${t("perMonth")}`}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-ink-2">
                        {formatCurrency(row.naturalIncome, row.currency, locale)}
                        <span className="block text-xs text-ink-3">
                          {formatCurrency(row.averageMonthlyIncome, row.currency, locale)}
                          {t("perMonth")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
