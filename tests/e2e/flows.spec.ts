import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/pt-BR/login");
  await page.getByLabel("Usuário").fill(process.env.AUTH_USERNAME ?? "admin");
  await page.getByLabel("Senha").fill(process.env.AUTH_PASSWORD ?? "admin");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/pt-BR$/);
}

test("import → review → report → insight", async ({ page }) => {
  await login(page);

  await page.goto("/pt-BR/import");
  await expect(page.getByRole("heading", { name: "Importar" })).toBeVisible();

  await page
    .locator('textarea[name="content"]')
    .fill(
      [
        "date,amount,currency,category,note",
        "2026-10-21,-12.34,BRL,Groceries,E2E import marker",
      ].join("\n"),
    );
  await page.getByRole("button", { name: "Analisar arquivo" }).click();

  await expect(page.getByText("Em análise").first()).toBeVisible();
  await expect(page.getByText("Válida").first()).toBeVisible();
  await page.getByRole("button", { name: "Descartar" }).click();

  await page.goto("/pt-BR/spending/reports");
  await expect(page.getByRole("heading", { name: "Gastos" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Relatórios" })).toBeVisible();

  await page.goto("/pt-BR/insights");
  await expect(page.getByRole("heading", { name: "Insights" })).toBeVisible();
});

test("planner goal CRUD flows into estate", async ({ page }) => {
  await login(page);

  await page.goto("/pt-BR/planner");
  await expect(page.getByRole("heading", { name: "Planejador" })).toBeVisible();

  const name = `E2E goal ${Date.now()}`;
  await page.getByPlaceholder("Nome").fill(name);
  await page.getByPlaceholder("Valor alvo").fill("1000");
  await page.getByRole("button", { name: "Adicionar" }).click();

  const row = page.getByRole("row", { name: new RegExp(name) });
  await expect(row).toBeVisible();
  await expect(row.getByText("0%")).toBeVisible();

  await row.getByRole("button", { name: "Excluir" }).click();
  await expect(page.getByRole("row", { name: new RegExp(name) })).toHaveCount(0);

  await page.goto("/pt-BR/estate");
  await expect(page.getByRole("heading", { name: "Sucessão" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Documentos" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Beneficiários" })).toBeVisible();

  await page.goto("/pt-BR/forecast");
  await expect(page.getByRole("heading", { name: "Projeções" })).toBeVisible();
  await expect(page.getByText("Cenários")).toBeVisible();
});
