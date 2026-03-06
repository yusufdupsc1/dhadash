# Refactor / CI Stabilization Log

## Scope

- Keep `.github/workflows/ci.yml` as canonical auto-running CI/CD.
- Retain `.github/workflows/ci-cd.yml` and `.github/workflows/ci-minimal.yml` as manual-only (`workflow_dispatch`) to avoid duplicate automatic pipelines while preserving fallback playbooks.
- Apply high-confidence, behavior-preserving improvements only.
- Audit `"use client"` usage and only refactor where safety is unambiguous.

## Changes Applied

### CI/CD

1. Canonical workflow: `.github/workflows/ci.yml` (auto trigger on push/PR).
2. Added workflow concurrency with `cancel-in-progress`.
3. Expanded PR trigger to include `develop` for parity with push trigger.
4. Added deterministic pnpm cache keying via `cache-dependency-path: pnpm-lock.yaml` on lint/test/build/deploy setup-node steps.
5. Added PostgreSQL service container for test job.
6. Updated test command to non-watch execution: `pnpm run test -- --run`.
7. Fixed Docker Hub login to support both GitHub `secrets` and `vars` fallbacks.
8. Reworked Vercel deploy gating in `ci.yml` to runtime secret check step (`Check Vercel secret availability`) + conditional deploy step.
9. Converted `.github/workflows/ci-cd.yml` to `workflow_dispatch` only and replaced unresolved `vercel/action@v4` with CLI deploy (`pnpm dlx vercel ...`) guarded by runtime secret check.
10. Converted `.github/workflows/ci-minimal.yml` to `workflow_dispatch` only to prevent duplicate automatic pipeline execution.

### `use client` audit & minimal refactor (this task)

#### Selected contamination root

- Highest-level candidate selected from `docs/use-client-plan.md`: landing shell path in `src/app/page.tsx` via `src/components/landing/landing-header.tsx`.
- Goal: remove one high-level accidental `"use client"` boundary without changing behavior.

#### Changed files

1. `src/components/landing/landing-header.tsx`
   - **Before**: top-level `"use client"` on a largely static header shell.
   - **After**: removed top-level `"use client"`; component is now server-compatible.
   - **Why safe**: file uses static JSX, links, and composition. Interactive locale behavior remains in nested `LanguageToggle` client island.

2. `docs/use-client-inventory.md`
   - Updated earlier during audit to reflect full inventory and classifications.

#### Before/After architecture reasoning

- **Before**:
  - `src/app/page.tsx` (server) -> `landing-header.tsx` (client) -> `LanguageToggle` (client) -> `lib/i18n/client.ts` (client)
  - This promoted the full header shell into client runtime, even though only locale toggle needed client behavior.

- **After**:
  - `src/app/page.tsx` (server) -> `landing-header.tsx` (**server**) -> `LanguageToggle` (client) -> `lib/i18n/client.ts` (client)
  - Client boundary is pushed down to the true interactive leaf, reducing accidental client contamination of static header markup.

- **Functional parity**:
  - Header structure, links, styling, and embedded `LanguageToggle` placement remain unchanged.
  - No auth/session/request/token/validation behavior touched.

## Validation Log (command evidence)

Executed with `corepack`-scoped pnpm due shell PATH differences.

1. `corepack pnpm run lint`
   - Exit: `0`
   - Result: passed with one existing warning in `coverage/block-navigation.js` (non-blocking warning, zero lint errors).

2. `corepack pnpm run type-check`
   - Exit: `0`
   - Result: passed (`tsc --noEmit`).

3. `corepack pnpm run build`
   - Exit: `0`
   - Result: production build completed successfully; route manifest emitted.

Notes on transient build lock:
- During repeated validation attempts, an existing `next build` process held `.next/lock` temporarily.
- After clearing stale lock/process state, the final `build` run completed successfully with exit `0`.

## Notes

- This change is intentionally minimal and scoped to one contamination root only.
- No source behavior rewrites, no auth semantics changes, no routing contract changes.
- Client surface area reduced by converting one high-level accidental client shell to server-first composition while preserving interactive leaf islands.


## Mini-step 2: Auth forgot-password boundary split

### Files changed
- `src/app/auth/forgot-password/page.tsx`
- `src/components/auth/forgot-password-page-client.tsx`

### Architecture change
- Before: route file `src/app/auth/forgot-password/page.tsx` was directly client (`"use client"`).
- After: route file is server wrapper that renders leaf client component `src/components/auth/forgot-password-page-client.tsx`.
- Tradeoff: an extra wrapper component file increases file count, but keeps route entry server-first and isolates client state to the smallest leaf.

### Why this remains safe
- No changes to actions, validation, request flow, redirects, auth/session, or token behavior.
- Existing form behavior and UI interactions remain in the client leaf.

### Validation evidence
- Lint: `corepack pnpm run lint` -> exit `0` (existing non-blocking warning in `coverage/block-navigation.js`).
- Type-check: `corepack pnpm run type-check` -> exit `0`.
- Build: `corepack pnpm run build` -> exit `0`.

### Why some parts must remain client
- Form state (`useState`/`useTransition`), submit handlers, and immediate UI state transitions require client runtime.
- Therefore only the page shell moved server-side; interactive form stays client.


## Mini-step 3: Auth register boundary split

### Files changed
- `src/app/auth/register/page.tsx`
- `src/components/auth/register-page-client.tsx`

