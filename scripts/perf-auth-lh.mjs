import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const HOST = process.env.PERF_HOST ?? "127.0.0.1";
const PORT = process.env.PERF_PORT ?? "3100";
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${HOST}:${PORT}`;
const STORAGE_STATE_PATH =
  process.env.AUTH_STORAGE_STATE_PATH ??
  path.resolve(process.cwd(), "reports/lighthouse/authenticated/storage-state.json");

function run(command, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      env: { ...process.env, ...opts.env },
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function waitForServer(url, timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status >= 200 && res.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Server did not become ready: ${url}`);
}

async function main() {
  await fs.mkdir(path.dirname(STORAGE_STATE_PATH), { recursive: true });

  await run("corepack", ["pnpm", "exec", "next", "build", "--webpack"]);

  const server = spawn(
    "node",
    [".next/standalone/server.js"],
    {
      stdio: "inherit",
      env: { ...process.env, HOSTNAME: HOST, PORT },
    },
  );

  try {
    await waitForServer(`${BASE_URL}/auth/login`);

    await run("corepack", ["pnpm", "exec", "tsx", "scripts/create-auth-state.ts"], {
      env: {
        PLAYWRIGHT_BASE_URL: BASE_URL,
        AUTH_STORAGE_STATE_PATH: STORAGE_STATE_PATH,
      },
    });

    await run("node", ["scripts/lh-auth-dashboard.mjs"], {
      env: {
        PLAYWRIGHT_BASE_URL: BASE_URL,
        AUTH_STORAGE_STATE_PATH: STORAGE_STATE_PATH,
      },
    });
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error("[PERF_AUTH_LH] failed", error);
  process.exit(1);
});
