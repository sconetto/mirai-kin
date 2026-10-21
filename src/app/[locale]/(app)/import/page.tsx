import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import { listAccounts } from "@/services/accounts";
import { getBatch, listBatches, listProfiles } from "@/services/imports";
import {
  commitImportAction,
  deleteProfileAction,
  discardImportAction,
  stageImportAction,
} from "../actions";

type Search = { batch?: string };

const TONES = {
  valid: "success",
  duplicate: "warning",
  invalid: "danger",
  committed: "neutral",
  pending: "neutral",
} as const;

function rowSummary(normalized: unknown): string {
  if (!normalized || typeof normalized !== "object") return "—";
  const row = normalized as Record<string, unknown>;
  if (row.kind === "transaction") {
    const rule =
      row.rule && typeof row.rule === "object" ? (row.rule as { name?: string }) : null;
    return [
      row.recordDate,
      row.amount,
      row.note ?? row.counterparty ?? "",
      rule?.name ? `rule: ${rule.name}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }
  return [row.kind, row.symbol, row.date, row.quantity, row.price ?? row.amount]
    .filter(Boolean)
    .join(" · ");
}

export default async function ImportPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Search>;
}) {
  const { locale } = await params;
  const search = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("import");
  const tc = await getTranslations("common");

  const [accounts, profiles, history, batchData] = await Promise.all([
    listAccounts(),
    listProfiles(),
    listBatches(),
    search.batch ? getBatch(search.batch) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <Card>
        <CardHeader>
          <CardTitle>{t("stage")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={stageImportAction} className="grid gap-3">
            <input type="hidden" name="locale" value={locale} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-ink-3">
                {t("source")}
                <Select name="source" defaultValue="csv" className="mt-1">
                  <option value="csv">{t("sourceCsv")}</option>
                  <option value="ofx">{t("sourceOfx")}</option>
                  <option value="brokerage_csv">{t("sourceBrokerage")}</option>
                </Select>
              </label>
              <label className="text-xs text-ink-3">
                {t("account")}
                <Select name="accountId" defaultValue={accounts[0]?.id} className="mt-1">
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.currency})
                    </option>
                  ))}
                </Select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-ink-3">
                {t("openingBalance")}
                <Input name="openingBalance" inputMode="decimal" className="mt-1" />
              </label>
              <label className="text-xs text-ink-3">
                {t("currentBalance")}
                <Input name="currentBalance" inputMode="decimal" className="mt-1" />
              </label>
            </div>
            <p className="text-xs text-ink-3">{t("balanceHint")}</p>

            <label className="text-xs text-ink-3">
              {t("file")}
              <input
                type="file"
                name="file"
                accept=".csv,.ofx,.txt"
                className="mt-1 block w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-paper file:px-3 file:py-1.5 file:text-sm file:text-ink"
              />
            </label>

            <label className="text-xs text-ink-3">
              {t("paste")}
              <Textarea name="content" rows={6} className="mt-1" placeholder={"date,amount,currency,category,note\n2026-01-15,-45.90,BRL,Groceries,Market"} />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-ink-3">
                {t("profile")}
                <Select name="profileId" defaultValue="" className="mt-1">
                  <option value="">—</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} ({profile.source})
                    </option>
                  ))}
                </Select>
              </label>
              <label className="text-xs text-ink-3">
                {t("saveProfile")}
                <Input name="saveProfileName" className="mt-1" />
              </label>
            </div>

            <p className="text-xs text-ink-3">{t("hint")}</p>
            <div>
              <Button type="submit">{t("stage")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {batchData ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {t("batch")} · {t(batchData.batch.status as never)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={commitImportAction} className="space-y-3">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="batchId" value={batchData.batch.id} />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-ink-3">
                      <th className="pb-3 pr-2" />
                      <th className="pb-3 pr-4">{t("rows")}</th>
                      <th className="pb-3 pr-4">{t("status")}</th>
                      <th className="pb-3">{t("batch")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/70">
                    {batchData.rows.map((row) => (
                      <tr key={row.id} className="hover:bg-paper">
                        <td className="py-2.5 pr-2">
                          <input
                            type="checkbox"
                            name="rowIds"
                            value={row.id}
                            defaultChecked={row.status === "valid" || row.status === "duplicate"}
                            disabled={row.status === "invalid" || row.status === "committed"}
                            className="h-4 w-4 accent-[var(--color-accent)]"
                          />
                        </td>
                        <td className="py-2.5 pr-4 text-ink-2">{row.rowNumber}</td>
                        <td className="py-2.5 pr-4">
                          <Badge tone={TONES[row.status as keyof typeof TONES] ?? "neutral"}>
                            {t(row.status)}
                          </Badge>
                          {row.error ? <p className="mt-1 text-xs text-negative">{row.error}</p> : null}
                        </td>
                        <td className="py-2.5 text-ink-3">{rowSummary(row.normalized)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit">{t("commit")}</Button>
              </div>
            </form>
            <form action={discardImportAction} className="mt-2">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="batchId" value={batchData.batch.id} />
              <Button type="submit" variant="ghost" size="sm" className="text-negative">
                {t("discard")}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("history")}</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-3">{t("noBatches")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-ink-3">
                    <th className="pb-3 pr-4">{t("source")}</th>
                    <th className="pb-3 pr-4">{t("file")}</th>
                    <th className="pb-3 pr-4">{tc("date")}</th>
                    <th className="pb-3">{t("status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {history.map((batch) => (
                    <tr key={batch.id} className="hover:bg-paper">
                      <td className="py-2.5 pr-4 text-ink-2">{batch.source}</td>
                      <td className="py-2.5 pr-4 text-ink-3">
                        <Link href={`/import?batch=${batch.id}`} className="hover:underline">
                          {batch.fileName ?? batch.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4 text-ink-3">{formatDate(batch.createdAt, locale)}</td>
                      <td className="py-2.5">
                        <Badge tone={batch.status === "committed" ? "success" : "neutral"}>
                          {t(batch.status as never)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {profiles.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("profile")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-line/70">
              {profiles.map((profile) => (
                <li key={profile.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm text-ink-2">
                    {profile.name} <span className="text-ink-3">({profile.source})</span>
                  </span>
                  <form action={deleteProfileAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={profile.id} />
                    <Button type="submit" variant="ghost" size="sm" className="text-negative">
                      {tc("delete")}
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
