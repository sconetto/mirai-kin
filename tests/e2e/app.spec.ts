import { expect, test } from "@playwright/test";

test("login page renders", async ({ page }) => {
  await page.goto("/pt-BR/login");
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
});

test("unauthenticated dashboard redirects to login", async ({ page }) => {
  await page.goto("/pt-BR");
  await expect(page).toHaveURL(/\/pt-BR\/login/);
});

test("logs in with seeded credentials and reaches the dashboard", async ({ page }) => {
  await page.goto("/pt-BR/login");
  await page.getByLabel("Usuário").fill(process.env.AUTH_USERNAME ?? "admin");
  await page.getByLabel("Senha").fill(process.env.AUTH_PASSWORD ?? "admin");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/pt-BR$/);
  await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();
});

test("changelog renders and is linked from navigation", async ({ page }) => {
  await page.goto("/pt-BR/login");
  await page.getByLabel("Usuário").fill(process.env.AUTH_USERNAME ?? "admin");
  await page.getByLabel("Senha").fill(process.env.AUTH_PASSWORD ?? "admin");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/pt-BR$/);

  await page.getByRole("link", { name: "Changelog" }).click();
  await expect(page).toHaveURL(/\/pt-BR\/changelog$/);
  await expect(page.getByRole("heading", { name: "Changelog" })).toBeVisible();
  await expect(page.getByText("Design system")).toBeVisible();
});
