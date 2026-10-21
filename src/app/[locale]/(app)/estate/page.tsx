/* eslint-disable @next/next/no-html-link-for-pages */
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { formatCurrency } from "@/lib/format";
import { getEstate } from "@/services/estate";
import {
  createBeneficiaryAction,
  createDocumentAction,
  updateDocumentStatusAction,
} from "../actions";

const LIABILITY_TYPES = new Set(["credit_card", "loan", "mortgage"]);

export default async function EstatePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("estate");
  const tc = await getTranslations("common");
  const estate = await getEstate();

  const assets = estate.accounts.filter((account) => !LIABILITY_TYPES.has(account.type));
  const liabilities = estate.accounts.filter((account) => LIABILITY_TYPES.has(account.type));

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")}>
        <a
          href="/api/estate/export"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-paper"
        >
          {t("export")}
        </a>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>{t("inventory")}</CardTitle>
        </CardHeader>
        <CardContent>
          {assets.length === 0 && liabilities.length === 0 && estate.assets.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-3">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-ink-3">
                    <th className="pb-3 pr-4">{tc("name")}</th>
                    <th className="pb-3 pr-4">{tc("type")}</th>
                    <th className="pb-3 text-right">{tc("amount")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {[...assets, ...liabilities].map((account) => {
                    const liability = LIABILITY_TYPES.has(account.type);
                    return (
                      <tr key={account.id} className="hover:bg-paper">
                        <td className="py-2.5 pr-4 text-ink-2">{account.name}</td>
                        <td className="py-2.5 pr-4 text-ink-3">
                          {liability ? t("liability") : t("asset")} · {account.type}
                        </td>
                        <td
                          className={`py-2.5 text-right font-medium ${liability ? "text-negative" : "text-ink"}`}
                        >
                          {formatCurrency(account.balance, account.currency, locale)}
                        </td>
                      </tr>
                    );
                  })}
                  {estate.assets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-paper">
                      <td className="py-2.5 pr-4 text-ink-2">{asset.name}</td>
                      <td className="py-2.5 pr-4 text-ink-3">
                        {t("asset")} · {asset.type}
                      </td>
                      <td className="py-2.5 text-right font-medium text-ink">
                        {formatCurrency(asset.value, asset.currency, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("beneficiaries")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createBeneficiaryAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input type="hidden" name="locale" value={locale} />
            <Input name="name" placeholder={tc("name")} required />
            <Input name="relationship" placeholder={t("relationship")} />
            <Input name="sharePct" placeholder={t("share")} inputMode="decimal" />
            <Input name="notes" placeholder={t("notes")} />
            <Button type="submit">{tc("add")}</Button>
          </form>
          {estate.beneficiaries.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-3">{t("empty")}</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-ink-3">
                    <th className="pb-3 pr-4">{tc("name")}</th>
                    <th className="pb-3 pr-4">{t("relationship")}</th>
                    <th className="pb-3 pr-4">{t("notes")}</th>
                    <th className="pb-3 text-right">{t("share")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {estate.beneficiaries.map((beneficiary) => (
                    <tr key={beneficiary.id}>
                      <td className="py-2.5 pr-4 text-ink-2">{beneficiary.name}</td>
                      <td className="py-2.5 pr-4 text-ink-3">{beneficiary.relationship ?? "—"}</td>
                      <td className="py-2.5 pr-4 text-ink-3">{beneficiary.notes ?? "—"}</td>
                      <td className="py-2.5 text-right text-ink-2">
                        {Number(beneficiary.sharePct).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-ink-3">
                {t("totalShare")}: {estate.totalShare}%{estate.totalShare !== 100 ? " ⚠" : ""}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("documents")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createDocumentAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input type="hidden" name="locale" value={locale} />
            <Input name="name" placeholder={tc("name")} required />
            <Input name="category" placeholder={t("category")} />
            <Input name="notes" placeholder={t("notes")} />
            <Select name="status" defaultValue="missing">
              <option value="missing">{t("missing")}</option>
              <option value="draft">{t("draft")}</option>
              <option value="final">{t("final")}</option>
            </Select>
            <Button type="submit">{tc("add")}</Button>
          </form>
          {estate.documents.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-3">{t("empty")}</p>
          ) : (
            <ul className="mt-4 divide-y divide-line/70">
              {estate.documents.map((document) => (
                <li
                  key={document.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="text-ink-2">
                      {document.name} <span className="text-ink-3">({document.category})</span>
                    </p>
                    {document.notes ? <p className="text-xs text-ink-3">{document.notes}</p> : null}
                  </div>
                  <form action={updateDocumentStatusAction} className="flex items-center gap-2">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={document.id} />
                    <Select name="status" defaultValue={document.status} className="h-8 w-auto">
                      <option value="missing">{t("missing")}</option>
                      <option value="draft">{t("draft")}</option>
                      <option value="final">{t("final")}</option>
                    </Select>
                    <Button type="submit" size="sm" variant="secondary">
                      {tc("save")}
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="rounded-lg border border-warning/20 bg-[#fffaeb] px-4 py-3 text-sm text-warning">
        {t("disclaimer")}
      </p>
    </div>
  );
}
