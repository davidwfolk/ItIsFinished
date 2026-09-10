# iOS Physical Device Build & Deployment Guide (Mac Mini)

> **To the AI Assistant or Developer on the Mac Mini:**
> **Root Cause of "No script URL provided":** 
> Previously, `expo-dev-client` was missing from `app.json` plugins. This has now been fixed in `main`.
> 
> You have **Two Options** to install onto the user's physical iPhone:
> - **Option 1 (Recommended - Standalone Offline App):** Embeds the JS bundle directly inside the app. The phone will run **100% standalone** with offline SQLite without needing a computer running Metro.
> - **Option 2 (Dev Client with Live Reload):** Builds with Expo Dev Launcher so the user can enter their PC's IP or connect via Wi-Fi for live hot-reloading.

---

## 📋 Prerequisites Checklist on Mac Mini

1. **Mac Mini**: macOS with **Xcode** installed.
2. **Xcode Command Line Tools**: `xcode-select --install`
3. **CocoaPods**: `brew install cocoapods`
4. **Node.js**: v20+ or v22 LTS (`node -v`)
5. **Physical iPhone**:
   * Plugged into Mac Mini via USB.
   * Unlocked & tapped **"Trust This Computer"**.
   * **Developer Mode ON** (iPhone *Settings -> Privacy & Security -> Developer Mode -> ON* -> restart).

---

## 🚀 Option 1: Build Standalone Offline App (No Packager/Server Needed!)

This compiles the JavaScript bundle directly into the app binary so it runs on the iPhone immediately without any "no script URL" errors.

```bash
# 1. Pull the latest code:
git pull origin main
npm install

# 2. Clean prebuild iOS project with native plugins:
cd apps/mobile
npx expo prebuild --platform ios --clean
cd ios && pod install && cd ../../..

# 3. Open in Xcode:
open apps/mobile/ios/Finished.xcworkspace
```

### In Xcode:
1. Click the top blue **Finished** project icon in the left sidebar.
2. Under **TARGETS**, select **Finished**.
3. In **Signing & Capabilities**, check **"Automatically manage signing"** and select the user's **Personal Apple ID Team**.
4. In the top menu bar of Xcode: Click **Product -> Scheme -> Edit Scheme...**
   * Select **Run** on the left.
   * Change **Build Configuration** from *Debug* to **Release**!
   * Click **Close**.
5. Select the **connected physical iPhone** in the device dropdown at the top.
6. Click **Play ▶️ (Cmd + R)**.

> 🎉 **Result:** The app compiles, installs, and boots immediately on the iPhone with full offline PowerSync SQLite database and dark mode UI. No server or packager needed!

---

## 🛠️ Option 2: Build with Expo Dev Client (For Live Wi-Fi Hot Reloading)

If you want live hot-reloading from the Windows PC:

```bash
cd apps/mobile
npx expo prebuild --platform ios --clean
cd ios && pod install && cd ../../..
open apps/mobile/ios/Finished.xcworkspace
```

1. In Xcode, ensure **Automatically manage signing** is checked with the Apple ID Team.
2. Keep Build Configuration as **Debug**.
3. Select the physical iPhone and click **Play ▶️ (Cmd + R)**.
4. **On the iPhone:** The app will now open the **Expo Dev Launcher Screen** with buttons to enter your PC's IP (`192.168.1.132:8081`) or scan QR code.

---

## 📱 First-Time Launch: "Untrusted Developer" Fix

If iOS blocks launching with *"Untrusted Developer"*:
1. Go to iPhone **Settings -> General -> VPN & Device Management**.
2. Tap your Apple ID under **Developer App**.
3. Tap **"Trust [Your Apple ID]"** and confirm.
