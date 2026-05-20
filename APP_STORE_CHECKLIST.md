# App Store Submission Checklist

**Generated:** 2026-05-19 -- Pre-submission readiness scan (two-pass, complete).
This file is the authoritative source for App Store readiness status. Update in real time as items ship.
Roadmap references this file -- do not duplicate items there.

---

## MUST FIX -- Code (Guaranteed or High Rejection Risk)

### 1. [x] Account Deletion -- DONE
**Risk:** GUARANTEED REJECTION
**Guideline:** 5.1.1(v) -- "If your app supports account creation, you must also offer account deletion within the app."
**Shipped:** Delete Account button in Settings > Account section (below Sign Out). Two-step confirmation Alert. Firebase Auth user deleted first -- if deleteUser fails for any reason, Firestore and AsyncStorage are untouched. Firestore users/{uid}/store/* wiped using uid captured before deletion. All pj_* AsyncStorage keys removed. Routes to sign-in automatically via onAuthStateChanged. requires-recent-login handled with specific user message. settings.tsx only, pure JS.
**Note:** Apple identity token revocation (a best practice when using Sign in with Apple) is not implemented -- Firebase Auth deleteUser handles the Firebase side but does not call Apple's revocation endpoint. Not required for initial App Store review, but worth adding before wide public launch.

---

### 2. [ ] Privacy Policy -- Write It, Host It, Link It
**Risk:** GUARANTEED REJECTION
**Guideline:** 5.1.1(i) -- "All apps must include a link to their privacy policy in the App Store Connect metadata field and within the app in an easily accessible manner."
**Issue:** sign-in.tsx line 113 says "Terms of Service and Privacy Policy" as plain unlinked text. No URL exists.
**Fix:**
- Write the privacy policy. Must cover: data collected (name, weight, food logs, health metrics, workout data, journal entries, faith reflections), HealthKit used only for health management never advertising, Firebase as third-party processor, FatSecret as food data provider, Google Sign-In, how users request deletion, no data selling
- Host at a live URL before submission
- Enter URL in App Store Connect Privacy Policy metadata field
- Make "Privacy Policy" in sign-in.tsx a tappable Linking.openURL() call

---

### 3. [ ] Terms of Service -- Write It, Host It, Link It
**Risk:** GUARANTEED REJECTION
**Guideline:** 5.1.1(i) -- same as Privacy Policy
**Issue:** Same as #2 -- referenced as plain unlinked text.
**Fix:** Write ToS, host at live URL, wire tappable link in sign-in.tsx. Do same session as #2.

---

### 4. [ ] Privacy Manifest (PrivacyInfo.xcprivacy) -- Required by Apple
**Risk:** GUARANTEED REJECTION on upload -- Apple blocks App Store Connect uploads missing required reason declarations
**Issue:** App uses AsyncStorage which internally calls NSUserDefaults. Apple requires a privacy manifest declaring the reason for any "required reason API" usage. app.json has no privacyManifests entry. Without this, the EAS production build will fail App Store Connect upload validation.
**Fix -- add to app.json under ios:**
```json
"privacyManifests": {
  "NSPrivacyAccessedAPITypes": [
    {
      "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryUserDefaults",
      "NSPrivacyAccessedAPITypeReasons": ["CA92.1"]
    }
  ]
}
```
Reason code CA92.1 = "Access info from the same app that previously wrote the info" -- correct for AsyncStorage reading its own data.
**Requires new EAS build.**

---

### 5. [ ] Camera Permission String -- Too Generic
**Risk:** HIGH -- reviewer flag
**Guideline:** 5.1.1(ii) -- "purpose strings must clearly and completely describe your use of the data"
**Issue:** expo-camera in app.json is a bare string with no config. Auto-injected NSCameraUsageDescription will be generic.
**Fix in app.json** -- change `"expo-camera"` to:
```json
["expo-camera", { "cameraPermission": "Project J uses your camera to scan food barcodes for nutritional information." }]
```
**Requires new EAS build.**

---

### 6. [ ] Remove Unused Reproductive Health HealthKit Types
**Risk:** HIGH -- data minimization violation (5.1.1(iii))
**Issue:** useHealthKit.ts requests MenstrualFlow, OvulationTestResult, CervicalMucusQuality, and IntermenstrualBleeding. Women's health features are in BACKLOG and not built. Requesting permissions for features that don't exist is a red flag.
**Fix:** Remove those 4 types from requestAuthorization in useHealthKit.ts. Re-add when women's health ships.
**JS-only -- no new build needed.**

---

### 7. [ ] Verify HealthKit Write Permission Is Actually Used
**Risk:** HIGH -- if declared but unused, data minimization violation
**Issue:** NSHealthUpdateUsageDescription ("Project J uses HealthKit to save workout and health data") is declared in app.json, but no HealthKit write calls were found in useHealthKit.ts. If the app is read-only from HealthKit, this permission must be removed.
**Fix:** Audit useHealthKit.ts. If no write calls exist, remove NSHealthUpdateUsageDescription from the healthkit plugin config in app.json.
**Requires new EAS build if removed.**

---

### 8. [ ] iPad -- supportsTablet: true Requires Acceptable iPad Experience + Screenshots
**Risk:** HIGH -- Apple requires screenshots for iPad if supportsTablet is true, and the app must be usable on iPad
**Issue:** app.json has "supportsTablet": true. This means Apple will require iPad screenshots at submission AND reviewers may test on iPad. The app has not been designed or tested for iPad.
**Two options -- pick one before submission:**
- Option A: Set `"supportsTablet": false` in app.json. Simplest. App becomes iPhone-only. Requires new build.
- Option B: Keep `true`, test on iPad, fix layout issues, provide iPad screenshots. More work but larger addressable audience.
**Recommendation:** Set to false for first TestFlight/launch. Add iPad support as a dedicated future update.

---

### 9. [ ] Medical Disclaimer Pass -- Incomplete Coverage
**Risk:** HIGH -- Guideline 1.4.1 -- "Apps should remind users to check with a doctor in addition to using the app and before making medical decisions."
**Issue:** Disclaimer exists on Fitness Metrics card and Diagnostic Report. Missing on:
- Sleep Score card (0-100 score with "Well Rested / Could Be Better / Poor Sleep" labels)
- Sleep Tips section ("REM supports memory and mood" is a health claim)
- Weight loss projection in Profile (projected date to reach goal weight)
- BMR/TDEE calorie target results
**Fix:** Add standard line to each location:
> "For informational purposes only. Consult a healthcare professional before making health or dietary changes."
**Files:** index.tsx (sleep score), stats.tsx (sleep tips), profile.tsx (weight projection + BMR result)

---

### 10. [ ] Age Gate -- No Under-13 Protection
**Risk:** MEDIUM-HIGH -- COPPA (Guideline 5.1.4)
**Issue:** App collects birthday and health data with no age verification. Under-13 users are not blocked.
**Fix:** In onboarding/profile-setup.tsx, calculate age from birthday. If under 13, Alert: "Project J is designed for users 13 and older." Block Continue.

---

### 11. [ ] Dev Tools -- Audit for Production Safety
**Risk:** MEDIUM -- Apple reviewers can discover and probe hidden features
**Issue:** Settings screen has a 7-tap Easter egg on the "Settings" title that unlocks a Dev Tools panel. The panel includes: fire celebrations, reset achievements, clear food history, reset onboarding, upload all data to Firestore, check sync status, reset tooltip states. The roadmap says "KEEP CODE TOGGLE FOR FUTURE USE."
**The panel is acceptable in production IF:**
- Clearing food history requires an explicit confirmation Alert (verify this is there)
- Uploading all data to Firestore is safe for a user who accidentally finds it (it is -- just re-syncs)
- No dangerous data wipe without confirmation exists
**Fix:** Audit every dev tools action for confirmation gates. Add Alerts to any destructive action that doesn't have one. No need to remove the panel -- it's fine as an Easter egg as long as no action causes unrecoverable harm.

---

## APP STORE CONNECT SETUP
*No code -- required before submission. Do these last, after all code fixes and name are locked.*

- [ ] Enter Privacy Policy live URL in App Store Connect metadata
- [ ] Enter Terms of Service live URL in App Store Connect metadata
- [ ] Enter Support URL (live contact page or mailto link -- required field)
- [ ] Fill out Privacy Nutrition Label questionnaire accurately:
  - **Linked to user:** Health & Fitness data, User Content (journals, food logs, workout notes), Identifiers (email, Firebase UID), Usage Data
  - **Third parties that collect data:** Firebase (Auth + Firestore), FatSecret (food search queries), Google (Sign-In)
  - **Not linked to user:** Diagnostics (crash logs)
- [ ] Set Age Rating to 13+
- [ ] Set App Category to Health & Fitness (Primary), Lifestyle or Reference as Secondary
- [ ] Set Copyright field (e.g. "2026 Justin Harmke")
- [ ] App description must include "Powered by FatSecret" phrase
- [ ] Answer Medical Device Declaration: "No, this is not a regulated medical device"
- [ ] Write App Review Notes -- include:
  - Faith integration is an intentional feature (Christian wellness app)
  - HealthKit is read-only, used for personal health/fitness tracking only, never for advertising
  - No medical advice is given -- all health data shown with "informational purposes only" disclaimers
  - Food database powered by FatSecret (licensed Premier API)
  - Not a medical device, makes no diagnostic claims
  - Login: reviewers can use their own Apple ID to sign in -- no demo account needed
- [ ] Screenshots for 6.9" iPhone (required) and 6.7" Pro Max (required) -- actual app screenshots, not mockups
- [ ] If supportsTablet stays true: iPad screenshots also required (13" Pro)
- [ ] Confirm app display name in app.json matches finalized name (currently "ProjectJ" -- update before submission)
- [ ] Confirm bundle ID com.jharmke.projectj is registered in Apple Developer portal under the correct team (8A8F5933RX)
- [ ] Confirm pricing is set to Free

---

## SECURITY -- Not App Store Rejection, But Pre-Launch Risks

- [ ] **FatSecret API secret hardcoded** in add-food.tsx (line 52) and food-detail.tsx (line 85). Low risk for TestFlight. Must move to a proxy server before any wide public release -- if the secret leaks, FatSecret revokes API access and food search dies.
- [ ] **Firebase config exposed** in firebaseConfig.ts -- standard for client-side Firebase, security rules are the real protection. Monitor Firebase Console > Usage for anomalous patterns after public launch.

---

## ALREADY GOOD -- Verified Clean

- [x] Sign in with Apple -- fully implemented, entitlement present in app.json
- [x] Google Sign-In -- present, satisfies "third-party login requires a privacy-focused alternative" rule
- [x] FatSecret attribution badge -- confirmed in both add-food.tsx (line 1339) and food-detail.tsx (line 834), tappable to fatsecret.com
- [x] ITSAppUsesNonExemptEncryption: false -- correctly set, eliminates export compliance questions
- [x] NSHealthShareUsageDescription -- present and specific in app.json
- [x] Production EAS build profile -- confirmed in eas.json (production profile with autoIncrement: true)
- [x] Fitness Metrics card medical disclaimer -- present and correctly placed
- [x] Diagnostic Report disclaimer -- present and correctly placed
- [x] No in-app purchases, subscriptions, or external payment flows -- nothing to declare
- [x] No private or undocumented Apple APIs detected
- [x] HealthKit data used only for legitimate health/fitness purposes (no advertising, no iCloud health data storage)
- [x] No tracking / IDFA usage detected

---

## VERIFICATION SCAN
*After all code items above are checked off, do a final pass before submitting:*

- [ ] Run EAS production build and confirm it succeeds with no warnings
- [ ] Install production build on a physical device -- confirm sign-in, all tabs, food search, HealthKit, and account deletion all work
- [ ] Check privacy manifest is included in the built binary (EAS build logs will show)
- [ ] Confirm no crashes on cold launch, tab switching, food search, and barcode scan
- [ ] Walk through App Store Connect submission form -- confirm every required field is filled
- [ ] Check privacy nutrition label one final time for accuracy before submitting

---

## ATTACK ORDER

1. Account deletion (half session -- build required)
2. Privacy policy + Terms of Service (write + host + wire links)
3. Privacy manifest + camera permission string + remove unused HealthKit types + verify HealthKit write (one commit, one new build)
4. iPad decision -- set supportsTablet: false or commit to iPad support (goes in same build as #3)
5. Medical disclaimer pass (index.tsx + stats.tsx + profile.tsx)
6. Age gate in onboarding
7. Dev tools audit (quick -- confirm all destructive actions have Alerts)
8. App Store Connect setup (no code -- do after name is locked and screenshots ready)
9. Verification scan (final pass before hitting Submit)
