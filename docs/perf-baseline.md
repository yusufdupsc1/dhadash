# Dashboard Perf Baseline — ScholaOPS / Dhadash v2.0.3

> **Date captured:** 2026-03-04 (pre-optimisation baseline)
> **Branch:** main · **Env:** local dev (`pnpm dev`)
> **To re-run:** see [Reproduction Steps](#reproduction-steps)

---

## 1. Lighthouse — Mobile Simulated (Moto G Power 4×CPU, 1.6 Mbps)

> Run `pnpm perf:lighthouse` to regenerate. Requires `AUTH_COOKIE` env + dev server running.
> Raw reports → `./perf/lh/`

| Page                  | Perf Score | LCP       | TBT       | TTFB      | CLS       | FCP       | SI        | JS (kB)   |
| --------------------- | ---------- | --------- | --------- | --------- | --------- | --------- | --------- | --------- |
| `/dashboard`          | _pending_  | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ |
| `/dashboard/students` | _pending_  | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ |
| `/dashboard/finance`  | _pending_  | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ |

> **Fill in after first run:** copy the console table from `pnpm perf:lighthouse` into rows above.

### Definitions

| Metric   | Target (good) | Notes                                              |
| -------- | ------------- | -------------------------------------------------- |
| **LCP**  | < 2.5 s       | Largest Contentful Paint                           |
| **TBT**  | < 200 ms      | Total Blocking Time (JS parse/exec on main thread) |
| **TTFB** | < 800 ms      | Server Response Time (includes DB + auth check)    |
| **CLS**  | < 0.1         | Cumulative Layout Shift                            |
| **FCP**  | < 1.8 s       | First Contentful Paint                             |
| **SI**   | < 3.4 s       | Speed Index                                        |

---

## 2. Playwright Trace

Run `pnpm perf:trace` (requires `AUTH_COOKIE`).

- Desktop trace → `./perf/trace-desktop.zip`
- Mobile trace → `./perf/trace-mobile.zip`
- View: `npx playwright show-trace perf/trace-desktop.zip`

---

## 3. Known Issue: Hamburger Not Working

### Root Cause

**The hamburger button does not exist in the codebase.**

`src/app/dashboard/layout.tsx` mounts:

```
<Sidebar session={session} />    ← desktop-only (hidden on mobile, CSS: hidden lg:flex)
<TopBar session={session} />     ← no hamburger button, only Bell + LanguageToggle
<MobileNav session={session} />  ← fixed-bottom 4-tab nav (no sheet/drawer)
```

`src/components/layout/sidebar.tsx` is wrapped in:

```css
aside.hidden.lg: flex;
```

This means on screens narrower than `lg` (1024 px) **the sidebar is completely hidden** with no toggle to open it. `TopBar` (`src/components/layout/topbar.tsx`) contains only a notification bell and a language switcher — **zero hamburger/menu buttons**.

### Reproduction Steps

1. Open `http://localhost:3000/dashboard` in DevTools mobile mode at ≤ 1023 px width.
2. Observe: no hamburger / menu icon anywhere in the header.
3. Only nav available: the 4-tab `MobileNav` fixed at the bottom.
4. Items reachable on mobile: Dashboard, Students, Teachers, Governance (admin role).

### Fix Required (next task)

- Add a `<button>` to `TopBar` (mobile-only, `lg:hidden`) that opens `Sidebar` as a `<Sheet>` (drawer) from `@radix-ui/react-dialog` (already in `package.json`).

---

## 4. Known Issue: Nav Clicks Slow

### Symptoms

- Clicking sidebar links triggers a Next.js client-side navigation.
- All sidebar and MobileNav links use `prefetch={false}` — **zero prefetching is active**.
- Each navigation waits for the RSC payload for the new page from the server.
- At `localhost` this is fast; under Lighthouse 4×CPU throttle, expect noticeable delay.

### Root Cause

```tsx
// sidebar.tsx L363, L429 — same pattern in mobile-nav.tsx L79
<Link href={item.href} prefetch={false} ...>
```

`prefetch={false}` is set globally for _all_ nav links. Under throttled conditions this means each navigation hits the server cold.

### Fix Required (next task)

Change high-priority nav links (`/dashboard`, `/dashboard/students`, `/dashboard/finance`) to `prefetch={true}` or remove the prop (Next.js default = prefetch on viewport).

---

## 5. Global Client Components Mounted by `dashboard/layout.tsx`

All of these run their JS bundle on **every** dashboard page load.

| Component          | File                                    | `"use client"` | What it does                                                                        |
| ------------------ | --------------------------------------- | -------------- | ----------------------------------------------------------------------------------- |
| `<Sidebar>`        | `src/components/layout/sidebar.tsx`     | ✅             | Full desktop sidebar — uses `useState`, `usePathname`, `useSearchParams`, `signOut` |
| `<TopBar>`         | `src/components/layout/topbar.tsx`      | ✅             | Header bar — uses `useT`, `useGovtPrimaryT`, `isGovtPrimaryModeEnabled`             |
| `<MobileNav>`      | `src/components/layout/mobile-nav.tsx`  | ✅             | Bottom 4-tab nav — uses `usePathname`, `useT`                                       |
| `<AppToaster>`     | `src/components/layout/app-toaster.tsx` | ✅             | Sonner `<Toaster>` — subscribes to toast events globally                            |
| `<LanguageToggle>` | `src/components/LanguageToggle.tsx`     | ✅             | Locale switcher inside TopBar                                                       |

**Total client components in layout shell: 5**

All 5 hydrate on every navigation. `Sidebar` is the largest due to `NAV_SECTIONS` config, `useState` for expanded groups, and `useSearchParams` (which opts the entire component out of static rendering).

> **`useSearchParams` in `Sidebar`** also forces the entire layout subtree into dynamic rendering for active-link detection.  
> This is the single highest-leverage SSR split opportunity.

---

## 6. Reproduction Steps Summary

```bash
# 1. Start dev server
pnpm dev

# 2. Login at localhost:3000/auth/login
#    Copy cookie from browser DevTools → Application → Cookies
#    next-auth.session-token=<value>

# 3. Run Lighthouse (mobile, 3 pages)
AUTH_COOKIE="next-auth.session-token=<value>" pnpm perf:lighthouse

# 4. Run Playwright traces (desktop + mobile)
AUTH_COOKIE="next-auth.session-token=<value>" pnpm perf:trace

# 5. View traces
npx playwright show-trace perf/trace-desktop.zip
npx playwright show-trace perf/trace-mobile.zip
```


---

## 7. Authenticated Lighthouse Workflow (Post-login / Dashboard)

Single-command local run (no manual browser interaction after env is set):

```bash
E2E_ADMIN_EMAIL=<email> E2E_ADMIN_PASSWORD=<password> E2E_ADMIN_SCHOOL_CODE=<optional> pnpm perf:lighthouse:auth
```

Implemented flow:

1. [`scripts/perf-auth-lh.mjs`](scripts/perf-auth-lh.mjs:1) builds app and starts standalone server.
2. [`scripts/create-auth-state.ts`](scripts/create-auth-state.ts:1) logs in with Playwright using env credentials and writes [`reports/lighthouse/authenticated/storage-state.json`](reports/lighthouse/authenticated/storage-state.json).
3. [`scripts/lh-auth-dashboard.mjs`](scripts/lh-auth-dashboard.mjs:1) converts storage state cookies to request header and runs Lighthouse against authenticated dashboard route.
4. Artifacts are persisted to [`reports/lighthouse/authenticated/`](reports/lighthouse/authenticated/) with deterministic naming and latest aliases.

### Current post-refactor run status

- Workflow/tooling: ✅ implemented.
- Playwright storageState authentication workflow: ✅ implemented via [`scripts/create-auth-state.ts`](scripts/create-auth-state.ts:1).
- Standalone server launch path: ✅ implemented via [`scripts/perf-auth-lh.mjs`](scripts/perf-auth-lh.mjs:1).
- Artifact persistence: ✅ implemented (HTML + JSON + summary in [`reports/lighthouse/authenticated/`](reports/lighthouse/authenticated/)).
- Metric capture for authenticated `/dashboard`: ⚠️ **officially blocked** pending valid credentials.

#### Blocked capture evidence

- Exact executed command:
  - `E2E_ADMIN_EMAIL=admin@school.edu E2E_ADMIN_PASSWORD=admin123 corepack pnpm run perf:lighthouse:auth > reports/lighthouse/authenticated/auth-capture-blocked.log 2>&1`
- Evidence log path:
  - [`reports/lighthouse/authenticated/auth-capture-blocked.log`](reports/lighthouse/authenticated/auth-capture-blocked.log:1)
- Recorded exit status:
  - **1** (see `ELIFECYCLE Command failed with exit code 1` in the log at [`reports/lighthouse/authenticated/auth-capture-blocked.log`](reports/lighthouse/authenticated/auth-capture-blocked.log:132))
- Recorded failure detail:
  - Playwright auth state generation timed out waiting for dashboard redirect in [`loginAsAdmin()`](tests/e2e/helpers/auth.ts:18) during [`scripts/create-auth-state.ts`](scripts/create-auth-state.ts:19), with `[AUTH_STATE] failed page.waitForURL: Timeout 60000ms exceeded.` in the same log.

### Baseline comparison note

Previous baseline (from [`perf/lh/summary-after.json`](perf/lh/summary-after.json:1)):
- `/dashboard` perf score: **58**
- LCP: **2.9 s**
- TBT: **1,830 ms**

Authenticated post-refactor deltas for `/dashboard` remain **unchanged/pending** until a successful authenticated capture completes with valid credentials.

### Rerun instruction (with real credentials)

Use existing env var names with valid values and rerun:

```bash
E2E_ADMIN_EMAIL=<real-admin-email> \
E2E_ADMIN_PASSWORD=<real-admin-password> \
E2E_ADMIN_SCHOOL_CODE=<optional-school-code> \
corepack pnpm run perf:lighthouse:auth
```
