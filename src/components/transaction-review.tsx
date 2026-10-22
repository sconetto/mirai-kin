"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { bulkTransactionAction } from "@/app/[locale]/(app)/actions";
import { CategoryIcon } from "@/components/category-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import { formatCurrency, formatDate } from "@/lib/format";

export type ReviewRow = {
  id: string;
  recordDate: string;
  amount: string;
  currency: string;
  note: string | null;
  counterparty: string | null;
  categoryId: string | null;
  reviewStatus: string;
  transferId: string | null;
  paymentType: string | null;
};

export function TransactionReview({
  rows,
  categories,
  locale,
}: {
  rows: ReviewRow[];
  categories: { id: string; name: string; icon?: string | null; color?: string | null }[];
  locale: string;
}) {
  const t = useTranslations("transactions");
  const tc = useTranslations("common");
  const [selected, setSelected] = useState<string[]>([]);
  const allSelected = rows.length > 0 && selected.length === rows.length;

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  function toggleAll() {
    setSelected(allSelected ? [] : rows.map((row) => row.id));
  }

  const categoryFor = (id: string | null) =>
    categories.find((category) => category.id === id) ?? null;

  return (
    <form action={bulkTransactionAction} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
          {t("selectAll")}
        </label>
        <Select name="categoryId" defaultValue="" className="w-auto">
          <option value="">{t("noCategory")}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        <Button
          type="submit"
          name="intent"
          value="recategorize"
          size="sm"
          disabled={selected.length === 0}
        >
          {t("recategorize")}
        </Button>
        <Button
          type="submit"
          name="intent"
          value="review"
          size="sm"
          variant="secondary"
          disabled={selected.length === 0}
        >
          {t("markReviewed")}
        </Button>
        <Button
          type="submit"
          name="intent"
          value="pair"
          size="sm"
          variant="secondary"
          disabled={selected.length !== 2}
        >
          {t("pairTransfer")}
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-3">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-ink-3">
                <th className="pb-3 pr-2" />
                <th className="pb-3 pr-4">{tc("date")}</th>
                <th className="pb-3 pr-4">{t("counterparty")}</th>
                <th className="pb-3 pr-4">{tc("category")}</th>
                <th className="pb-3 pr-4 text-right">{tc("amount")}</th>
                <th className="pb-3">{t("review")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {rows.map((row) => (
                <tr
                  key={row.id}
                  id={`transaction-${row.id}`}
                  className="transition-colors hover:bg-paper"
                >
                  <td className="py-2.5 pr-2">
                    <input
                      type="checkbox"
                      name="ids"
                      value={row.id}
                      checked={selected.includes(row.id)}
                      onChange={() => toggle(row.id)}
                      className="h-4 w-4 accent-[var(--color-accent)]"
                    />
                  </td>
                  <td className="py-2.5 pr-4 text-ink-2">{formatDate(row.recordDate, locale)}</td>
                  <td className="py-2.5 pr-4 text-ink-2">
                    {row.counterparty ?? row.note ?? "—"}
                  </td>
                  <td className="py-2.5 pr-4 text-ink-3">
                    {(() => {
                      const category = categoryFor(row.categoryId);
                      return category ? (
                        <span className="flex items-center gap-1.5">
                          <CategoryIcon
                            name={category.name}
                            icon={category.icon}
                            color={category.color}
                          />
                          {category.name}
                        </span>
                      ) : (
                        t("noCategory")
                      );
                    })()}
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    <Money
                      className="font-medium"
                      tone={Number(row.amount) >= 0 ? "positive" : undefined}
                    >
                      {formatCurrency(row.amount, row.currency, locale)}
                    </Money>
                  </td>
                  <td className="py-2.5">
                    {row.transferId ? (
                      <Badge tone="success">{t("transfer")}</Badge>
                    ) : row.paymentType === "transfer" ? (
                      <Badge tone="warning">{t("unpairedTransfer")}</Badge>
                    ) : (
                      <Badge tone={row.reviewStatus === "reviewed" ? "success" : "neutral"}>
                        {row.reviewStatus === "reviewed" ? t("reviewed") : t("pending")}
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </form>
  );
}
