import { expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@school.edu";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "admin123";
const ADMIN_SCHOOL_CODE = process.env.E2E_ADMIN_SCHOOL_CODE || "";

export async function loginAsAdmin(page: Page) {
  await page.goto("/auth/login", { waitUntil: "domcontentloaded" });

  if (ADMIN_SCHOOL_CODE) {
    await page.getByLabel("School Code (optional for Admin)").fill(ADMIN_SCHOOL_CODE);
  }

  await page.getByLabel("Email address").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL(/\/dashboard(\/.*)?$/, { timeout: 60000 });
  await expect(page).toHaveURL(/\/dashboard(\/.*)?$/);
}
