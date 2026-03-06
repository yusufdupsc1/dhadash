# use client Surface-Reduction Plan (Next.js App Router)

## Target Files

Highest-level client entry points that can hydrate broad UI regions (directly or via shared shells):

1. `src/app/layout.tsx`
   - Server file, but imports three global client components: `ServiceWorkerRegistration`, `TabLoadingIndicator`, `OfflineBanner`.
   - Impact: every route includes these client islands in root shell.

2. `src/app/dashboard/layout.tsx`
   - Server layout importing client pieces (`MobileFAB`, `AppToaster`) and server wrappers that in turn import client leaves.
   - Impact: all dashboard routes hydrate shell-level interactivity.

3. `src/app/page.tsx`
   - Server page importing `LandingHeader` (currently marked client) and `DemoBookingForm` (client).
   - Impact: homepage shell can be promoted broader than necessary because header is currently client.

4. `src/components/layout/topbar.server.tsx` (server wrapper over client drawer)
   - Imports `MobileMenuDrawer` (client) and `LanguageToggle` (client).
   - Impact: top navigation always includes client runtime hooks and dialog behavior.

5. `src/components/layout/sidebar.server.tsx` / `src/components/layout/mobile-nav.server.tsx`
   - Server wrappers importing `ActiveLink` (client).
   - Impact: per-link client behavior for active route detection.

6. Client pages under auth (`src/app/auth/*/page.tsx`) and dashboard error boundary (`src/app/dashboard/error.tsx`)
   - Scoped to route segments; not shell-wide, but still page-level client boundaries.

## Dependency Map

### A) Root shell path
- `src/app/layout.tsx` (server)
  - -> `src/components/pwa/sw-register.tsx` (`"use client"`)
    - uses browser APIs (`navigator.serviceWorker`, `window.addEventListener`)
  - -> `src/components/layout/tab-loading-indicator.tsx` (`"use client"`)
    - uses `document`, `window.fetch` patching, timers, title/favicon mutation
  - -> `src/components/pwa/offline-banner.tsx` (`"use client"`)
    - listens to `online/offline`, reads `navigator.onLine`

Resulting promoted runtime: global browser event listeners and hydration hooks loaded on every route.

### B) Dashboard shell path
- `src/app/dashboard/layout.tsx` (server)
  - -> `src/components/layout/topbar.server.tsx` (server)
    - -> `src/components/layout/mobile-menu-drawer.client.tsx` (`"use client"`)
      - -> dynamic import `src/components/layout/mobile-menu-content.client.tsx` (`"use client"`, `ssr:false`)
      - -> `src/components/ui/dialog.tsx` (`"use client"`, Radix)
    - -> `src/components/LanguageToggle.tsx` (`"use client"`)
      - -> `src/lib/i18n/client.ts` (`"use client"`, `document.cookie`, `localStorage`, `window` events)
  - -> `src/components/layout/sidebar.server.tsx` (server)
    - -> `src/components/layout/active-link.client.tsx` (`"use client"`, `usePathname`)
  - -> `src/components/layout/mobile-nav.server.tsx` (server)
    - -> `src/components/layout/active-link.client.tsx` (`"use client"`, `usePathname`)
  - -> `src/components/layout/mobile-fab.tsx` (`"use client"`)
    - scroll listeners + DOM access + server action form submit
  - -> `src/components/layout/app-toaster.tsx` (`"use client"`)
    - `sonner` client runtime

Resulting promoted runtime: dashboard shell loads client routing hooks, dialog system, i18n client hook chain, scroll listeners, and toast runtime across all dashboard pages.

### C) Landing page path
- `src/app/page.tsx` (server)
  - -> `src/components/landing/landing-header.tsx` (`"use client"` currently)
    - -> `src/components/LanguageToggle.tsx` (`"use client"`)
      - -> `src/lib/i18n/client.ts` (`"use client"`)
  - -> `src/components/landing/demo-booking-form.tsx` (`"use client"`)
    - form state + `fetch` submit + event handlers

