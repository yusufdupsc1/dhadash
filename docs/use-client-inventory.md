# `use client` Inventory

## Classification Rules

- **REQUIRED**: File has direct client triggers (React client hooks, `next/navigation` hooks, browser globals like `window`/`document`, JSX event handlers, or client-only libraries such as Radix/Recharts/Sonner).
- **ACCIDENTAL**: File is marked with `use client` but opening context shows no clear direct trigger; usually static markup or pass-through composition that can be server-rendered.
- **LAYOUT-CONTAMINATION**: File appears client only because of surrounding layout/component structure, not because of local direct client APIs.

## Common Pitfalls

- Mistaking shared UI wrappers as server-safe when they wrap client-only primitives.
- Keeping parent/layout components as client even when only one nested child needs client behavior.
- Treating imported helper hooks as server-safe without checking whether they depend on browser APIs.
- Flagging a file as accidental before checking dynamic imports and child component boundaries.

| file | category | evidence | recommended action |
|---|---|---|---|
| `src/app/auth/forgot-password/page.tsx` | REQUIRED | uses `useState` at L4; JSX event handler at L66 | Keep as client; explicit client-only triggers are present. |
| `src/app/auth/register/page.tsx` | REQUIRED | uses `useState` at L4; uses `next/navigation` hook at L6; JSX event handler at L77 | Keep as client; explicit client-only triggers are present. |
| `src/app/auth/request-access/page.tsx` | REQUIRED | uses `useState` at L3; uses `next/navigation` hook at L5; JSX event handler at L107 | Keep as client; explicit client-only triggers are present. |
| `src/app/auth/reset-password/page.tsx` | REQUIRED | uses `useState` at L4; uses `next/navigation` hook at L6; JSX event handler at L115 | Keep as client; explicit client-only triggers are present. |
| `src/app/dashboard/error.tsx` | REQUIRED | JSX event handler at L31 | Keep as client; explicit client-only triggers are present. |
| `src/components/LanguageToggle.tsx` | REQUIRED | uses `useMemo` at L3; uses `next/navigation` hook at L4; uses browser global at L35 | Keep as client; explicit client-only triggers are present. |
| `src/components/analytics/analytics-client.tsx` | REQUIRED | renders `recharts` interactive chart primitives imported at L4-L18 | Keep as client unless chart rendering is replaced with server-safe output. |
| `src/components/announcements/announcements-client.tsx` | REQUIRED | uses `useState` at L4; JSX event handler at L136; imports client-only library at L5 | Keep as client; explicit client-only triggers are present. |
| `src/components/attendance/attendance-client.tsx` | REQUIRED | uses `useMemo` at L32; uses `next/navigation` hook at L31; imports client-only library at L33 | Keep as client; explicit client-only triggers are present. |
| `src/components/classes/classes-client.tsx` | REQUIRED | uses `useState` at L4; uses `next/navigation` hook at L14; JSX event handler at L137 | Keep as client; explicit client-only triggers are present. |
| `src/components/classes/classes-only-client.tsx` | REQUIRED | uses `useState` at L3; uses `next/navigation` hook at L6; JSX event handler at L114 | Keep as client; explicit client-only triggers are present. |
| `src/components/control/inactive-control-client.tsx` | REQUIRED | uses `useTransition` at L3; uses `next/navigation` hook at L4; imports client-only library at L5 | Keep as client; explicit client-only triggers are present. |
| `src/components/events/events-client.tsx` | REQUIRED | uses `useState` at L4; JSX event handler at L99; imports client-only library at L5 | Keep as client; explicit client-only triggers are present. |
| `src/components/exams/primary-exam-client.tsx` | REQUIRED | uses `useMemo` at L3; uses `next/navigation` hook at L4; imports client-only library at L5 | Keep as client; explicit client-only triggers are present. |
| `src/components/exports/export-options-dialog.tsx` | REQUIRED | uses `useState` at L17; uses browser global at L98; JSX event handler at L61 | Keep as client; explicit client-only triggers are present. |
| `src/components/finance/fee-payment-actions.tsx` | REQUIRED | uses `useState` at L3; uses browser global at L41; JSX event handler at L52 | Keep as client; explicit client-only triggers are present. |
| `src/components/finance/finance-client.tsx` | REQUIRED | uses `useMemo` at L4; JSX event handler at L145; imports client-only library at L5 | Keep as client; explicit client-only triggers are present. |
| `src/components/forms/login-form.tsx` | REQUIRED | uses `useEffect` at L4; uses `next/navigation` hook at L10; imports client-only library at L9 | Keep as client; explicit client-only triggers are present. |
| `src/components/grades/grades-client.tsx` | REQUIRED | uses `useState` at L4; JSX event handler at L139; imports client-only library at L5 | Keep as client; explicit client-only triggers are present. |
| `src/components/landing/demo-booking-form.tsx` | REQUIRED | uses `useState` at L3; JSX event handler at L90 | Keep as client; explicit client-only triggers are present. |
| `src/components/landing/landing-header.tsx` | ACCIDENTAL | no local hook/browser/event usage in opening section; mostly static markup + links | Candidate to convert to server component; isolate `LanguageToggle` as client child. |
| `src/components/layout/active-link.client.tsx` | REQUIRED | uses `next/navigation` hook at L4 | Keep as client; explicit client-only triggers are present. |
| `src/components/layout/app-toaster.tsx` | REQUIRED | imports client-only library at L3 | Keep as client; explicit client-only triggers are present. |
| `src/components/layout/mobile-fab.tsx` | REQUIRED | uses `useEffect` at L3; uses browser global at L14; JSX event handler at L53 | Keep as client; explicit client-only triggers are present. |
| `src/components/layout/mobile-menu-content.client.tsx` | LAYOUT-CONTAMINATION |  | Split client-only bits into leaf client islands; keep layout/server shell server-side. |
| `src/components/layout/mobile-menu-drawer.client.tsx` | REQUIRED | uses `useState` at L3; JSX event handler at L36 | Keep as client; explicit client-only triggers are present. |
| `src/components/layout/sidebar.tsx` | REQUIRED | uses `useState` at L5; uses `next/navigation` hook at L6 | Keep as client; explicit client-only triggers are present. |
| `src/components/layout/tab-loading-indicator.tsx` | REQUIRED | uses `useEffect` at L3; uses browser global at L17 | Keep as client; explicit client-only triggers are present. |
| `src/components/layout/topbar.tsx` | REQUIRED | uses `useState` at L8; JSX event handler at L36 | Keep as client; explicit client-only triggers are present. |
| `src/components/notices/notice-board-client.tsx` | REQUIRED | uses `useState` at L19; uses `next/navigation` hook at L18; JSX event handler at L191 | Keep as client; explicit client-only triggers are present. |
| `src/components/pwa/offline-banner.tsx` | REQUIRED | uses `useEffect` at L3; uses browser global at L9 | Keep as client; explicit client-only triggers are present. |
| `src/components/pwa/sw-register.tsx` | REQUIRED | uses `useEffect` at L3; uses browser global at L7 | Keep as client; explicit client-only triggers are present. |
| `src/components/settings/settings-client.tsx` | REQUIRED | uses `useEffect` at L4; uses `next/navigation` hook at L5; JSX event handler at L162 | Keep as client; explicit client-only triggers are present. |
| `src/components/students/report-preview.tsx` | REQUIRED | uses `useEffect` at L3; uses browser global at L54; JSX event handler at L190 | Keep as client; explicit client-only triggers are present. |
| `src/components/students/report-toolbar.tsx` | REQUIRED | JSX event handler at L84 | Keep as client; explicit client-only triggers are present. |
| `src/components/students/reports-workspace.tsx` | REQUIRED | uses `useEffect` at L3; JSX event handler at L136; imports client-only library at L4 | Keep as client; explicit client-only triggers are present. |
| `src/components/students/student-dialogs.client.tsx` | REQUIRED | uses `useState` at L3; uses `next/navigation` hook at L4; imports client-only library at L5 | Keep as client; explicit client-only triggers are present. |
| `src/components/students/student-row-actions.client.tsx` | REQUIRED | uses `useTransition` at L3; uses `next/navigation` hook at L4; uses browser global at L51 | Keep as client; explicit client-only triggers are present. |
| `src/components/students/student-search-select.tsx` | REQUIRED | uses `useEffect` at L3; JSX event handler at L78 | Keep as client; explicit client-only triggers are present. |
| `src/components/students/students-header.tsx` | REQUIRED | calls client hook `useT()` from `@/lib/i18n/client` at L5-L8 | Keep as client, or migrate i18n to server dictionary props. |
| `src/components/students/students-toolbar.client.tsx` | REQUIRED | uses `useTransition` at L3; JSX event handler at L84; imports client-only library at L9 | Keep as client; explicit client-only triggers are present. |
| `src/components/students/template-selector.tsx` | REQUIRED | JSX event handler at L98 | Keep as client; explicit client-only triggers are present. |
| `src/components/subjects/subjects-client.tsx` | REQUIRED | uses `useState` at L3; uses `next/navigation` hook at L6; JSX event handler at L84 | Keep as client; explicit client-only triggers are present. |
| `src/components/teachers/teachers-client.tsx` | REQUIRED | uses `useState` at L4; uses `next/navigation` hook at L5; JSX event handler at L145 | Keep as client; explicit client-only triggers are present. |
| `src/components/timetable/govt-primary-routine-client.tsx` | REQUIRED | uses `useEffect` at L17; uses `next/navigation` hook at L16; imports client-only library at L18 | Keep as client; explicit client-only triggers are present. |
| `src/components/timetable/timetable-client.tsx` | REQUIRED | uses `useState` at L3; uses `next/navigation` hook at L6; JSX event handler at L108 | Keep as client; explicit client-only triggers are present. |
| `src/components/ui/data-table-pagination.tsx` | REQUIRED | uses `next/navigation` hook at L4; JSX event handler at L49 | Keep as client; explicit client-only triggers are present. |
| `src/components/ui/dialog.tsx` | REQUIRED | wraps `@radix-ui` interactive primitive (`Root/Trigger/Content`) at L4-L12 | Keep as client; shared interactive primitive. |
| `src/components/ui/macos-toast.tsx` | REQUIRED | JSX event handler at L24; imports client-only library at L4 | Keep as client; explicit client-only triggers are present. |
| `src/components/ui/search-input.tsx` | REQUIRED | uses `useCallback` at L5; uses `next/navigation` hook at L4; JSX event handler at L54 | Keep as client; explicit client-only triggers are present. |
| `src/components/ui/select.tsx` | REQUIRED | wraps `@radix-ui` interactive primitive (`Root/Trigger/Content`) at L4-L12 | Keep as client; shared interactive primitive. |
| `src/components/ui/tabs.tsx` | REQUIRED | wraps `@radix-ui` interactive primitive (`Root/Trigger/Content`) at L4-L12 | Keep as client; shared interactive primitive. |
| `src/lib/i18n/client.ts` | REQUIRED | uses `useEffect` at L3; uses browser global at L18 | Keep as client; explicit client-only triggers are present. |

Total files with top-level `use client`: **53**.