### Architecture change
- Before: route file `src/app/auth/register/page.tsx` was directly client (`"use client"`).
- After: route file is server wrapper that renders leaf client component `src/components/auth/register-page-client.tsx`.
- Tradeoff: this introduces a wrapper layer, but keeps App Router entry server-first and confines hydration to true interaction-heavy form logic.

### Why this remains safe
- Registration action call, field validation behavior, transition states, and success navigation remain unchanged.
- No changes to auth/session/token semantics or request flows.

### Validation evidence
- Lint: `corepack pnpm run lint` -> exit `0` (existing non-blocking warning in `coverage/block-navigation.js`).
- Type-check: `corepack pnpm run type-check` -> exit `0`.
- Build: `corepack pnpm run build` -> exit `0`.

### Why some parts must remain client
- Password visibility toggle, local validation feedback rendering, pending transition UI, toast display, and router push are client-runtime concerns.
- Therefore only page entry moved server-side; form interaction component remains client.


## Mini-step 4: Add guarded Playwright smoke for BN dashboard

### Files changed
- `tests/e2e/helpers/auth.ts`
- `tests/e2e/dashboard/bn-dashboard-smoke.spec.ts`
- `.github/workflows/ci.yml`

### What was added
1. Env-driven login helper:
   - `loginAsAdmin` now reads `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, and optional `E2E_ADMIN_SCHOOL_CODE` with safe local fallbacks.
2. Minimal smoke spec:
   - Logs in with env credentials.
   - Navigates to `/bn/dashboard`.
   - Asserts key dashboard elements: `#dashboard-main` and `data-testid=topbar-home-link`.
3. CI integration:
   - Added guarded `e2e_smoke` job in `ci.yml`.
   - Job runs after build and only executes browser install + smoke test when required credentials are present in secrets.

### Why this reduces ambiguity vs manual testing
- Manual checks are inconsistent and often skip locale-specific paths; this smoke makes `/bn/dashboard` verification deterministic and repeatable on every CI run.
- Assertions encode exact expected UI contract (successful login + dashboard shell presence) and fail fast on regressions.
- Credential-gated execution allows production-like login flow coverage in CI without exposing secrets or breaking forks lacking credentials.

### Validation evidence
- Lint: `corepack pnpm run lint` -> exit `0` (existing non-blocking warning in `coverage/block-navigation.js`).
- Type-check: `corepack pnpm run type-check` -> exit `0`.
- Build: `corepack pnpm run build` -> exit `0`.

### Tradeoffs
- Added CI time for browser install/test when credentials exist.
- Guarded credential check keeps pipeline resilient in environments without secrets.


## Mini-step 5: Authenticated Lighthouse workflow (Playwright storageState)

### Files added/updated
- `scripts/create-auth-state.ts`
- `scripts/lh-auth-dashboard.mjs`
- `scripts/perf-auth-lh.mjs`
- `package.json` (new scripts: `perf:auth:state`, `perf:lighthouse:auth:dashboard`, `perf:lighthouse:auth`)
- `docs/perf-baseline.md` (workflow + status + comparison note)

### Implemented behavior
- Playwright login uses existing env-driven helper and writes storage state file.
- Lighthouse consumes authenticated cookie header derived from storage state.
- Artifacts are stored under committed path `reports/lighthouse/authenticated/` with deterministic filenames and `*-latest.*` aliases.
- End-to-end command for local execution:
  - `pnpm perf:lighthouse:auth`

### Result status
- Toolchain implementation: ✅ complete.
- Metrics collection in this environment: ⚠️ blocked by invalid credentials provided for login.
- Because auth never reached dashboard, Lighthouse produced non-actionable 404/error output for localized route attempts.

### Why this still improves learning and reliability
- Removes manual cookie copy/paste and makes authenticated perf auditing reproducible.
- Produces consistent artifact structure for before/after diffing once credentials are valid.
- Encodes login + audit into deterministic automation, reducing human-run variance.


## Mini-step 6: Finalize authenticated Lighthouse status as blocked (no backfilled metrics)

### Decision
- Keep all authenticated Lighthouse tooling changes in place.
- Do **not** invent/backfill post-refactor authenticated `/dashboard` numbers.
- Treat authenticated metric collection as officially blocked until valid credentials are provided.

### Evidence (captured)
- Exact command executed:
  - `E2E_ADMIN_EMAIL=admin@school.edu E2E_ADMIN_PASSWORD=admin123 corepack pnpm run perf:lighthouse:auth > reports/lighthouse/authenticated/auth-capture-blocked.log 2>&1`
- Log file used for evidence:
  - [`reports/lighthouse/authenticated/auth-capture-blocked.log`](reports/lighthouse/authenticated/auth-capture-blocked.log:1)
- Recorded exit status:
  - **1** (ELIFECYCLE in log at [`reports/lighthouse/authenticated/auth-capture-blocked.log`](reports/lighthouse/authenticated/auth-capture-blocked.log:132))

### Block reason
- Login failed with `admin@school.edu` / `admin123` and timed out waiting for dashboard redirect (`page.waitForURL`) during storageState generation, before authenticated Lighthouse could collect valid `/dashboard` metrics.

### Documentation alignment
- Updated [`docs/perf-baseline.md`](docs/perf-baseline.md:149) to explicitly mark authenticated `/dashboard` capture pending and baseline deltas unchanged until successful rerun with real credentials.
