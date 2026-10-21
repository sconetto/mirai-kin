"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { updateAccountAction } from "@/app/[locale]/(app)/actions";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { ACCOUNT_TYPES, ASSET_SUBTYPES, OWNERSHIP_TYPES } from "@/db/schema";
import { formatCurrency, formatNumber } from "@/lib/format";

type EditableAccount = {
  id: string;
  name: string;
  type: string;
  ownershipType: string;
  assetSubtype: string | null;
  currency: string;
  openingBalance: string;
  statementCloseDay: number | null;
  dueDay: number | null;
  creditLimit: string | null;
  creditUsed: string | null;
  creditUtilization: number | null;
  archived: boolean;
};

export function AccountEditForm({
  account,
  locale,
  cancelHref,
}: {
  account: EditableAccount;
  locale: string;
  cancelHref: string;
}) {
  const t = useTranslations("accounts");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const [type, setType] = useState(account.type);

  return (
    <form action={updateAccountAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={account.id} />
      <input type="hidden" name="returnTo" value={cancelHref} />
      <label className="text-xs text-ink-3">
        {tc("name")}
        <Input name="name" defaultValue={account.name} required className="mt-1" />
      </label>
      <label className="text-xs text-ink-3">
        {tc("type")}
        <Select
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="mt-1"
        >
          {ACCOUNT_TYPES.map((value) => (
            <option key={value} value={value}>
              {te(`accountType.${value}`)}
            </option>
          ))}
        </Select>
      </label>
      <label className="text-xs text-ink-3">
        {t("ownership")}
        <Select name="ownershipType" defaultValue={account.ownershipType} className="mt-1">
          {OWNERSHIP_TYPES.map((value) => (
            <option key={value} value={value}>
              {value === "company" ? t("ownershipCompany") : t("ownershipPersonal")}
            </option>
          ))}
        </Select>
      </label>
      <label className="text-xs text-ink-3">
        {tc("currency")}
        <Input name="currency" defaultValue={account.currency} maxLength={3} className="mt-1" />
      </label>

      {type === "investment" || type === "asset" ? (
        <label className="text-xs text-ink-3">
          {t("assetSubtype")}
          <Select name="assetSubtype" defaultValue={account.assetSubtype ?? ""} className="mt-1">
            <option value="">—</option>
            {ASSET_SUBTYPES.map((subtype) => (
              <option key={subtype} value={subtype}>
                {t(`assetSubtypeLabels.${subtype}` as never)}
              </option>
            ))}
          </Select>
        </label>
      ) : null}

      <label className="text-xs text-ink-3">
        {t("balance")}
        <Input
          name="openingBalance"
          defaultValue={account.openingBalance}
          inputMode="decimal"
          className="mt-1"
        />
      </label>

      {type === "credit_card" ? (
        <>
          <label className="text-xs text-ink-3">
            {t("creditLimit")}
            <Input
              name="creditLimit"
              defaultValue={account.creditLimit ?? ""}
              inputMode="decimal"
              className="mt-1"
            />
          </label>
          <label className="text-xs text-ink-3">
            {t("closingDay")}
            <Input
              name="statementCloseDay"
              type="number"
              min={1}
              max={31}
              defaultValue={account.statementCloseDay ?? ""}
              className="mt-1"
            />
          </label>
          <label className="text-xs text-ink-3">
            {t("dueDay")}
            <Input
              name="dueDay"
              type="number"
              min={1}
              max={31}
              defaultValue={account.dueDay ?? ""}
              className="mt-1"
            />
          </label>
          <label className="text-xs text-ink-3">
            {t("creditUsed")}
            <Input
              value={
                account.creditUsed
                  ? formatCurrency(account.creditUsed, account.currency, locale)
                  : "—"
              }
              readOnly
              className="mt-1"
            />
          </label>
          <label className="text-xs text-ink-3">
            {t("creditUtilization")}
            <span className="mt-2 block text-sm text-ink-2">
              {account.creditUtilization !== null
                ? `${formatNumber(account.creditUtilization, locale)}%`
                : "—"}
            </span>
          </label>
        </>
      ) : null}

      <p className="text-xs text-ink-3 sm:col-span-2 lg:col-span-4">
        {t("ownershipHint")}. {t("importHint")}
      </p>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-4">
        <Button type="submit">{tc("save")}</Button>
        <Link
          href={cancelHref}
          className="rounded-lg px-3 py-2 text-sm font-medium text-ink-3 hover:bg-paper hover:text-ink"
        >
          {tc("cancel")}
        </Link>
      </div>
    </form>
  );
}
