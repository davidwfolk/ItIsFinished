# iOS Physical Device Build & Deployment Guide (Mac Mini)

> **To the AI Assistant or Developer on the Mac Mini:**
> This repository uses **PowerSync** (`@powersync/react-native`) and **OP-SQLite** (`@op-engineering/op-sqlite`) which are custom native C++ modules.
> **Standard Expo Go CANNOT run this app.** You are using this Mac Mini to compile and install the **Expo Development Client** directly onto the user's physical iPhone.
> Once installed, the user can unplug the iPhone and return to developing on their Windows PC over local Wi-Fi!

---

## 📋 Prerequisites Checklist on Mac Mini

1. **Mac Mini**: macOS with **Xcode** (15+ or 16+) installed from the Mac App Store.
2. **Xcode Command Line Tools**:
   ```bash
   xcode-select --install
   ```
3. **CocoaPods**:
   ```bash
   brew install cocoapods
   # Or: sudo gem install cocoapods
   ```
4. **Node.js**: v20+ or v22 LTS (`node -v`).
5. **Physical iPhone**:
   * Plugged into the Mac Mini via USB cable.
   * Unlocked, and tapped **"Trust This Computer"** on the iPhone screen.
   * **Developer Mode enabled** on iOS (iOS 16, 17, 18):
     * Go to iPhone **Settings -> Privacy & Security -> Developer Mode**.
     * Toggle **Developer Mode to ON** and reboot the iPhone when prompted.

---

## 🚀 Step-by-Step Installation Instructions

### Step 1: Pull the Latest Monorepo Code
```bash
# In your local repository root on Mac Mini:
git pull origin main

# Install all monorepo dependencies:
npm install
```

---

### Step 2: Build the Core Package & Typecheck
```bash
npm run typecheck --workspace=@app/core
npm run typecheck --workspace=@app/mobile
```

---

### Step 3: Install Directly to Physical iPhone

You have **two reliable methods**. If Method A encounters Apple ID signing prompts, use **Method B (Xcode GUI)** which is 100% foolproof.

---

#### 🌟 Method A: Automated Expo CLI Build (Terminal)
```bash
cd apps/mobile

# Run the iOS build targeting the physical device:
npx expo run:ios --device
```
1. When prompted, use arrow keys to select the user's connected physical iPhone.
2. If prompted for an Apple Team, sign in with the user's free personal Apple ID.
3. Expo will compile native pods and install the **Finished** app directly to the iPhone.

---

#### 🛠️ Method B: Xcode GUI Build (Foolproof & Recommended if Signing Fails)

If the terminal complains about signing certificates, provisioning profiles, or bundle IDs:

1. **Generate the native Xcode project:**
   ```bash
   cd apps/mobile
   npx expo prebuild --platform ios --clean
   cd ios && pod install && cd ../../..
   ```

2. **Open the project in Xcode:**
   ```bash
   open apps/mobile/ios/Finished.xcworkspace
   ```

3. **Configure Automatic Signing in Xcode:**
   * In the left sidebar of Xcode, click the top **Finished** blue project icon.
   * Select the **Finished** Target under "TARGETS".
   * Click the **"Signing & Capabilities"** tab at the top.
   * Check **"Automatically manage signing"**.
   * Under **Team**, select the user's **Personal Apple ID Team** (or click *Add an Account...* to log in).
   * *Note on Bundle Identifier:* If `com.finished.app` is already claimed by someone else, change it to e.g. `com.finished.app.user` or any unique identifier.

4. **Run onto iPhone:**
   * In the top toolbar of Xcode (next to the Play ▶️ button), click the target device dropdown and select the **connected physical iPhone** (e.g. `Alex's iPhone`).
   * Click the **Play ▶️ button** (or press `Cmd + R`).
   * Xcode will compile the native app and install it onto the iPhone.

---

## 📱 Step 4: First-Time Launch on iPhone ("Untrusted Developer" Fix)

When the app finishes installing, tapping the app icon on iOS may show an alert:
> *"Untrusted Developer: Your device management settings do not allow using an app from developer..."*

**How to Trust the Developer Certificate on iPhone:**
1. Open iPhone **Settings -> General -> VPN & Device Management**.
2. Under **Developer App**, tap your Apple ID email.
3. Tap **"Trust [Your Name / Apple ID]"** and confirm.
4. Open the **Finished** app on your home screen.

---

## 💻 Step 5: Returning to Windows PC (Zero-Cable Wi-Fi Development)

**The user is now done with the Mac Mini!**

1. Unplug the iPhone from the Mac Mini.
2. Return to the Windows PC.
3. On Windows PC, run:
   ```bash
   npm run start --workspace=@app/mobile
   # Or: npx expo start --dev-client
   ```
4. Ensure the iPhone and Windows PC are connected to the same Wi-Fi network.
5. Open the **Finished** app on the iPhone -> It will automatically detect the Windows Metro bundler, or you can scan the QR code in the terminal!

---

## 🔧 Troubleshooting Guide for the AI Assistant

### Issue 1: `TurboModuleRegistry.getEnforcing(...): 'PlatformConstants' could not be found`
* **Cause:** The user opened the standard "Expo Go" app by mistake.
* **Fix:** Expo Go cannot run custom native C++ libraries (PowerSync / OP-SQLite). Open the custom **"Finished"** app icon that was compiled and installed by Xcode/Expo.

### Issue 2: CocoaPods install error on Apple Silicon (M1/M2/M3/M4)
* **Fix:**
  ```bash
  cd apps/mobile/ios
  sudo gem install ffi
  pod install --repo-update
  cd ../../..
  ```

### Issue 3: Stale Xcode DerivedData / Cache Errors
* **Fix:**
  ```bash
  rm -rf ~/Library/Developer/Xcode/DerivedData
  cd apps/mobile
  rm -rf ios/
  npx expo prebuild --platform ios --clean
  cd ios && pod install && cd ../../..
  ```

### Issue 4: Metro bundler cannot connect over Wi-Fi
* **Fix:**
  On the Windows PC, start Metro with tunnel mode:
  ```bash
  npx expo start --dev-client --tunnel
  ```
