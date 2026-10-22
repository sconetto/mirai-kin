import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { localizedCategoryCompare, localizedCategoryName } from "@/lib/category-name";
import { formatCurrency, formatDate } from "@/lib/format";
import { Link } from "@/i18n/navigation";
import { listCategories } from "@/services/categories";
import { listRuleRuns, listRules, previewRules } from "@/services/rules";
import type { RuleActions, RuleConditions } from "@/services/rules";
import { getToday } from "@/services/settings";
import { applyRulesAction, createRuleAction, deleteRuleAction } from "../actions";

export default async function RulesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ruleId?: string }>;
}) {
  const { locale } = await params;
  const search = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("rules");
  const tc = await getTranslations("common");
  const categories = [...(await listCategories())].sort((a, b) =>
    localizedCategoryCompare(a, b, locale),
  );
  const rules = await listRules();
  const categoryNames = new Map(
    categories.map((category) => [category.id, localizedCategoryName(category, locale)]),
  );

  const today = await getToday();
  const from = new Date(new Date(`${today}T00:00:00.000Z`).getTime() - 90 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const preview = await previewRules({ from, to: today, ruleId: search.ruleId });
  const runs = await listRuleRuns();
  const selectedRule = rules.find((rule) => rule.id === search.ruleId);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <Card>
        <CardHeader>
          <CardTitle>{t("new")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createRuleAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input type="hidden" name="locale" value={locale} />
            <Input name="name" placeholder={t("name")} required />
            <Input name="priority" type="number" min={1} defaultValue={100} aria-label={t("priority")} />
            <Input name="counterparty" placeholder={t("counterparty")} />
            <Select name="counterpartyOperator" defaultValue="contains" aria-label={t("operator")}>
              <option value="contains">{t("contains")}</option>
              <option value="equals">{t("equals")}</option>
              <option value="regex">{t("regex")}</option>
            </Select>
            <Input name="note" placeholder={t("note")} />
            <Select name="categoryId" defaultValue="">
              <option value="">{t("noCategory")}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {localizedCategoryName(category, locale)}
                </option>
              ))}
            </Select>
            <Input name="amountMin" placeholder={t("amountMin")} inputMode="decimal" />
            <Input name="amountMax" placeholder={t("amountMax")} inputMode="decimal" />
            <label className="flex items-center gap-2 text-xs text-ink-3">
              <input type="checkbox" name="markReviewed" className="h-4 w-4 accent-[var(--color-accent)]" />
              {t("markReviewed")}
            </label>
            <label className="flex items-center gap-2 text-xs text-ink-3">
              <input type="checkbox" name="isDeductible" className="h-4 w-4 accent-[var(--color-accent)]" />
              {t("deductible")}
            </label>
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit">{tc("add")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedRule ? t("previewRule", { name: selectedRule.name }) : t("preview")}
          </CardTitle>
          {selectedRule ? (
            <Link href="/rules" className="mt-1 inline-block text-xs text-accent hover:underline">
              {t("allRules")}
            </Link>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-ink-2">
            {t("matched", { matched: preview.matched, total: preview.total })}
          </p>
          <form action={applyRulesAction} className="flex items-center gap-2">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="from" value={from} />
            <input type="hidden" name="to" value={today} />
            <input type="hidden" name="ruleId" value={search.ruleId ?? ""} />
            <Button type="submit" disabled={preview.matched === 0}>
              {t("apply")}
            </Button>
          </form>
          {preview.matches.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-ink-3">
                    <th className="pb-3 pr-4">{tc("date")}</th>
                    <th className="pb-3 pr-4 text-right">{t("amount")}</th>
                    <th className="pb-3 pr-4">{t("rule")}</th>
                    <th className="pb-3">{t("category")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {preview.matches.map((match) => (
                    <tr key={match.transactionId}>
                      <td className="py-2 pr-4 text-ink-3">{formatDate(match.date, locale)}</td>
                      <td className="py-2 pr-4 text-right text-ink-2">
                        {formatCurrency(match.amount, match.currency, locale)}
                      </td>
                      <td className="py-2 pr-4 text-ink-2">{match.ruleName}</td>
                      <td className="py-2 text-ink-3">
                        {match.actions.categoryId
                          ? (categoryNames.get(match.actions.categoryId) ?? "—")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-ink-3">{t("noMatches")}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("rules")}</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-3">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-ink-3">
                    <th className="pb-3 pr-4">{t("name")}</th>
                    <th className="pb-3 pr-4 text-center">{t("priority")}</th>
                    <th className="pb-3 pr-4">{t("condition")}</th>
                    <th className="pb-3 pr-4">{t("category")}</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {rules.map((rule) => {
                    const conditions = (rule.conditions ?? {}) as RuleConditions;
                    const actions = (rule.actions ?? {}) as RuleActions;
                    const summary = [
                      conditions.counterparty
                        ? `${conditions.counterparty.operator}: ${conditions.counterparty.value}`
                        : null,
                      conditions.amountMin !== undefined ? `≥ ${conditions.amountMin}` : null,
                      conditions.amountMax !== undefined ? `≤ ${conditions.amountMax}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <tr key={rule.id}>
                        <td className="py-2.5 pr-4 font-medium text-ink">
                          {rule.name}
                          {!rule.enabled ? (
                            <Badge tone="neutral" className="ml-2">
                              off
                            </Badge>
                          ) : null}
                        </td>
                        <td className="py-2.5 pr-4 text-center text-ink-3">{rule.priority}</td>
                        <td className="py-2.5 pr-4 text-ink-3">{summary || "—"}</td>
                        <td className="py-2.5 pr-4 text-ink-2">
                          {actions.categoryId
                            ? (categoryNames.get(actions.categoryId) ?? "—")
                            : "—"}
                        </td>
                        <td className="py-2.5 text-right">
                          <Link
                            href={`/rules?ruleId=${rule.id}`}
                            className="mr-3 text-xs font-medium text-accent hover:underline"
                          >
                            {t("previewAction")}
                          </Link>
                          <form action={deleteRuleAction} className="inline">
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="id" value={rule.id} />
                            <Button type="submit" size="sm" variant="ghost">
                              {tc("delete")}
                            </Button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("runHistory")}</CardTitle>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-3">{t("noRuns")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-ink-3">
                    <th className="pb-3 pr-4">{t("rule")}</th>
                    <th className="pb-3 pr-4">{t("runDate")}</th>
                    <th className="pb-3 pr-4 text-right">{t("runMatched")}</th>
                    <th className="pb-3 text-right">{t("runUpdated")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {runs.map((run) => (
                    <tr key={run.id}>
                      <td className="py-2 pr-4 text-ink-2">{run.ruleName}</td>
                      <td className="py-2 pr-4 text-ink-3">
                        {formatDate(run.createdAt.toISOString(), locale)}
                      </td>
                      <td className="py-2 pr-4 text-right text-ink-2">{run.matched}</td>
                      <td className="py-2 text-right text-ink-2">{run.updated}</td>
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
