import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { ENTITY_KINDS, RECURRENCE_FREQUENCIES, type EntityKind } from "@/db/schema";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { deriveEntity } from "@/lib/entities";
import { Link } from "@/i18n/navigation";
import { getAccountValues } from "@/services/equity";
import { listEntities } from "@/services/entities";
import { getBaseCurrency } from "@/services/settings";
import { createEntityAction, deleteEntityAction, updateEntityAction } from "../actions";

type EntityRow = {
  id: string;
  kind: string;
  name: string;
  currency: string;
  accountId: string | null;
  value: string | null;
  balance: string | null;
  amount: string | null;
  interestRate: string | null;
  termMonths: number | null;
  monthlyPayment: string | null;
  startDate: string | null;
  dueDay: number | null;
  frequency: "daily" | "weekly" | "monthly" | "yearly" | null;
  nextDueDate: string | null;
  appreciationRate: string | null;
  notes: string | null;
};

async function EntityFields({
  entity,
  accounts,
  locale,
  currency,
}: {
  entity?: EntityRow;
  accounts: { id: string; name: string; valueBase: number }[];
  locale: string;
  currency: string;
}) {
  const t = await getTranslations("entities");
  return (
    <>
      <label className="text-xs text-ink-3">
        {t("kind")}
        <Select name="kind" defaultValue={entity?.kind ?? "loan"} className="mt-1">
          {ENTITY_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {t(kind)}
            </option>
          ))}
        </Select>
      </label>
      <label className="text-xs text-ink-3">
        {t("name")}
        <Input name="name" defaultValue={entity?.name} required className="mt-1" />
      </label>
      <label className="text-xs text-ink-3">
        {t("currency")}
        <Input
          name="currency"
          defaultValue={entity?.currency ?? currency}
          maxLength={3}
          className="mt-1"
        />
      </label>
      <label className="text-xs text-ink-3">
        {t("account")}
        <Select name="accountId" defaultValue={entity?.accountId ?? ""} className="mt-1">
          <option value="">{t("none")}</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} ({formatCurrency(account.valueBase, currency, locale)})
            </option>
          ))}
        </Select>
      </label>
      <label className="text-xs text-ink-3">
        {t("value")}
        <Input name="value" inputMode="decimal" defaultValue={entity?.value ?? ""} className="mt-1" />
      </label>
      <label className="text-xs text-ink-3">
        {t("balance")}
        <Input
          name="balance"
          inputMode="decimal"
          defaultValue={entity?.balance ?? ""}
          className="mt-1"
        />
      </label>
      <label className="text-xs text-ink-3">
        {t("amount")}
        <Input name="amount" inputMode="decimal" defaultValue={entity?.amount ?? ""} className="mt-1" />
      </label>
      <label className="text-xs text-ink-3">
        {t("interestRate")}
        <Input
          name="interestRatePct"
          type="number"
          step="0.1"
          defaultValue={
            entity?.interestRate ? formatNumber(Number(entity.interestRate) * 100, locale) : ""
          }
          className="mt-1"
        />
      </label>
      <label className="text-xs text-ink-3">
        {t("termMonths")}
        <Input
          name="termMonths"
          type="number"
          min={1}
          max={600}
          defaultValue={entity?.termMonths ?? ""}
          className="mt-1"
        />
      </label>
      <label className="text-xs text-ink-3">
        {t("monthlyPayment")}
        <Input
          name="monthlyPayment"
          inputMode="decimal"
          defaultValue={entity?.monthlyPayment ?? ""}
          className="mt-1"
        />
      </label>
      <label className="text-xs text-ink-3">
        {t("startDate")}
        <Input name="startDate" type="date" defaultValue={entity?.startDate ?? ""} className="mt-1" />
      </label>
      <label className="text-xs text-ink-3">
        {t("dueDay")}
        <Input
          name="dueDay"
          type="number"
          min={1}
          max={31}
          defaultValue={entity?.dueDay ?? ""}
          className="mt-1"
        />
      </label>
      <label className="text-xs text-ink-3">
        {t("frequency")}
        <Select name="frequency" defaultValue={entity?.frequency ?? "monthly"} className="mt-1">
          {RECURRENCE_FREQUENCIES.map((frequency) => (
            <option key={frequency} value={frequency}>
              {t(`frequencyLabels.${frequency}` as never)}
            </option>
          ))}
        </Select>
      </label>
      <label className="text-xs text-ink-3">
        {t("nextDueDate")}
        <Input
          name="nextDueDate"
          type="date"
          defaultValue={entity?.nextDueDate ?? ""}
          className="mt-1"
        />
      </label>
      <label className="text-xs text-ink-3">
        {t("appreciationRate")}
        <Input
          name="appreciationRatePct"
          type="number"
          step="0.1"
          defaultValue={
            entity?.appreciationRate
              ? formatNumber(Number(entity.appreciationRate) * 100, locale)
              : ""
          }
          className="mt-1"
        />
      </label>
      <label className="text-xs text-ink-3 sm:col-span-2 lg:col-span-5">
        {t("notes")}
        <Input name="notes" defaultValue={entity?.notes ?? ""} className="mt-1" />
      </label>
      <p className="text-xs text-ink-3 sm:col-span-2 lg:col-span-5">{t("fieldHint")}</p>
    </>
  );
}

