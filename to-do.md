# Project To-Do & Architecture Review

This document serves as an in-depth review tracker of the underlying architecture implemented for **It Is Finished**, capturing the exact technical decisions executed and mapping out the remaining steps for launch.

---

## ✅ Phase 1: Completed Architectural Foundations

### 1. Database & Security (Asymmetric RLS)
- [x] **JWT Custom Claims Sync (`20260831000000_jwt_claims.sql`):** Created a Postgres trigger to automatically inject active `workspace_ids` into a user's JWT (`raw_app_meta_data`) for high-speed edge caching.
- [x] **Asymmetric RLS (`20260831000001_asymmetric_rls.sql`):** Replaced standard RLS with an asymmetric model. `SELECT` queries use lightning-fast JWT claims, while `INSERT/UPDATE/DELETE` mutations run a strict `EXISTS` database check via a composite index for immediate revocation.

### 2. Workspace Provisioning (The Outbox Pattern)
- [x] **Secure Invites Schema (`20260831000002_workspace_invites.sql`):** Designed the `workspace_invites` table with an `email_status` state machine.
- [x] **SECURITY DEFINER RPC:** Created a Postgres RPC allowing admins to securely bypass RLS to insert pending invitations without exposing the table.
- [x] **Signup Interception Trigger:** Created a trigger on `auth.users` to catch new signups, read the pending invites, and automatically hydrate `workspace_members`.
- [x] **Edge Function Orchestrator (`send-invite/index.ts`):** Built the async Deno function to catch database webhooks, fire external emails (Resend), and execute the state-machine callback to update `email_status` to `sent`.

### 3. PowerSync Offline Engine
- [x] **Tiered Data Hydration (`sync_rules.yaml`):** Split the offline sync engine into two buckets: Bucket 1 globally syncs lightweight workspace metadata (for offline switching), while Bucket 2 explicitly parameterizes heavy data (tasks, comments) by the active workspace to prevent mobile bloat.

### 4. React Native Client Architecture
- [x] **Global Workspace State (`WorkspaceContext.tsx`):** Implemented React Context to track the `activeWorkspaceId`, dynamically update the Supabase JWT, and parameter-swap the PowerSync stream.
- [x] **Upload Queue Cascading Skips (`SupabaseConnector.ts`):** Rewrote the PowerSync upload queue error handler using a Directed Acyclic Graph (DAG) approach. A failed validation on a parent record gracefully skips dependent children rather than crashing the entire offline queue.
- [x] **Cryptographic TTLs (`sqlcipher.ts`):** Integrated SQLCipher logic using `expo-secure-store` to lock the local database. If the device goes 7 days without pinging the server, the decryption key drops from memory (Enterprise MDM compliance).

---

## ✅ Phase 2: Manual Environment Setup (CRITICAL BLOCKERS)

These tasks have been executed manually or via CLI, ensuring the environment is operational.
- [x] **App Dependencies:** Run `npm install expo-secure-store` in the `apps/mobile` directory.
- [x] **Supabase Dashboard (JWT):** Go to Auth Settings and explicitly change JWT Expiration to 15 minutes (900 seconds) to close the SOC2 exfiltration window.
- [x] **Supabase Dashboard (Webhook):** Create a Database Webhook on the `workspace_invites` table (trigger on `INSERT`) pointing to the `send-invite` Edge Function.
- [x] **Edge Function Secrets:** Set `RESEND_API_KEY` (and `SUPABASE_SERVICE_ROLE_KEY` if necessary) in the Supabase project secrets.
- [x] **Apply Migrations:** Run `supabase db push` to push the 3 new SQL migration files to the remote database.

---

## 🚧 Phase 3: Mobile UI & Architecture Implementation Plan (The Final Blueprint v2)

This section outlines the definitive, end-to-end plan to lock down the multi-tenant offline-first architecture, wire the React Native mobile app to PowerSync, and navigate the React Native/Supabase code-level lifecycle traps.

### 1. Schema, Sync Rules & RLS Security (CRITICAL BLOCKERS)

