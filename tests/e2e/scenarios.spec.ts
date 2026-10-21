import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/pt-BR/login");
  await page.getByLabel("Usuário").fill(process.env.AUTH_USERNAME ?? "admin");
  await page.getByLabel("Senha").fill(process.env.AUTH_PASSWORD ?? "admin");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/pt-BR$/);
}

async function deleteScenarioIfPresent(page: Page, name: string) {
  await page.goto("/pt-BR/projections");
  const details = page.locator("details").filter({ hasText: name }).last();
  if ((await details.count()) === 0) return;
  await details.locator("summary").click();
  const select = details.locator('select[name="replacementDefaultId"]');
  if (await select.count()) await select.selectOption({ index: 1 });
  await details.getByRole("button", { name: "Excluir" }).click();
}

test("scenario lab supports CRUD and default switching", async ({ page }) => {
  await login(page);
  await page.goto("/pt-BR/projections");
  await expect(page.getByText("Cenários")).toBeVisible();
  const name = `E2E scenario ${Date.now()}`;

  try {
    const form = page.locator("form").first();
    await form.getByLabel("Nome").fill(name);
    await form.getByLabel("Retorno (% / ano)").fill("150");
    await page.getByRole("button", { name: "Adicionar" }).click();
    await expect(page.getByText("Verifique este valor.")).toBeVisible();

    await form.getByLabel("Nome").fill(name);
    await form.getByLabel("Retorno (% / ano)").fill("4");
    await form.getByLabel("Inflação (% / ano)").fill("3");
    await form.getByLabel("Contribuição mensal").fill("500");
    await form.getByLabel("Horizonte (meses)").fill("240");
    await page.getByRole("button", { name: "Adicionar" }).click();
    await expect(page.getByRole("row", { name: new RegExp(name) })).toBeVisible();

    const details = page.locator("details").filter({ hasText: name }).last();
    await details.locator("summary").click();
    await details.getByLabel("Retorno (% / ano)").fill("5");
    await details.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByRole("row", { name: new RegExp(name) })).toBeVisible();

    const updated = page.locator("details").filter({ hasText: name }).last();
    await updated.getByRole("button", { name: "Definir padrão" }).click();
    await expect(page.getByText(`Cenário ativo: ${name}`)).toBeVisible();

    const active = page.locator("details").filter({ hasText: name }).last();
    await active.locator('select[name="replacementDefaultId"]').selectOption({ index: 1 });
    await active.getByRole("button", { name: "Excluir" }).click();
    await expect(page.getByRole("row", { name: new RegExp(name) })).toHaveCount(0);

    await page.goto("/en/projections");
    await expect(page.getByRole("heading", { name: "Projections" })).toBeVisible();
    await expect(page.getByText("New scenario")).toBeVisible();
  } finally {
    await deleteScenarioIfPresent(page, name);
  }
});
