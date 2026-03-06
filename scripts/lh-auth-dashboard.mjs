import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import fs from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";
const ROUTE = process.env.LH_ROUTE ?? "/bn/dashboard";
const RUN_LABEL = process.env.LH_RUN_LABEL ?? "post-refactor-auth";
const STORAGE_STATE_PATH =
  process.env.AUTH_STORAGE_STATE_PATH ??
  path.resolve(process.cwd(), "reports/lighthouse/authenticated/storage-state.json");
const OUT_DIR = path.resolve(process.cwd(), "reports/lighthouse/authenticated");

const LH_CONFIG = {
  extends: "lighthouse:default",
  settings: {
    formFactor: "mobile",
    throttlingMethod: "simulate",
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      cpuSlowdownMultiplier: 4,
      requestLatencyMs: 562.5,
      downloadThroughputKbps: 1474.56,
      uploadThroughputKbps: 675,
    },
    screenEmulation: {
      mobile: true,
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      disabled: false,
    },
    emulatedUserAgent:
      "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
    onlyCategories: ["performance"],
  },
};

function toCookieHeader(storageState, targetUrl) {
  const url = new URL(targetUrl);
  const host = url.hostname;
  const requestPath = url.pathname || "/";
  
  const cookies = (storageState.cookies ?? []).filter((cookie) => {
    const domain = (cookie.domain ?? "").replace(/^\./, "");
    const domainMatch = host === domain || host.endsWith(`.${domain}`);
    const cookiePath = cookie.path ?? "/";
    const pathMatch = requestPath.startsWith(cookiePath);
    return domainMatch && pathMatch;
  });

  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

function extractMetrics(lhr) {
  const audits = lhr.audits;
  return {
    performanceScore: Math.round((lhr.categories.performance?.score ?? 0) * 100),
    fcp: audits["first-contentful-paint"]?.displayValue ?? "–",
    lcp: audits["largest-contentful-paint"]?.displayValue ?? "–",
    tbt: audits["total-blocking-time"]?.displayValue ?? "–",
    cls: audits["cumulative-layout-shift"]?.displayValue ?? "–",
    si: audits["speed-index"]?.displayValue ?? "–",
    ttfb: audits["server-response-time"]?.displayValue ?? "–",
  };
}

async function run() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const rawState = await fs.readFile(STORAGE_STATE_PATH, "utf8");
  const storageState = JSON.parse(rawState);
  const targetUrl = `${BASE_URL}${ROUTE}`;
  const cookieHeader = toCookieHeader(storageState, targetUrl);

  if (!cookieHeader) {
    throw new Error(`No matching cookies found in storage state: ${STORAGE_STATE_PATH}`);
  }

  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless", "--disable-gpu", "--no-sandbox"],
  });

  try {
    const result = await lighthouse(
      targetUrl,
      {
        port: chrome.port,
        output: ["html", "json"],
        logLevel: "error",
        extraHeaders: { Cookie: cookieHeader },
      },
      LH_CONFIG,
    );

    if (!result) throw new Error("Lighthouse returned null result");

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const routeSlug = ROUTE.replace(/^\//, "").replace(/\//g, "-");
    const basename = `${routeSlug}-${RUN_LABEL}-${timestamp}`;

    const [htmlReport, jsonReport] = Array.isArray(result.report)
      ? result.report
      : [result.report, JSON.stringify(result.lhr, null, 2)];

    const htmlPath = path.join(OUT_DIR, `${basename}.html`);
    const jsonPath = path.join(OUT_DIR, `${basename}.json`);
    const latestHtmlPath = path.join(OUT_DIR, `${routeSlug}-latest.html`);
    const latestJsonPath = path.join(OUT_DIR, `${routeSlug}-latest.json`);

    await fs.writeFile(htmlPath, htmlReport, "utf8");
    await fs.writeFile(jsonPath, typeof jsonReport === "string" ? jsonReport : JSON.stringify(result.lhr, null, 2), "utf8");
    await fs.copyFile(htmlPath, latestHtmlPath);
    await fs.copyFile(jsonPath, latestJsonPath);

    const metrics = extractMetrics(result.lhr);
    const summary = {
      timestamp,
      runLabel: RUN_LABEL,
      route: ROUTE,
      baseUrl: BASE_URL,
      htmlPath,
      jsonPath,
      latestHtmlPath,
      latestJsonPath,
      metrics,
    };

    const summaryPath = path.join(OUT_DIR, `${routeSlug}-${RUN_LABEL}-summary.json`);
    const latestSummaryPath = path.join(OUT_DIR, `${routeSlug}-latest-summary.json`);

    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), "utf8");
    await fs.writeFile(latestSummaryPath, JSON.stringify(summary, null, 2), "utf8");

    console.log("[LH_AUTH] completed", summary);
  } finally {
    await chrome.kill();
  }
}

run().catch((error) => {
  console.error("[LH_AUTH] failed", error);
  process.exit(1);
});
