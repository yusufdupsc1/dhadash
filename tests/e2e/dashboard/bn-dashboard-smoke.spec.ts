import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../helpers/auth";

test.describe("BN dashboard smoke", () => {
  test("login with env credentials and render /bn/dashboard essentials", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    await page.goto("/bn/dashboard", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/bn\/dashboard|\/dashboard/);
    await expect(page.locator("#dashboard-main")).toBeVisible();
    await expect(page.getByTestId("topbar-home-link")).toBeVisible();
  });
});
