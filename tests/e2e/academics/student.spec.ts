import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../helpers/auth";

test.describe("Academic Route Smoke", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("students page renders", async ({ page }) => {
    await page.goto("/dashboard/students", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: /students|শিক্ষার্থী/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Ready-Made Reports|রিপোর্ট/i }),
    ).toBeVisible();
  });

  test("teachers page renders", async ({ page }) => {
    await page.goto("/dashboard/teachers", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: /teachers|সহকারী শিক্ষক/i }),
    ).toBeVisible();
  });

  test("classes page renders tabs", async ({ page }) => {
    await page.goto("/dashboard/classes", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: /classes|প্রাথমিক শ্রেণি/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /classes|শ্রেণি/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /subjects|বিষয়/i }),
    ).toBeVisible();
  });

  test("attendance page renders", async ({ page }) => {
    await page.goto("/dashboard/attendance", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: /Attendance|উপস্থিতি/i }),
    ).toBeVisible();
  });

  test("grades page renders", async ({ page }) => {
    await page.goto("/dashboard/grades", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: /grades/i })).toBeVisible();
  });
});