#### [NEW] `supabase/migrations/20260831000003_workspace_isolation.sql`
- Add `workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE` to both `time_blocks` and `focus_sessions`.
- **The RLS Leak Fix:** Append the strict Asymmetric RLS policies to both tables (`SELECT` via JWT claims, mutations via `EXISTS` checks).
- **The Postgres DATE Cast:** Explicitly alter the date columns for `time_blocks` and `habit_logs` to use the Postgres `DATE` type (stripping all TIMESTAMPTZ time/timezone data) to perfectly preserve the local `"YYYY-MM-DD"` string.

#### [NEW] `supabase/migrations/20260831000004_auto_provisioning.sql`
- Create the `AFTER INSERT ON auth.users` Postgres trigger.
- **The Trigger Privilege Trap:** The Postgres function attached to this trigger MUST be defined as `SECURITY DEFINER`. This temporarily elevates the trigger's privileges to bypass RLS, allowing the database to execute the secure provisioning (inserting into `workspace_members`) before dropping privileges back down.

#### [MODIFY] `packages/core/src/schema.ts` & `powersync/sync_rules.yaml`
- Add `workspace_id` to the local schemas.
- Move both tables out of `user_personal` and parameterize them under the `workspace_deep_data` bucket.

### 2. Pre-Deployment Configuration (Manual Dashboard Steps)

#### [MANUAL] The 15-Minute Exfiltration Window
- Go to Supabase Auth Settings and explicitly lower the JWT Expiration from 3600 seconds to 900 seconds (15 minutes).
- *Why:* Shrinks the SOC2 data exfiltration window for terminated employees.

### 3. At-Rest Encryption & Cryptographic TTLs (Security)

#### [MODIFY] `apps/mobile/src/lib/sqlcipher.ts` & `powersync.ts`
- **At-Rest Encryption:** Wrap the PowerSync SQLite instance with SQLCipher.
- **Native Build Requirement (The Expo Go Trap):** SQLCipher relies on custom native C++ bindings that do not exist inside standard Expo Go. Developers MUST use an Expo Dev Client (`eas build --profile development`) or run via `npx expo run:ios` to prevent immediate crashes on boot.
- **Key Generation & Persistence:** Use `expo-crypto` to generate a secure random hex string, and explicitly persist it across app launches using `expo-secure-store`.
- **OS-Level Keystore Invalidation Recovery:** Wrap the Keystore retrieval in a strict `try/catch`. If the OS cryptographically invalidates the Secure Enclave (e.g., user removes device passcode), the app must gracefully fall back: wipe the corrupted SQLite file, generate a new key, force the user to re-authenticate, and re-sync from scratch.
- **The Heartbeat TTL:** Upon app launch, enforce the 7-day heartbeat TTL. If expired, destroy the key from `expo-secure-store` to cryptographically lock the database.

### 4. Provisioning & The Outbox Pattern

#### [MANUAL/CLI] Edge Function & Webhook Deployment
- Deploy the `send-invite` Edge Function via the Supabase CLI (`supabase functions deploy send-invite`).
- Configure a Supabase Database Webhook on the `workspace_invites` table triggering on `INSERT` to point to the deployed Edge Function.

### 5. Shared Core Architecture (`packages/core`)

#### [NEW] `packages/core/src/mutations.ts`
- Extract all SQLite mutation logic from the Web app into reusable pure functions.
- **Dependency Injection:** Every mutation MUST strictly accept the database instance and workspace context (`workspaceId`).
- **Client-Side UUID Generation & The Polyfill Trap:** All primary key UUIDs must be generated on the client using `crypto.randomUUID()` before SQLite insertion. To prevent React Native from crashing (`crypto` is undefined), the mobile app MUST install and import the `react-native-get-random-values` polyfill at the very top of its entry file (`index.js` or `App.tsx`).
- **Zod Validation at the Boundary:** Validate inputs before executing the SQLite insert.
- **The Logical Date Rule:** For `time_blocks` and `habit_logs`, strictly pass `"YYYY-MM-DD"` derived from the user's local timezone.

