import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/pt-BR/login");
  await page.getByLabel("Usuário").fill(process.env.AUTH_USERNAME ?? "admin");
  await page.getByLabel("Senha").fill(process.env.AUTH_PASSWORD ?? "admin");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/pt-BR$/);
}

test.describe.configure({ mode: "serial" });

test("shell toggle switches to dark and Settings persists it", async ({ page }) => {
  await login(page);

  const html = page.locator("html");
  await page.locator("aside").getByRole("button", { name: "Escuro" }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");

  await page.goto("/pt-BR/settings?section=appearance");
  const picker = page.getByRole("group", { name: "Tema" });
  await picker.getByRole("button", { name: /^Escuro/ }).click();
  await page.waitForTimeout(800);
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");

  await picker.getByRole("button", { name: /^Claro/ }).click();
  await expect(html).toHaveAttribute("data-theme", "light");
});

test("system theme follows a dark OS preference", async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: "dark" });
  const page = await context.newPage();
  await login(page);
  await page.goto("/pt-BR/settings?section=appearance");
  const picker = page.getByRole("group", { name: "Tema" });
  await picker.getByRole("button", { name: /^Sistema/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await context.close();
});

test("language applies immediately and can be switched back", async ({ page }) => {
  await login(page);
  await page.goto("/pt-BR/settings?section=localization");

  await page.locator('select[name="defaultLocale"]').selectOption("en");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/en\/settings/);
  await expect(page.getByRole("heading", { name: "Settings", exact: true, level: 1 })).toBeVisible();

  await page.goto("/en/spending/transactions");
  const englishCategories = await page
    .locator('select[name="categoryId"] option')
    .allTextContents();
  expect(englishCategories).toContain("Groceries");
  expect(englishCategories).toContain("Home");

  await page.goto("/en/settings?section=localization");
  await page.locator('select[name="defaultLocale"]').selectOption("pt-BR");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/pt-BR\/settings/);
  await expect(
    page.getByRole("heading", { name: "Configurações", exact: true, level: 1 }),
  ).toBeVisible();

  await page.goto("/pt-BR/spending/transactions");
  const portugueseCategories = await page
    .locator('select[name="categoryId"] option')
    .allTextContents();
  expect(portugueseCategories).toContain("Mercado");
  expect(portugueseCategories).toContain("Casa");
});
