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

## 🔜 Stage 4: Monetization (RevenueCat)
- [ ] **RevenueCat Integration:** Setup RevenueCat SDK for handling cross-platform subscriptions.
- [ ] **Paywalls:** Build the upgrade UI for free users.
- [ ] **Pro-Tier Feature Locking:** Lock specific advanced features (e.g., unlimited projects, advanced analytics) behind the subscription state.

## 🔜 Stage 5: Integrations (Google Calendar)
- [ ] **Google Calendar Sync:** Implement OAuth flow for Google accounts.
- [ ] **Two-Way Sync:** Automatically push time-blocked tasks to Google Calendar events, and pull calendar events into the daily time-grid.

## 🚀 Stage 6: Mobile App Store Deployment
- [ ] **TestFlight:** Push the React Native iOS app to TestFlight for initial beta testing.
- [ ] **App Store Submission:** Prepare screenshots, metadata, and submit to the Apple App Store.
- [ ] *(Optional)* **Google Play:** Android deployment workflow.

## 🤝 Stage 7: Collaboration & Workspaces
- [ ] **Architecture (Option 3 - Strict Separation):** Implement "Invisible Workspaces" where users strictly switch contexts between Personal and Work (no unified multi-email view initially). 
- [ ] **Monetization Limit:** Determine the limit on how many "workspaces" a user can own or join on the Free version.
- [ ] **Workspace Sharing:** UI for inviting users to a specific workspace via email.