### 6. Mobile Upload Queue Resilience (Data Integrity)

#### [MODIFY] `apps/mobile/src/lib/SupabaseConnector.ts`
- **The Infinite Loop Fix:** Catch `400 Bad Request` and `403 Forbidden` HTTP errors. Flag the specific item as failed.
- **Cascading Skips (DAG Logic):** When a parent record fails, automatically flag and skip any dependent child records to prevent cascading Foreign Key crashes (500s/409s) on the server.
- **The "Un-Skip" Deadlock Recovery:** The error handler must listen for successful uploads of previously failed parents. Once a flagged parent clears the queue, automatically recursively clear the "failed" flags on all dependent children so they re-enter the active upload queue.

### 7. Mobile Context & Dependencies Setup

#### [NEW] Command Execution
- Run `npm install @powersync/react` in `apps/mobile`.

#### [MODIFY] `apps/mobile/app/_layout.tsx` & `WorkspaceContext.tsx`
- Wrap the app in `<PowerSyncContext.Provider>`.
- Expose granular sync status to Context via PowerSync's `dataFlowStatus`.
- **The Offline Routing & Cold Boot Trap (CRITICAL):** Rewrite the React Native Auth Context router to rely on the Refresh Token. Furthermore, explicitly handle `supabase-js` cold boot network failures in `onAuthStateChange`. The router must ONLY kick the user to the login screen if the server explicitly returns a 400 Invalid Refresh Token (token revoked) or if the 7-day heartbeat TTL expires. Ignore standard network timeouts so the offline state survives app restarts.

### 8. Mobile Tab Screens & Modal Wiring (✅ COMPLETED)

#### [MODIFY] `apps/mobile/app/(tabs)/*`
- [x] Replace all hardcoded arrays with `useQuery` filtered by `workspace_id` across all 5 tab screens (Today, Habits, Matrix, Focus, Calendar).
- [x] Wire all mutations to `@app/core` (create, toggle, update, delete tasks, projects, sections, habit logs, focus sessions).
- [x] Provide automatic workspace auto-resolution from local SQLite on initial cold boot.

#### [MODIFY] `apps/mobile/src/components/ProjectMembersModal.tsx`
- Wire `handleInviteMember` to execute the `SECURITY DEFINER RPC` (`invite_user_to_workspace`).

#### [MODIFY] `apps/mobile/src/components/TaskDetailModal.tsx` & `ProjectPickerModal.tsx`
- Connect UI actions directly to the `packages/core` mutations.
- **Expanded Offline Blob Garbage Collection:** Implement a cleanup hook on both `deleteTask` and `removeAttachment` to explicitly delete pending local file URIs in `expo-file-system`.
- **Happy Path Blob Cleanup:** Add a hook to the background Supabase Storage upload queue. Upon successful remote upload, immediately delete the cached `expo-file-system` URI to prevent storage bloat.

---

## 🔜 Phase 4: Monetization (RevenueCat)

### 1. SDK Integration
- [ ] Wire up RevenueCat for cross-platform subscriptions.

### 2. Paywalls & Limits
- [ ] Enforce business logic limits (e.g., Free users are hard-capped at 1 Workspace; Pro unlocks unlimited).

---

## 🔜 Phase 5: Final SOC2 Compliance

### 1. Database Audit Logging
- [ ] Implement `pgaudit` extension or custom trigger tracking for a strict paper trail of `who` changed `what` data and `when`.

---

## 🔜 Phase 6: Integrations

### 1. Google Calendar OAuth
- [ ] Enable users to link external calendars.

### 2. Two-Way Event Sync
- [ ] Push time-blocked tasks to Google, pull Google events into the daily time-grid.

---

## 🔜 Phase 7: App Store Deployment

### 1. Beta Testing
- [ ] Push iOS build to TestFlight.

### 2. Launch
- [ ] Prepare metadata, screenshots, and submit to the Apple App Store.
