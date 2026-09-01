# claude-roadmap.md — Prioritized Roadmap for *It Is Finished*

> Companion to [review-report.md](file:///C:/Users/admin/.gemini/antigravity/brain/c10620e4-9608-461f-9e26-3a318503ba6e/review-report.md)

---

## 🔴 Tier 1: Critical Fixes Before Wider Use

These must be resolved before sharing the app with beta users or deploying to production.

---

### 1.1 — Drop Debug SECURITY DEFINER RPCs

| Field | Detail |
|-------|--------|
| **Priority** | P0 — CRITICAL |
| **Impact** | Any authenticated user can dump all profiles, workspaces, and members. Full data breach vector. |
| **Complexity** | Trivial (~15 min) |
| **Affected files** | New migration: `supabase/migrations/YYYYMMDD_drop_debug_rpcs.sql` |
| **Prerequisites** | None |
| **Risks** | If `check_profiles.js` or `test_logs.js` are still used for debugging, they will break. |
| **Acceptance criteria** | `SELECT debug_get_profiles()` returns `function does not exist` error. `debug_logs` table dropped. Root debug scripts deleted or moved to `scripts/debug/`. |

```sql
-- Migration content:
DROP FUNCTION IF EXISTS public.debug_get_profiles();
DROP FUNCTION IF EXISTS public.debug_get_workspaces();
DROP FUNCTION IF EXISTS public.debug_get_workspace_members();
DROP TABLE IF EXISTS public.debug_logs;
```

---

### 1.2 — Remove Production Debug Globals

| Field | Detail |
|-------|--------|
| **Priority** | P0 — CRITICAL |
| **Impact** | `window.__DEBUG_SUPABASE` exposes active auth tokens to any browser extension or XSS payload. |
| **Complexity** | Trivial (~10 min) |
| **Affected files** | [expose.ts](file:///c:/Users/admin/Documents/It%20Is%20Finished/apps/web/src/lib/expose.ts) — delete file or gate behind `import.meta.env.DEV` |
| **Prerequisites** | None |
| **Risks** | None — debug access via browser DevTools extensions still works for developers. |
| **Acceptance criteria** | `window.__DEBUG_POWERSYNC` is `undefined` in production build. |

---

### 1.3 — Create `delete_user` RPC (or Remove the Button)

| Field | Detail |
|-------|--------|
| **Priority** | P0 — CRITICAL |
| **Impact** | Account deletion is currently broken — the RPC doesn't exist. If a user types DELETE and clicks, they get a cryptic error. Worse: an improperly defined RPC could allow horizontal privilege escalation. |
| **Complexity** | Medium (~1 hour) |
| **Affected files** | New migration: `supabase/migrations/YYYYMMDD_delete_user_rpc.sql`, [SettingsModal.tsx](file:///c:/Users/admin/Documents/It%20Is%20Finished/apps/web/src/components/SettingsModal.tsx) |
| **Prerequisites** | Decide on cascade behavior (delete all workspaces? transfer ownership? soft-delete?) |
| **Risks** | Must be `SECURITY DEFINER` but scoped to `auth.uid()` only — MUST NOT accept a user ID parameter. Must cascade through workspace cleanup trigger. |
| **Acceptance criteria** | User can delete their own account. All their personal workspaces, tasks, and data are removed. They are redirected to landing page. Another user's data is unaffected. |

---

### 1.4 — Add `.env.example` Files

| Field | Detail |
|-------|--------|
| **Priority** | P1 — HIGH |
| **Impact** | New developers (or AI assistants) cannot set up the project without reverse-engineering env vars from source code. |
| **Complexity** | Trivial (~15 min) |
| **Affected files** | New: `apps/web/.env.example`, `apps/mobile/.env.example` (if needed) |
| **Prerequisites** | None |
| **Risks** | None |
| **Acceptance criteria** | `.env.example` lists all required vars with placeholder values and comments. README or `AI_HANDOFF.md` references it. |

---

### 1.5 — Fix Sync Rules Soft-Delete Leak

| Field | Detail |
|-------|--------|
| **Priority** | P1 — HIGH |
| **Impact** | `habit_logs` and `task_tags` rows that should be deleted may persist on client devices. Also `time_blocks` and `focus_sessions` lack `deleted_at` filtering. |
| **Complexity** | Low (~30 min) |
| **Affected files** | [sync_rules.yaml](file:///c:/Users/admin/Documents/It%20Is%20Finished/powersync/sync_rules.yaml) |
| **Prerequisites** | Verify whether these tables use soft delete or hard delete |
| **Risks** | If tables use hard delete, filtering `deleted_at IS NULL` would break (column doesn't exist). Check schema first. |
| **Acceptance criteria** | All sync queries consistently handle deletion. Deleted records do not appear on client. |

---

## 🟠 Tier 2: High-Value Next Improvements

These dramatically improve reliability, developer velocity, and user experience.

---

### 2.1 — Break Up Workspace.tsx God Component

| Field | Detail |
|-------|--------|
| **Priority** | P1 — HIGH |
| **Impact** | Unblocks independent feature development; enables testing; eliminates merge conflicts. |
| **Complexity** | High (~1-2 days). Requires extracting into ~6-8 focused components/hooks. |
| **Affected files** | [Workspace.tsx](file:///c:/Users/admin/Documents/It%20Is%20Finished/apps/web/src/pages/Workspace.tsx) → new files: `hooks/useTasks.ts`, `hooks/useProjects.ts`, `components/Sidebar.tsx`, `components/QuickAddBar.tsx`, `components/TaskListView.tsx`, etc. |
| **Prerequisites** | None, but test infrastructure (2.3) would de-risk this refactor |
| **Risks** | Regression risk is high without tests. Recommend feature-flag approach or parallel implementation. |
| **Acceptance criteria** | No file exceeds 400 lines. Each extracted module has a single responsibility. All existing functionality preserved. |

---

### 2.2 — Add ESLint + Pre-Commit Hooks

| Field | Detail |
|-------|--------|
| **Priority** | P1 — HIGH |
| **Impact** | Catches bugs, enforces consistency, prevents quality decay as team scales. |
| **Complexity** | Medium (~2-3 hours) |
| **Affected files** | New: `eslint.config.js` (flat config), `.husky/pre-commit`, root `package.json` (add husky + lint-staged) |
| **Prerequisites** | None |
| **Risks** | Initial lint run will surface 100+ warnings. Recommend `--fix` for auto-fixable issues and suppressing the rest with a baseline. |
| **Acceptance criteria** | `npm run lint` executes ESLint across all packages. Pre-commit hook blocks commits with errors. Zero lint errors in CI (warnings allowed initially). |

---

### 2.3 — Bootstrap Test Infrastructure

| Field | Detail |
|-------|--------|
| **Priority** | P1 — HIGH |
| **Impact** | Enables confident refactoring; blocks CI/CD (2.4). |
| **Complexity** | Medium (~3-4 hours for infrastructure + 10 seed tests) |
| **Affected files** | New: `vitest.config.ts` (root + per-package), `packages/core/src/__tests__/`, `apps/web/src/__tests__/` |
| **Prerequisites** | None |
| **Risks** | PowerSync WASM may need mocking for web tests. SQLite in-memory for core unit tests. |
| **Acceptance criteria** | `npm run test` runs vitest. At least: 5 unit tests for `@app/core` mutations, 3 for NLP parser, 2 for filter compiler. All pass. |

---

### 2.4 — Add CI/CD Pipeline (GitHub Actions)

| Field | Detail |
|-------|--------|
| **Priority** | P2 — MEDIUM |
| **Impact** | Automated quality gates; catches regressions before merge. |
| **Complexity** | Medium (~2 hours) |
| **Affected files** | New: `.github/workflows/ci.yml` |
| **Prerequisites** | ESLint (2.2) and test infrastructure (2.3) |
| **Risks** | Supabase integration tests need env vars in CI secrets. Start with lint + typecheck + unit tests only. |
| **Acceptance criteria** | Every PR runs: `typecheck`, `lint`, `test`, `build`. Status checks required for merge. |

---

### 2.5 — Add React Error Boundaries

| Field | Detail |
|-------|--------|
| **Priority** | P2 — MEDIUM |
| **Impact** | Prevents white-screen-of-death; gives users recovery path. |
| **Complexity** | Low (~1-2 hours) |
| **Affected files** | New: `apps/web/src/components/ErrorBoundary.tsx`, `apps/mobile/src/components/ErrorBoundary.tsx`. Modify: `App.tsx`, `_layout.tsx`. |
| **Prerequisites** | None |
| **Risks** | None |
| **Acceptance criteria** | A rendering error in any component shows a "Something went wrong" fallback with a "Reload" button instead of a blank screen. |

---

### 2.6 — User Onboarding Flow

| Field | Detail |
|-------|--------|
| **Priority** | P2 — MEDIUM |
| **Impact** | Reduces churn on first visit. Empty workspace is intimidating. |
| **Complexity** | Medium (~4-6 hours) |
| **Affected files** | New: `apps/web/src/components/OnboardingWizard.tsx`, modify `Workspace.tsx` |
| **Prerequisites** | None |
| **Risks** | Must not block existing users. Gate on profile `created_at` or a `has_onboarded` flag. |
| **Acceptance criteria** | New users see a 3-step wizard: (1) "Welcome, here's how it works", (2) Create first project, (3) Add first task with NLP demo. Skippable. |

---

## 🔵 Tier 3: Later Features

### 3.1 — Full-Text Search
- **Priority**: P2 | **Impact**: High for power users | **Complexity**: Medium
- Implement FTS5 virtual table in local SQLite for instant offline search across task titles and descriptions.
- **Files**: `packages/core/src/search.ts`, sync_rules, components.

### 3.2 — Push Notifications / Reminders
- **Priority**: P2 | **Impact**: High | **Complexity**: High
- Mobile: `expo-notifications` for due-date reminders. Web: Service Worker + Web Push API.
- **Files**: New mobile service, new web service worker, task scheduling logic.

### 3.3 — Undo/Redo System
- **Priority**: P3 | **Impact**: Medium | **Complexity**: Medium
- Toast-based undo for destructive actions (delete, complete). Uses a 5-second soft-delete window.
- **Files**: New `hooks/useUndoStack.ts`, toast component, modify mutation calls.

### 3.4 — Data Export (CSV/JSON)
- **Priority**: P3 | **Impact**: Medium (trust building) | **Complexity**: Low
- Export all tasks/projects for a workspace as CSV or JSON.
- **Files**: `packages/core/src/export.ts`, settings page button.

### 3.5 — Light Mode / Theme System
- **Priority**: P3 | **Impact**: Medium (accessibility) | **Complexity**: Medium
- **Files**: `index.css`, `app.json`, all hardcoded color values.

### 3.6 — Invite Acceptance Route
- **Priority**: P2 | **Impact**: High (broken flow) | **Complexity**: Low
- Add `/invite?token=...` route in web app to complete the invite flow.
- **Files**: `apps/web/src/App.tsx`, new `pages/InviteAccept.tsx`.

---

## 🟢 Tier 4: Nice-to-Have Experiments

### 4.1 — AI Task Decomposition
- Use an LLM API to auto-decompose a high-level task into subtasks.
- **Complexity**: Medium | **Risk**: API cost, latency, prompt engineering.

### 4.2 — Shared Component Library (Tamagui / NativeWind)
- Eliminate web/mobile component duplication with a universal UI layer.
- **Complexity**: Very High | **Risk**: Major migration; Tamagui ecosystem maturity.

### 4.3 — Offline Voice Quick-Add
- Use `expo-speech` or Web Speech API for voice-to-NLP-to-task.
- **Complexity**: Medium | **Risk**: Accuracy; platform differences.

### 4.4 — Heatmap Calendar (GitHub-Style Contribution Graph)
- Visualize daily productivity over months for motivation.
- **Complexity**: Low | **Risk**: None.

### 4.5 — Apple Watch / Widget Companion
- Glanceable today-view widget showing top 3 tasks.
- **Complexity**: High | **Risk**: Native development required.

---

## 📋 Proposed Implementation Tickets

> 5 small, independently reviewable PRs. Select one and I'll implement it.

---

### Ticket A: "Security Hardening Sprint" (Tier 1: items 1.1 + 1.2)
**Scope**: Write a single migration dropping debug RPCs and `debug_logs` table. Delete or dev-gate `expose.ts`. Clean up root debug scripts into `scripts/debug/` (or delete). Remove `null` file.
- **Est. time**: ~45 minutes
- **Risk**: Zero — purely subtractive
- **Files touched**: 1 new migration, delete/modify `expose.ts`, delete root scripts, delete `null`

---

### Ticket B: "Environment & Developer Experience Setup" (Tier 1: item 1.4 + Tier 2: item 2.2)
**Scope**: Create `.env.example` for web (and mobile if applicable). Add ESLint flat config with TypeScript + React rules. Add `lint` scripts to each package. Add husky + lint-staged pre-commit.
- **Est. time**: ~2-3 hours
- **Risk**: Low — initial lint run may surface many warnings (suppress with baseline)
- **Files touched**: New `.env.example`, new `eslint.config.js`, modified `package.json` files

---

### Ticket C: "Bootstrap Vitest + Core Unit Tests" (Tier 2: item 2.3)
**Scope**: Install vitest. Write 10 seed tests for `@app/core`: 5 for mutations (createTask, toggleTask, deleteTask), 3 for NLP parser, 2 for filter compiler.
- **Est. time**: ~3 hours
- **Risk**: Low — pure additions, no existing code modified
- **Files touched**: New `vitest.config.ts`, new `packages/core/src/__tests__/*.test.ts`

---

### Ticket D: "Create `delete_user` RPC + Fix Account Deletion" (Tier 1: item 1.3)
**Scope**: Write a SECURITY DEFINER Postgres function that deletes only the calling user (`auth.uid()`), cascades through workspace cleanup, and signs out. Verify `SettingsModal.tsx` and `SettingsPage.tsx` both work.
- **Est. time**: ~1.5 hours
- **Risk**: Medium — must ensure no horizontal escalation; requires testing against real Supabase
- **Files touched**: 1 new migration, possibly minor fix to `SettingsModal.tsx` error handling

---

### Ticket E: "Error Boundaries + Offline Indicator" (Tier 2: item 2.5 + mobile UX)
**Scope**: Create `ErrorBoundary` component for both web and mobile. Wrap app roots. Add offline status banner to mobile using PowerSync `dataFlowStatus`.
- **Est. time**: ~2 hours
- **Risk**: Zero — purely additive
- **Files touched**: New `ErrorBoundary.tsx` (web + mobile), modify `App.tsx`, modify `_layout.tsx`, modify `WorkspaceContext.tsx`
