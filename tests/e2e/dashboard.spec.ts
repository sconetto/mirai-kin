import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/pt-BR/login");
  await page.getByLabel("Usuário").fill(process.env.AUTH_USERNAME ?? "admin");
  await page.getByLabel("Senha").fill(process.env.AUTH_PASSWORD ?? "admin");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/pt-BR$/);
}

async function createGoal(page: Page, name: string, withDate: boolean) {
  await page.goto("/pt-BR/planner");
  const form = page.locator("form").first();
  await form.getByLabel("Nome").fill(name);
  await form.getByLabel("Valor alvo").fill("50000");
  if (withDate) await form.getByLabel("Data alvo").fill("2027-12-31");
  await form.getByLabel("Modo de financiamento").selectOption("manual");
  await form.getByLabel("Valor atual manual").fill("1000");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await expect(page.getByText(name)).toBeVisible();
}

async function deleteGoal(page: Page, name: string) {
  await page.goto("/pt-BR/planner");
  const card = page.locator("div.rounded-xl").filter({ hasText: name }).last();
  if (await card.count()) await card.getByRole("button", { name: "Excluir" }).click();
}

test("plan dashboard leads with status and switches ranges", async ({ page }) => {
  await login(page);
  await expect(page.getByText("Status do plano")).toBeVisible();
  await expect(page.getByText("Trajetória do patrimônio")).toBeVisible();
  await expect(page.getByText("Ritmo de contribuição")).toBeVisible();

  await page.getByRole("link", { name: "1M" }).click();
  await expect(page).toHaveURL(/range=1m/);
  await expect(page.getByText("Status do plano")).toBeVisible();
});

test("dashboard shows a funded goal and a needs-setup goal", async ({ page }) => {
  await login(page);
  const funded = `E2E dashboard funded ${Date.now()}`;
  const incomplete = `E2E dashboard incomplete ${Date.now()}`;

  try {
    await createGoal(page, funded, true);
    await page.goto("/pt-BR");
    await expect(page.getByRole("link", { name: funded })).toBeVisible();
    await expect(page.getByText("Fora do caminho").last()).toBeVisible();

    await createGoal(page, incomplete, false);
    await page.goto("/pt-BR");
    await expect(page.getByRole("link", { name: incomplete })).toBeVisible();
    await expect(page.getByText("Configurar").last()).toBeVisible();
  } finally {
    await deleteGoal(page, funded);
    await deleteGoal(page, incomplete);
  }
});
