# Stonevo Mobile App — Setup Guide

The web app is now wrapped with **Capacitor**. Same React codebase ships to:
- 🌐 Web → `stonevo.in` (Vercel)
- 🤖 Android → Google Play Store
- 🍎 iOS → Apple App Store

## How it works (LIVE MODE)

`capacitor.config.json` is set to load `https://stonevo.in` directly.
This means **every push to git updates the app instantly** — no app re-submission for UI/feature changes.

The app only needs to be re-submitted to stores when you change:
- App icon / splash screen / app name
- Native plugins (camera, push notifications, etc.)
- App version number

---

## Available scripts

```bash
npm run app:build         # vite build + sync to native projects
npm run app:sync          # sync without rebuilding
npm run app:open:android  # open Android Studio
npm run app:open:ios      # open Xcode (Mac only)
npm run app:run:android   # build & run on connected device/emulator
```

---

## Android — first build (Windows OK)

### Prerequisites (one-time)
1. Install [Android Studio](https://developer.android.com/studio)
2. Install JDK 17 (Android Studio bundles one)
3. From Android Studio → SDK Manager → install:
   - Android SDK Platform 34 (or latest)
   - Android SDK Build-Tools
   - Android SDK Platform-Tools

### Build & test
```bash
npm run app:open:android
```
This opens the project in Android Studio.

In Android Studio:
1. Wait for Gradle sync to finish (first time: ~5 min)
2. Click ▶️ Run → pick an emulator or plug in your phone (USB debugging on)
3. App launches loading `stonevo.in`

### Build a release APK / AAB for Play Store
1. Android Studio → Build → Generate Signed Bundle/APK
2. Pick **Android App Bundle (.aab)** for Play Store
3. Create a keystore (save it safely — you need it for every future update)
4. Upload the `.aab` to [Google Play Console](https://play.google.com/console) (₹2,000 one-time fee)

---

## iOS — first build (Mac required)

iOS builds **only work on macOS** with Xcode. You'll need to do this part on a Mac.

### Prerequisites (one-time)
1. Install [Xcode](https://apps.apple.com/us/app/xcode/id497799835) from Mac App Store
2. Install CocoaPods: `sudo gem install cocoapods`
3. Apple Developer account ($99/year) — [developer.apple.com](https://developer.apple.com)

### On the Mac
```bash
# Pull this repo
git clone https://github.com/goellakshya21-crypto/stonevo-new.git
cd stonevo-new
npm install
npx cap add ios   # only first time — adds ios/ folder
npm run app:build
npm run app:open:ios
```

In Xcode:
1. Set your Apple Developer team in Signing & Capabilities
2. Pick a simulator or plug in iPhone → ▶️ Run
3. For App Store: Product → Archive → upload via Organizer

---

## App icon & splash screen

To customize:
1. Create a 1024×1024 PNG of the Stonevo logo (transparent background)
2. Install icon generator: `npm install -D @capacitor/assets`
3. Drop your image at `assets/icon.png` and `assets/splash.png` (2732×2732)
4. Run: `npx capacitor-assets generate`

---

## Workflow after launch

Daily code changes (UI, features, AI flow, anything in `src/`):
```bash
git push origin main
```
✅ Web updates in ~1 min (Vercel)
✅ Android app updates instantly (loads stonevo.in live)
✅ iOS app updates instantly (loads stonevo.in live)
**No re-submission needed.**

Native changes (icon, splash, plugins, version bump):
```bash
npm run app:build
# Open Android Studio / Xcode → build new release → upload to store
```
Re-submission required (~1 day Android review, ~1-3 days iOS review).

---

## Switching to OFFLINE / BUNDLED mode (optional)

If later you want the app to work without internet, edit `capacitor.config.json`:
```json
{
  "webDir": "dist"
  // remove the "server" block
}
```
Then `npm run app:build` bundles your React code inside the app binary. App store re-submission needed for every update unless you add Capacitor Live Updates ($29/mo Ionic service).

---

## What's installed

- `@capacitor/core` — runtime
- `@capacitor/cli` — build tooling
- `@capacitor/android` — Android platform
- `@capacitor/ios` — iOS platform (added on Mac)
- `@capacitor/splash-screen` — branded launch screen
- `@capacitor/status-bar` — status bar styling
- `@capacitor/app` — app lifecycle events (back button, etc.)

## Files added

- `capacitor.config.json` — main config
- `android/` — full Android Studio project (committed to git)
- `ios/` — added on Mac (also committed)
- `APP_SETUP.md` — this file
