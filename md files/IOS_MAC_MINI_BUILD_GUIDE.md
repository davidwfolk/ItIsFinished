# iOS Build Guide — Mac Mini → iPhone (Updated 2026-09-01)

> **3 bootability fixes have been committed to `main`.** Pull before building.
>
> You have **two build modes**:
> - **Dev Client (Debug):** Build once, then hot-reload code changes instantly over Wi-Fi. Best for iterating.
> - **Standalone (Release):** App works forever on the phone, no computer needed. Rebuild for each change.

---

## Prerequisites on Mac Mini

1. **Xcode** installed (with iOS Simulator support)
2. **Xcode Command Line Tools**: `xcode-select --install`
3. **CocoaPods**: `brew install cocoapods`
4. **Node.js**: v20+ (`node -v`)
5. **Physical iPhone**:
   - Plugged into Mac Mini via USB
   - Unlocked & tapped **"Trust This Computer"**
   - **Developer Mode ON** (Settings → Privacy & Security → Developer Mode → ON → restart)

---

## Build Steps (Both Modes)

```bash
# 1. Clone and install
git clone https://github.com/davidwfolk/ItIsFinished.git
cd ItIsFinished
npm install

# 2. Build the shared @app/core package first
npm run build

# 3. Generate native iOS project
cd apps/mobile
npx expo prebuild --platform ios --clean

# 4. Install CocoaPods
cd ios && pod install && cd ..

# 5. Open in Xcode
open ios/Finished.xcworkspace
```

---

## In Xcode

1. Click the **Finished** project in the left sidebar
2. Under **TARGETS**, select **Finished**
3. **Signing & Capabilities** → check **"Automatically manage signing"** → select your **Personal Apple ID Team**
4. Select your **connected physical iPhone** in the device dropdown at the top

### For Dev Client (hot-reload while iterating):
5. **Product → Scheme → Edit Scheme → Run → Build Configuration → Debug**
6. Click **Play ▶️ (Cmd + R)** — builds and installs on phone (~5 min first time)
7. Back in Terminal, start Metro:
   ```bash
   cd apps/mobile
   npx expo start --dev-client
   ```
8. On the phone, the Expo Dev Launcher will appear — tap your Mac Mini's URL or scan the QR code
9. **Code changes now hot-reload instantly** — no rebuild needed

### For Standalone (permanent, no computer needed):
5. **Product → Scheme → Edit Scheme → Run → Build Configuration → Release**
6. Click **Play ▶️ (Cmd + R)** — builds and installs on phone (~5 min)
7. Done. App runs independently.

---

## Switching Between Modes

Same Xcode project, same code. Just change the Build Configuration dropdown:
- **Debug** = Dev Client (needs Metro running)
- **Release** = Standalone (no dependencies)

Then rebuild (Cmd + R). That's it.

---

## First-Time Launch: "Untrusted Developer" Fix

If iOS blocks launching with *"Untrusted Developer"*:
1. Go to iPhone **Settings → General → VPN & Device Management**
2. Tap your Apple ID under **Developer App**
3. Tap **"Trust [Your Apple ID]"** and confirm

---

## What You'll See

The app will boot to a **login screen**. You can:
- **Sign in** with your Supabase credentials (if you have an account)
- **Tap "Skip for now"** to go straight to the 5-tab UI with mock data

The 5 tabs (Today, Calendar, Habits, Matrix, Focus) all work with in-memory mock data. We'll wire them to real PowerSync/Supabase data as the next step.
