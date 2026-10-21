import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { GOAL_TYPES } from "@/db/schema";
import { getEnv } from "@/lib/env";
import { formatCurrency, formatDate } from "@/lib/format";
import { getPlanner } from "@/services/planner";
import { createGoalAction, deleteGoalAction, updateGoalAction } from "../actions";

export default async function PlannerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("planner");
  const tc = await getTranslations("common");
  const planner = await getPlanner();
  const currency = getEnv().BASE_CURRENCY;

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label={t("liquid")} value={formatCurrency(planner.liquid, currency, locale)} />
        <Stat
          label={t("essential")}
          value={formatCurrency(planner.essentialMonthly, currency, locale)}
        />
        <Stat
          label={t("runway")}
          value={t("runwayValue", { months: planner.runwayMonths })}
          mono={false}
          accent
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t("newGoal")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createGoalAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input type="hidden" name="locale" value={locale} />
            <Input name="name" placeholder={t("name")} required />
            <Select name="type" defaultValue="custom">
              {GOAL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(type)}
                </option>
              ))}
            </Select>
            <Input name="targetAmount" placeholder={t("target")} inputMode="decimal" required />
            <Input name="targetDate" type="date" />
            <div className="flex gap-2">
              <Input name="currency" defaultValue={currency} maxLength={3} className="w-20" />
              <Input
                name="priority"
                type="number"
                min={1}
                defaultValue={1}
                aria-label={t("priority")}
                className="w-20"
              />
              <Button type="submit">{tc("add")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("goals")}</CardTitle>
        </CardHeader>
        <CardContent>
          {planner.goals.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-3">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-ink-3">
                    <th className="pb-3 pr-4">{t("name")}</th>
                    <th className="pb-3 pr-4">{tc("type")}</th>
                    <th className="pb-3 pr-4 text-right">{t("target")}</th>
                    <th className="pb-3 pr-4">{t("date")}</th>
                    <th className="pb-3 pr-4 text-center">{t("priority")}</th>
                    <th className="pb-3 pr-4">{t("progress")}</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {planner.goals.map((goal) => (
                    <tr key={goal.id} className="align-top hover:bg-paper">
                      <td className="py-2.5 pr-4 font-medium text-ink">{goal.name}</td>
                      <td className="py-2.5 pr-4 text-ink-3">{t(goal.type)}</td>
                      <td className="py-2.5 pr-4 text-right text-ink-2">
                        {formatCurrency(goal.targetAmount, goal.currency, locale)}
                      </td>
                      <td className="py-2.5 pr-4 text-ink-3">
                        {goal.targetDate ? formatDate(goal.targetDate, locale) : "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-center text-ink-3">{goal.priority}</td>
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 rounded-full bg-paper">
                            <div
                              className="h-full rounded-full bg-accent"
                              style={{ width: `${goal.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-ink-3">{goal.progress}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right">
                        <form action={deleteGoalAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="id" value={goal.id} />
                          <Button type="submit" size="sm" variant="ghost">
                            {tc("delete")}
                          </Button>
                        </form>
                      </td>
                    </tr>
                  ))}
                  {planner.goals.map((goal) => (
                    <tr key={`${goal.id}-edit`} className="border-0">
                      <td colSpan={7} className="pb-3 pt-0">
                        <form
                          action={updateGoalAction}
                          className="flex flex-wrap items-end gap-2"
                        >
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="id" value={goal.id} />
                          <Input
                            name="targetAmount"
                            defaultValue={goal.targetAmount}
                            inputMode="decimal"
                            aria-label={t("target")}
                            className="h-8 w-32"
                          />
                          <Input
                            name="targetDate"
                            type="date"
                            defaultValue={goal.targetDate ?? ""}
                            aria-label={t("date")}
                            className="h-8 w-40"
                          />
                          <Input
                            name="priority"
                            type="number"
                            min={1}
                            defaultValue={goal.priority}
                            aria-label={t("priority")}
                            className="h-8 w-20"
                          />
                          <Button type="submit" size="sm" variant="secondary">
                            {tc("save")}
                          </Button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-4 text-xs text-ink-3">{t("note")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
