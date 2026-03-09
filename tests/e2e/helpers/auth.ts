import { expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@school.edu";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "admin123";
const ADMIN_SCHOOL_CODE = process.env.E2E_ADMIN_SCHOOL_CODE || "bd-gps";

export async function loginAsAdmin(page: Page) {
  await page.goto("/auth/login/admin", { waitUntil: "domcontentloaded" });

  const schoolCodeInput = page.getByLabel(/School Code/i).first();
  await schoolCodeInput.click();
  await schoolCodeInput.press("ControlOrMeta+A");
  await schoolCodeInput.fill("");
  await schoolCodeInput.type(ADMIN_SCHOOL_CODE, { delay: 40 });
  await expect(schoolCodeInput).toHaveValue(ADMIN_SCHOOL_CODE);

  if (ADMIN_EMAIL === "admin@school.edu" && ADMIN_PASSWORD === "admin123") {
    await page.getByRole("button", { name: /Use demo admin/i }).click();
  } else {
    await page.getByLabel("Email address").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  }

  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL(/\/dashboard(\/.*)?$/, { timeout: 60000 });
  await expect(page).toHaveURL(/\/dashboard(\/.*)?$/);
}