Resulting promoted runtime: static header markup is currently bundled as client mostly due to embedding language switcher.

## Refactor Approach

1. Keep shell components server-first; push `"use client"` to leaf interactions.
   - Convert `src/components/landing/landing-header.tsx` to server component.
   - Keep `LanguageToggle` as isolated client child island.

2. Split dashboard shell interactivity into minimal islands.
   - Keep `topbar.server.tsx` and `sidebar.server.tsx` server.
   - Ensure only minimal client controls are client:
     - `mobile-menu-drawer.client.tsx`
     - `active-link.client.tsx` (or replace with server-computed active state when route is known)
     - `LanguageToggle`

3. Reduce globally mounted client utilities in root layout.
   - Consider route-scoping `TabLoadingIndicator` and `OfflineBanner` to dashboard/interactive segments if acceptable.
   - Keep service worker registration isolated and lazy-safe.

4. Keep client pages local; do not elevate stateful forms to layout level.
   - Auth pages remain client (expected for form interactions), but avoid sharing their client state via parent layouts.

5. Introduce explicit “client island boundaries” conventions.
   - Naming: `*.client.tsx` for leaf islands only.
   - Server wrappers should import client leaves, not vice versa.

6. Validate promotion risk before each change.
   - For any candidate component, verify if it uses: React client hooks, browser globals, event handlers requiring state, or client-only third-party libraries.

## Performance Rationale (TBT/LCP)

- Lowering top-level client boundaries reduces JavaScript shipped, parsed, compiled, and executed during initial load.
- Smaller hydrated trees reduce hydration work on the main thread, directly lowering Total Blocking Time (TBT).
- When static/header/layout markup remains server-rendered, HTML can stream earlier and paint sooner, improving Largest Contentful Paint (LCP).
- Isolating interactivity into tiny islands means only interactive controls hydrate, not the entire structural shell.
- Avoiding shell-wide client promotion prevents pulling transitive modules (hooks, routing utilities, dialog runtimes, i18n client helpers) into all route bundles.

## Next.js App Router Watchouts

1. Server/client import constraints
   - Server components may import client components as children, but client components cannot import server-only modules (`next/headers`, server actions directly in client execution context).

2. Context/provider placement
   - Providers needing browser APIs should be placed as deep as possible; top-level provider placement promotes large subtrees to client.

3. Dynamic import behavior
   - `dynamic(..., { ssr: false })` forces client-only render for that subtree; useful for heavy widgets but can hide architecture debt if overused.

4. Serialization boundaries
   - Props crossing server -> client must be serializable; functions/class instances/non-serializable objects force redesign.

5. Avoid accidental client promotion
   - Adding `usePathname`, `useRouter`, `window`, `document`, or client-only libs in shell components can silently turn broad UI segments into client islands.

6. Error/loading/template segment behavior
   - Segment files like `error.tsx` are expected client in many cases; keep them route-local and avoid shared imports that drag in heavy client dependencies.

## Risks

- Behavior regressions in navigation active states if replacing client route hooks.
- Locale switching UX regressions if `LanguageToggle` isolation is done incorrectly.
- Mobile drawer interaction regressions from dialog boundary changes.
- Potential mismatch/flicker if server-rendered locale and client preference reconciliation is not aligned.
- Over-optimizing can increase complexity if too many micro-islands are introduced without clear ownership.

## Rollback Strategy

1. Refactor in small, reversible PRs by boundary (landing header, dashboard topbar chain, root utilities).
2. After each step, validate route-level behavior (navigation, locale switching, menu drawer, toasts, scroll FAB).
3. Track bundle/hydration metrics (Lighthouse + Web Vitals) before/after each PR.
4. If regression appears, revert only the last boundary PR and keep prior successful reductions.
5. Maintain a fallback branch/tag containing pre-refactor shell structure for quick restore.
