import { defineConfig, devices } from "@playwright/test";

const fullMatrix = process.env.PLAYWRIGHT_FULL_MATRIX === "true";
const host = "127.0.0.1";
const port = Number(process.env.PLAYWRIGHT_PORT || 3100);
const appUrl = process.env.PLAYWRIGHT_BASE_URL || `http://${host}:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],
  use: {
    baseURL: appUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15000,
    navigationTimeout: 60000,
  },
  projects: fullMatrix
    ? [
        {
          name: "chromium",
          use: { ...devices["Desktop Chrome"] },
        },
        {
          name: "firefox",
          use: { ...devices["Desktop Firefox"] },
        },
        {
          name: "webkit",
          use: { ...devices["Desktop Safari"] },
        },
        {
          name: "Mobile Chrome",
          use: { ...devices["Pixel 5"] },
        },
        {
          name: "Mobile Safari",
          use: { ...devices["iPhone 12"] },
        },
      ]
    : [
        {
          name: "chromium",
          use: { ...devices["Desktop Chrome"] },
        },
      ],
  webServer: {
    command: `pnpm exec next build --webpack && pnpm exec next start -H ${host} -p ${port}`,
    url: appUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 420000,
    env: {
      ...process.env,
      SKIP_ENV_VALIDATION: "true",
      NEXT_PUBLIC_APP_URL: appUrl,
      AUTH_SECRET:
        process.env.AUTH_SECRET || "playwright-secret-32-chars-minimum",
      OWNER_SUPER_ADMIN_USERNAME:
        process.env.OWNER_SUPER_ADMIN_USERNAME || "yusuf_ali",
      OWNER_SUPER_ADMIN_EMAIL:
        process.env.OWNER_SUPER_ADMIN_EMAIL || "yusuf_ali",
      OWNER_SUPER_ADMIN_PASSWORD:
        process.env.OWNER_SUPER_ADMIN_PASSWORD || "yusuf_ali",
    },
  },
});
