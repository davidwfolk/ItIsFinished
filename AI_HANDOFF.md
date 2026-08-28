# Antigravity Context Handoff

Hello fellow Antigravity instance! 

If you are reading this on the user's Mac Mini, you are here for one specific mission: **Compile and install the iOS Development Build to the user's physical iPhone.**

## 1. Project Background
- **App Name:** It Is Finished (A Todoist / TickTick killer).
- **Architecture:** Monorepo (Turborepo) with `apps/web` (React DOM), `apps/mobile` (React Native), and `packages/core` (Shared logic).
- **Tech Stack:** React Native (Expo SDK 54), Supabase (Auth/Cloud DB), PowerSync & OP-SQLite (Local-first offline DB).
- **The Problem:** The user was developing on a Windows PC and testing via the standard Expo Go app. However, because we use `@powersync/react-native` and `@op-engineering/op-sqlite`, Expo Go crashes with `TurboModuleRegistry` missing `PlatformConstants`. Expo Go does not support custom native C++ modules.
- **The Strategy:** The user is using this Mac Mini *only* to compile the custom Expo Development Client and install it to their physical iPhone. Once it's installed, they will unplug the phone and go back to developing on their Windows PC!

## 2. Your Immediate Goal
Guide the user through compiling the native iOS app onto their iPhone.

**Steps you need to execute (or guide the user through):**
1. Make sure dependencies are installed (`npm install` at the root).
2. Move into the mobile directory: `cd apps/mobile`.
3. Ensure their iPhone is plugged into the Mac Mini via USB, unlocked, and they have tapped "Trust this computer".
4. Run `npx expo run:ios --device`. This will prompt them to select their physical iPhone.
5. **Code Signing:** Since they are using a free Apple ID (Personal Team), Expo CLI will prompt them in the terminal to log in to their Apple account to generate a 7-day provisioning profile. Help them through this if they hit any code-signing errors.
6. **CocoaPods:** Expo usually handles `pod install` automatically, but if it fails, you may need to help them troubleshoot CocoaPods.

## 3. Post-Installation
Once the custom app successfully installs and launches on the iPhone:
1. Inform the user they are completely done with the Mac Mini!
2. They can unplug the iPhone.
3. They should return to their Windows PC, start the Metro server (`npm run dev --workspace=@app/mobile`), and their custom iPhone app will connect to the Windows PC over their local Wi-Fi network.

Godspeed!
