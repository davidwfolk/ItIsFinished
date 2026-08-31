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

## 🚧 Phase 2: Manual Environment Setup (CRITICAL BLOCKERS)

These tasks must be executed manually before the code written in Phase 1 becomes operational.
- [ ] **App Dependencies:** Run `npm install expo-secure-store` in the `apps/mobile` directory.
- [ ] **Supabase Dashboard (JWT):** Go to Auth Settings and explicitly change JWT Expiration to 15 minutes (900 seconds) to close the SOC2 exfiltration window.
- [ ] **Supabase Dashboard (Webhook):** Create a Database Webhook on the `workspace_invites` table (trigger on `INSERT`) pointing to the `send-invite` Edge Function.
- [ ] **Edge Function Secrets:** Set `RESEND_API_KEY` (and `SUPABASE_SERVICE_ROLE_KEY` if necessary) in the Supabase project secrets.
- [ ] **Apply Migrations:** Run `supabase db push` to push the 3 new SQL migration files to the remote database.

---

## 🔜 Phase 3: Immediate Next Steps (Pending Work)

### 1. Workspace User Interface (React Native)
- [ ] **Workspace Switcher:** Build the sidebar/header UI component allowing users to toggle between Workspaces (triggering `WorkspaceContext`).
- [ ] **Invitation Screen:** Build the UI form for owners/admins to type an email and invoke the Secure Invitation RPC.
- [ ] **Lock/Fallback Screens:** Build the visual states for when a user triggers the 7-Day TTL lock, or attempts to access heavy data in a non-synced workspace offline.

### 2. Monetization (RevenueCat)
- [ ] **SDK Integration:** Wire up RevenueCat for cross-platform subscriptions.
- [ ] **Paywalls & Limits:** Enforce business logic limits (e.g., Free users are hard-capped at 1 Workspace; Pro unlocks unlimited).

### 3. Final SOC2 Compliance
- [ ] **Database Audit Logging:** Implement `pgaudit` extension or custom trigger tracking for a strict paper trail of `who` changed `what` data and `when`.

### 4. Integrations
- [ ] **Google Calendar OAuth:** Enable users to link external calendars.
- [ ] **Two-Way Event Sync:** Push time-blocked tasks to Google, pull Google events into the daily time-grid.

### 5. App Store Deployment
- [ ] **Beta Testing:** Push iOS build to TestFlight.
- [ ] **Launch:** Prepare metadata, screenshots, and submit to the Apple App Store.
