import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/pt-BR/login");
  await page.getByLabel("Usuário").fill(process.env.AUTH_USERNAME ?? "admin");
  await page.getByLabel("Senha").fill(process.env.AUTH_PASSWORD ?? "admin");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/pt-BR$/);
}

test("assistant is disabled by default and reachable from the nav", async ({ page }) => {
  await login(page);

  await page.locator("aside").getByRole("link", { name: "Assistente" }).click();
  await expect(page).toHaveURL(/\/pt-BR\/assistant$/);
  await expect(
    page.getByRole("heading", { name: "Assistente", exact: true, level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("Assistente desativado")).toBeVisible();
  await expect(page.getByText(/ASSISTANT_ENABLED/).first()).toBeVisible();
  await expect(page.getByText(/não constituem aconselhamento/).first()).toBeVisible();
});
