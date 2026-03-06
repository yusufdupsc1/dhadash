import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs/promises";
import { loginAsAdmin } from "../tests/e2e/helpers/auth";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";
const STORAGE_STATE_PATH =
  process.env.AUTH_STORAGE_STATE_PATH ??
  path.resolve(process.cwd(), "reports/lighthouse/authenticated/storage-state.json");

async function run() {
  await fs.mkdir(path.dirname(STORAGE_STATE_PATH), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();

  try {
    await loginAsAdmin(page);
    await page.goto("/bn/dashboard", { waitUntil: "domcontentloaded" });
    await context.storageState({ path: STORAGE_STATE_PATH });
    console.log(`[AUTH_STATE] saved -> ${STORAGE_STATE_PATH}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error("[AUTH_STATE] failed", error);
  process.exit(1);
});
