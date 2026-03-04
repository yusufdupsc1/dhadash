import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../helpers/auth";

test.describe("Authentication Flows", () => {
  test("login page renders core fields", async ({ page }) => {
    await page.goto("/auth/login", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
    await expect(
      page.getByLabel("School Code (optional for Admin)"),
    ).toBeVisible();
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("invalid credentials show error", async ({ page }) => {
    await page.goto("/auth/login", { waitUntil: "domcontentloaded" });

    await page.getByLabel("Email address").fill("invalid@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page.getByText("Invalid credentials or account is not approved."),
    ).toBeVisible();
  });

  test("demo admin can sign in", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByTestId("topbar-logout-button")).toBeVisible();
  });

  test("logout uses local login redirect and avoids external host", async ({
    page,
  }) => {
    await loginAsAdmin(page);

    const logoutButton = page.getByTestId("topbar-logout-button");
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    await page.waitForURL("**/auth/login", { timeout: 60000 });
    await expect(page).toHaveURL(/\/auth\/login$/);
    expect(page.url()).not.toContain("www.dhadash-gps.vercel.app");
  });

  test("register page renders current fields", async ({ page }) => {
    await page.goto("/auth/register", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "Create your institution" }),
    ).toBeVisible();
    await expect(page.getByLabel("Institution / School Name *")).toBeVisible();
    await expect(page.getByLabel("Your Full Name *")).toBeVisible();
    await expect(page.getByLabel("Email Address *")).toBeVisible();
    await expect(page.locator("#reg-pass")).toBeVisible();
    await expect(page.locator("#reg-confirm")).toBeVisible();
  });

  test("register form validates password mismatch", async ({ page }) => {
    await page.goto("/auth/register", { waitUntil: "domcontentloaded" });

    await page.getByLabel("Institution / School Name *").fill("Test School");
    await page.getByLabel("Your Full Name *").fill("Admin User");
    await page.getByLabel("Email Address *").fill("admin+pw@testschool.com");
    await page.locator("#reg-pass").fill("StrongPass123");
    await page.locator("#reg-confirm").fill("DifferentPass123");

    await expect(page.getByText("Passwords do not match")).toBeVisible();
  });

  test("forgot password shows generic success message", async ({ page }) => {
    await page.goto("/auth/forgot-password", { waitUntil: "domcontentloaded" });

    await page.getByLabel("Email address").fill("nonexistent@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();

    await expect(page.getByText("If an account exists for")).toBeVisible();
  });

  test("owner super admin can sign in from landing panel", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await page.getByLabel("Owner username").fill("Yusuf_Ali");
    await page.getByLabel("Owner password").fill("19Kusum@yusuf");
    await page.getByRole("button", { name: "Owner Sign In" }).click();

    await page.waitForURL("**/dashboard/owner", { timeout: 60000 });
    await expect(page).toHaveURL(/\/dashboard\/owner$/);
    await expect(
      page.getByRole("heading", { name: /জাতীয় নিয়ন্ত্রণ ড্যাশবোর্ড/i }),
    ).toBeVisible();
  });

  test("owner super admin can sign in from auth login form with username", async ({
    page,
  }) => {
    await page.goto("/auth/login", { waitUntil: "domcontentloaded" });

    await page.getByLabel("Email address").fill("Yusuf_Ali");
    await page.getByLabel("Password").fill("19Kusum@yusuf");
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL("**/dashboard/owner", { timeout: 60000 });
    await expect(page).toHaveURL(/\/dashboard\/owner$/);
    await expect(
      page.getByRole("heading", { name: /জাতীয় নিয়ন্ত্রণ ড্যাশবোর্ড/i }),
    ).toBeVisible();
  });
});