export default async function EntitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ kind?: string; error?: string }>;
}) {
  const { locale } = await params;
  const search = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("entities");
  const tc = await getTranslations("common");
  const kind = (ENTITY_KINDS as readonly string[]).includes(search.kind ?? "")
    ? (search.kind as EntityKind)
    : "loan";
  const [rows, accountValues, currency] = await Promise.all([
    listEntities(kind),
    getAccountValues(),
    getBaseCurrency(),
  ]);
  const accountById = new Map(accountValues.map((account) => [account.id, account]));

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <p className="rounded-lg border border-line/70 bg-surface px-4 py-3 text-xs text-ink-3">
        {t("readOnlyHint")}
      </p>

      <div className="flex flex-wrap gap-1">
        {ENTITY_KINDS.map((item) => (
          <Link
            key={item}
            href={`/entities?kind=${item}`}
            aria-current={item === kind ? "page" : undefined}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              item === kind
                ? "border-accent bg-accent-soft text-accent"
                : "border-line bg-surface text-ink-3 hover:text-ink"
            }`}
          >
            {t(item)}
          </Link>
        ))}
      </div>

      {search.error ? <p className="text-sm text-negative">{t("validationError")}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("new")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createEntityAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input type="hidden" name="locale" value={locale} />
            <EntityFields accounts={accountValues} locale={locale} currency={currency} />
            <div className="sm:col-span-2 lg:col-span-5">
              <Button type="submit">{tc("add")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <CardContent>
            <p className="py-10 text-center text-sm text-ink-3">{t("empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rows.map((row) => {
            const linkedBalance = row.accountId
              ? accountById.get(row.accountId)?.valueBase ?? null
              : null;
            const derived = deriveEntity(row, linkedBalance);
            return (
              <Card key={row.id}>
                <CardHeader className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle>{row.name}</CardTitle>
                    <p className="mt-1 text-xs text-ink-3">
                      <Badge tone="neutral">{t(row.kind as never)}</Badge>
                      {row.accountId
                        ? ` · ${accountById.get(row.accountId)?.name ?? t("linkedAccount")}`
                        : ""}
                    </p>
                  </div>
                  <form action={deleteEntityAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={row.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      {tc("delete")}
                    </Button>
                  </form>
                </CardHeader>
                <CardContent className="space-y-4">
                  <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    {row.kind === "loan" ? (
                      <>
                        <Stat label={t("balance")} value={formatCurrency(row.balance ?? 0, currency, locale)} />
                        <Stat label={t("payment")} value={derived.monthlyPayment === null ? "—" : formatCurrency(derived.monthlyPayment, currency, locale)} />
                        <Stat label={t("payoff")} value={derived.payoffDate ? formatDate(derived.payoffDate, locale) : "—"} />
                        <Stat label={t("interest")} value={derived.totalInterest === null ? "—" : formatCurrency(derived.totalInterest, currency, locale)} />
                      </>
                    ) : null}
                    {row.kind === "property" || row.kind === "vehicle" ? (
                      <>
                        <Stat label={t("value")} value={formatCurrency(row.value ?? 0, currency, locale)} />
                        <Stat label={t("currentValue")} value={derived.currentValue === null ? "—" : formatCurrency(derived.currentValue, currency, locale)} />
                        <Stat label={t("gain")} value={derived.gain === null ? "—" : formatCurrency(derived.gain, currency, locale)} />
                        <Stat label={t("appreciationRate")} value={row.appreciationRate ? `${formatNumber(Number(row.appreciationRate) * 100, locale)}%` : "—"} />
                      </>
                    ) : null}
                    {row.kind === "credit_card" ? (
                      <>
                        <Stat label={t("balance")} value={formatCurrency(linkedBalance ?? row.balance ?? 0, currency, locale)} />
                        <Stat label={t("limit")} value={formatCurrency(row.value ?? 0, currency, locale)} />
                        <Stat label={t("utilization")} value={derived.utilization === null ? "—" : `${formatNumber(derived.utilization * 100, locale)}%`} />
                        <Stat label={t("dueDay")} value={row.dueDay ? String(row.dueDay) : "—"} />
                      </>
                    ) : null}
                    {row.kind === "subscription" || row.kind === "bill" ? (
                      <>
                        <Stat label={t("amount")} value={formatCurrency(row.amount ?? 0, currency, locale)} />
                        <Stat label={t("monthlyEquivalent")} value={derived.monthlyEquivalent === null ? "—" : formatCurrency(derived.monthlyEquivalent, currency, locale)} />
                        <Stat label={t("nextDueDate")} value={row.nextDueDate ? formatDate(row.nextDueDate, locale) : "—"} />
                        <Stat label={t("daysUntilDue")} value={derived.daysUntilDue === null ? "—" : String(derived.daysUntilDue)} />
                      </>
                    ) : null}
                  </dl>
                  <details className="rounded-lg border border-line/70 px-3 py-2">
                    <summary className="cursor-pointer text-sm font-medium text-ink">
                      {t("edit")}
                    </summary>
                    <form
                      action={updateEntityAction}
                      className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
                    >
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={row.id} />
                      <EntityFields
                        entity={row}
                        accounts={accountValues}
                        locale={locale}
                        currency={currency}
                      />
                      <div className="sm:col-span-2 lg:col-span-5">
                        <Button type="submit" size="sm" variant="secondary">
                          {tc("save")}
                        </Button>
                      </div>
                    </form>
                  </details>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="tabular mt-0.5 font-medium text-ink">{value}</dd>
    </div>
  );
}
