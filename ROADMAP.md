# It Is Finished - Macro Roadmap

This document serves as the permanent, living roadmap for the **It Is Finished** productivity suite (Web + Mobile). 

---

## ✅ Stage 1: Mobile-First Offline Foundation
- [x] Bootstrapped React Native / Expo mobile app.
- [x] Local SQLite database implementation for 0ms latency and pure offline functionality.
- [x] Core Task Management UI (Eisenhower Matrix, Subtasks, Time-blocking).

## ✅ Stage 2: Cloud Sync Engine & Authentication
- [x] Supabase Postgres cloud infrastructure setup.
- [x] Supabase Authentication integrated.
- [x] PowerSync layer configured for real-time online/offline database syncing.
- [x] Database Schema stabilized (Projects, Tasks, Sections).

## 🚧 Stage 3: Web App SaaS Architecture (Current Phase)
- [x] React Router separation (Public Landing Page vs `/app` Workspace).
- [x] Strict Auth Wall (No orphan guest data).
- [x] Dedicated Settings Route & Database-Wiping on Account Deletion.
- [ ] **Smart Filters UI:** Build the interface to Edit, Delete, and Manage custom smart filters in the sidebar.
- [ ] **Settings Engine Expansion:** Add preferences for Time Zones, Default Views (e.g., loading into Kanban vs List), and "Start of Week" (Sunday vs Monday).
- [ ] **Analytics Deep-Dive:** Upgrade the Productivity Stats view into a comprehensive tabbed system to explore historical task data.
- [ ] **Kanban vs. Tasks Architecture:** Standardize drag-and-drop logic between the board and list views.

## 🔜 Stage 4: Monetization & Entitlements (The 4-Tier Workspace Model)
- [ ] **Tier Structure & Workspace Allocation Architecture:**
  * **Free:** 1 shared workspace, basic task & project features.
  * **Pro:** Up to 3 workspaces, advanced productivity features (filters, custom tags, deep analytics).
  * **Business:** Up to 15 workspaces, centralized team management, seat controls, and advanced features.
  * **Enterprise:** Custom workspace allocation, tailored enterprise setup, dedicated governance, and advanced features.
- [ ] **Dynamic Free vs. Pro UI & Feature Gating:**
  - Replace the hardcoded static `PRO` badge in the customer web app sidebar (`Workspace.tsx:679`) with the dynamic `profiles.entitlement_tier` synced from Supabase/PowerSync.
  - Enforce workspace creation limits server-side (Free: 1, Pro: 3, Business: 15).
  - Implement dynamic upgrade triggers and paywall modals when a user attempts to create more workspaces than their plan allows.
- [ ] **RevenueCat Integration:** Setup RevenueCat SDK for handling cross-platform subscriptions (iOS, Android, and Web).
- [ ] **Billing Synchronization:** Connect webhook handlers to update `profiles.entitlement_tier` and `entitlement_source` based on live subscription events, respecting admin override precedence.
- [ ] **Paywalls & Checkout:** Build the customer-facing upgrade and subscription checkout UI for free users.

## 🔜 Stage 5: Integrations (Google Calendar)
- [ ] **Google Calendar Sync:** Implement OAuth flow for Google accounts.
- [ ] **Two-Way Sync:** Automatically push time-blocked tasks to Google Calendar events, and pull calendar events into the daily time-grid.

## 🚀 Stage 6: Mobile App Store Deployment
- [ ] **TestFlight:** Push the React Native iOS app to TestFlight for initial beta testing.
- [ ] **App Store Submission:** Prepare screenshots, metadata, and submit to the Apple App Store.
- [ ] *(Optional)* **Google Play:** Android deployment workflow.

## 🤝 Stage 7: Collaboration & Workspaces (Enterprise Architecture)
- [ ] **Architecture (Strict Separation):** Implement "Invisible Workspaces" via PowerSync Tiered Data Hydration (sync all metadata globally, but only deep data for the active workspace).
- [ ] **Asymmetric RLS:** Implement JWT custom claims for fast `SELECT` queries, and strict `EXISTS` database checks for `INSERT/UPDATE/DELETE` to ensure immediate revocation.
- [ ] **Upload Queue Resilience:** Implement client-side cascading skips (DAG) in PowerSync to isolate validation errors without crashing the entire offline queue.
- [ ] **Monetization Limit:** Determine the limit on how many "workspaces" a user can own or join on the Free version.
- [ ] **Workspace Sharing:** UI for inviting users to a specific workspace via email.

## 🔒 Stage 8: Enterprise Security & SOC2 Compliance Readiness
- [ ] **Cryptographic TTLs (SQLCipher):** Encrypt the local SQLite database at rest using SQLCipher. Implement policy-driven TTLs (e.g., 7 days) that drop the decryption key from memory if the device hasn't pinged the server.
- [ ] **15-Minute JWT Expiry:** Lower Supabase JWT expiration to 15 minutes (with silent background refreshes) to drastically shrink the read-exfiltration window upon termination.
- [ ] **Database Audit Logging:** Implement a Postgres-level audit trail (e.g., `pgaudit` or custom triggers) to track `who` changed `what` and `when` for strict SOC2 compliance.
