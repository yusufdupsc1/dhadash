import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../helpers/auth";

test.describe("Dashboard responsive navigation", () => {
  test.setTimeout(180000);

  test("shows primary sidebar nav on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsAdmin(page);

    await expect(
      page.getByRole("navigation", { name: /primary/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: /mobile primary/i }),
    ).toBeHidden();
  });

  test("shows mobile bottom nav on small screens", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);

    await expect(
      page.getByRole("navigation", { name: /mobile primary/i }),
    ).toBeVisible();
  });

  test("opens mobile drawer menu and navigates from menu links", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);

    const trigger = page.getByTestId("mobile-menu-trigger");
    await expect(trigger).toBeVisible();
    await trigger.click();

    const drawer = page.getByRole("dialog", { name: /navigation menu/i });
    await expect(drawer).toBeVisible();

    await page.getByTestId("mobile-menu-link-dashboard-students").click();
    await expect(page).toHaveURL(/\/dashboard\/students$/);
    await expect(drawer).toBeHidden();
  });

  test("keeps quick actions in compact 3x3 and card taps route to CRUD pages", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);

    await expect(page.getByTestId("quick-actions-grid")).toBeVisible();
    await expect(page.locator("[data-testid^='quick-action-']")).toHaveCount(9);

    await page.getByTestId("stats-card-students").click();
    await expect(page).toHaveURL(/\/dashboard\/students$/);

    await page.getByTestId("topbar-home-link").click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("shows back-to-top FAB after scrolling and returns to top", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);

    const main = page.locator("#dashboard-main");
    await main.evaluate((el) => {
      el.scrollTo({ top: 1200 });
    });

    const scrollFab = page.getByTestId("scroll-top-fab");
    await expect(scrollFab).toBeVisible();
    await scrollFab.click();
    await page.waitForTimeout(600);

    const scrollTop = await main.evaluate((el) => el.scrollTop);
    expect(scrollTop).toBeLessThan(100);
  });
});
