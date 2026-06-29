# App Store Compliance Scan Findings
**Scanned:** 2026-06-29 | **Scope:** TestFlight external / Beta App Review + App Store prep
**Method:** Inline read-only scan (no agents). All findings verified against actual files.
**Status:** Complete.

---

## LEGEND
- **blocker** = guaranteed/near-guaranteed Apple rejection or upload failure
- **high** = likely reviewer flag / rejection risk
- **medium** = should fix before submit; unlikely to single-handedly reject
- **low** = pre-public-launch / polish; not a beta blocker
- **[DONE]** = fixed and verified

---

## BLOCKERS

### F-01 | blocker | Account deletion leaves Firebase Storage photos orphaned
**Guideline:** 5.1.1(v)
**Location:** `functions/src/index.ts:80-129` (`deleteAccount` function)
**Evidence:** Function deletes `users/{uid}/store/*` (Firestore), `users/{uid}` root doc, and Firebase Auth user. It never touches Firebase Storage `users/{uid}/food_photos/*`. Food-entry photos and custom-food photos persist in the cloud indefinitely after account deletion.
**Fix:** Add Storage cleanup to `deleteAccount` before the Auth deletion step. List and delete all objects under `users/{uid}/food_photos/` using the Firebase Admin Storage SDK.
**Requires build:** No (Cloud Function only)

---

### F-02 | blocker | Account deletion leaves prayer_requests subcollection orphaned
**Guideline:** 5.1.1(v)
**Location:** `functions/src/index.ts:113-116` (only deletes `store/*`, not `prayer_requests/*`)
**Evidence:** `components/PrayerRequestModal.tsx:48` writes docs to `users/{uid}/prayer_requests/{docId}`. The `deleteAccount` function deletes `users/{uid}/store/*` but never touches `users/{uid}/prayer_requests/*`. Prayer messages including `message`, `userName`, and `userEmail` fields survive deletion.
**Fix:** Add a `prayer_requests` subcollection wipe to `deleteAccount` alongside the `store` wipe (same pattern: getDocs then batch delete).
**Requires build:** No (Cloud Function only)

---

## HIGH

### F-03 | high | privacy.html says photos only go to Anthropic — false since June 2026
**Guideline:** 5.1.1(i) — privacy policy must accurately describe all data collected
**Location:** `public/privacy.html:315`
**Evidence:** Line 315: "The only images that leave your device are meal photos you deliberately attach to the AI Meal Estimator, which are sent to Anthropic solely to generate that estimate." False. `utils/foodPhotos.ts` uploads food-entry photos to Firebase Storage (`users/{uid}/food_photos/`). `components/CustomFoodCreator.tsx` also uploads custom-food photos to Storage at creation time.
**Fix:** Update the camera/photos paragraph: disclose that food-entry and custom-food photos upload to Firebase Storage (under your authenticated account) so they survive reinstall. Also update Section 6 (data storage) and Section 5 Firebase processor paragraph to mention Firebase Storage.
**Requires build:** No (hosted HTML, deploy with `firebase deploy --only hosting`)

---

### F-04 | high | Faith AI Companion sends chat content to Anthropic — undisclosed in privacy.html
**Guideline:** 5.1.1(i)
**Location:** `public/privacy.html:288-292` (Anthropic section) + `functions/src/faithCompanion.ts:148-168`
**Evidence:** `faithCompanion.ts` sends the user's typed chat messages plus conversation history (up to 12 turns) to Anthropic's Claude API on every message. This is a third, materially different Anthropic use case — the user's own words go to Anthropic, not just aggregate metrics. The privacy.html Anthropic section covers only Smart Coach (aggregate metrics) and Meal Estimator (photo + description), and then says "These are the only third-party services used by Project J." The Faith Companion use is completely absent.
**Fix:** Add a third paragraph to the Anthropic section in privacy.html describing the Faith Companion: what is sent (the user's chat messages and session history), what is NOT sent (prayer log content, journal entries, name, email, account ID), and that content is not used to train models. Update the "only third-party services" close to remain accurate.
**Requires build:** No (hosted HTML)

---

### F-05 | high | HealthKit write declared but never implemented — data minimization violation
**Guideline:** 5.1.2 (data minimization); Apple HealthKit data minimization
**Location:** `app.json:67-69` (NSHealthUpdateUsageDescription), `useHealthKit.ts:157-168` (toShare array)
**Evidence:** `app.json` declares `NSHealthUpdateUsageDescription: "Project J can save your weight, water, and nutrition entries to the Health app..."`. `useHealthKit.ts:157` requests `toShare` write access for BodyMass, DietaryWater, DietaryEnergyConsumed, DietaryProtein, DietaryCarbohydrates, DietaryFatTotal. Comment in code: "Write logic ships later." Zero actual HealthKit write calls exist anywhere in the codebase. `public/privacy.html:266` also describes this as a working feature.
**Fix (recommended):** Remove `NSHealthUpdateUsageDescription` from `app.json`, remove the `toShare` array from `useHealthKit.ts`, remove the "Health Data We Write" bullet from `privacy.html:266`. Requires a new build.
**Requires build:** Yes

---

### F-06 | high | privacy.html Section 5 Firebase entry omits Firebase Storage
**Guideline:** 5.1.1(i)
**Location:** `public/privacy.html:276-277`
**Evidence:** Section 5 (Third-Party Services) says "We use Firebase Authentication to manage your account and Firebase Firestore to securely sync your data." Firebase Storage is used for food photos (since June 2026) and is not mentioned. Section 6 (Data Storage) similarly only lists AsyncStorage + Firestore.
**Fix:** Add Firebase Storage to the Firebase description in Section 5 and to the cloud storage bullet in Section 6.
**Requires build:** No (hosted HTML)

---

## MEDIUM

### F-07 | medium | Anthropic API key bundled client-side — extractable from TestFlight binary
**Location:** `.env:7` → `EXPO_PUBLIC_ANTHROPIC_API_KEY` → baked into JS bundle by Expo
**Evidence:** `.env` (gitignored) contains the live Anthropic key. `EXPO_PUBLIC_*` vars are inlined into the JS bundle at build time. Any external tester who extracts the JS bundle from the IPA can read the key and make API calls at your cost. `.env` is gitignored so the key is NOT in the repo.
**Severity for TestFlight:** Medium (small trusted beta = low abuse risk). Hard blocker before any wide public launch or public TestFlight link.
**Fix:** Move AI calls to a Firebase Cloud Function (like Faith Companion already does) so the key lives only on the server. Not required for a small trusted beta.
**Requires build:** Yes (when fixed)

---

### F-08 | medium | FatSecret OAuth consumer key + secret hardcoded in client
**Location:** `app/add-food.tsx:60-61` (`FS_KEY`, `FS_SECRET`), and `app/food-detail.tsx:137,209` (same pattern)
**Evidence:** `FS_KEY = 'b8543feaeabd...'` and `FS_SECRET = '659c1da30b4e...'` are plaintext in the JS bundle. If extracted, someone can make FatSecret API calls under your account, consuming your quota or violating FatSecret's terms.
**Severity for TestFlight:** Medium (small beta). Hard blocker before public launch — FatSecret can revoke API access if the secret leaks widely.
**Fix:** Proxy FatSecret calls through a Cloud Function. Not required for beta.
**Requires build:** Yes (when fixed)

---

### F-09 | medium | terms.html doesn't cover Faith AI Companion or prayer requests
**Location:** `public/terms.html:222-226` (third-party services section)
**Evidence:** Terms covers Smart Coach + AI Meal Estimator under Anthropic, but does not mention the Faith AI Companion (a distinct AI chatbot feature). Prayer requests are not mentioned in terms (that user messages go to the developer's email/Firestore). Both features were added after the original terms were written.
**Fix:** Add a paragraph covering the Faith AI Companion (AI-powered conversational feature, daily cap, crisis response mechanism). Add a sentence about prayer requests (user-submitted, developer receives via email, stored in Firestore).
**Requires build:** No (hosted HTML)

---

### F-10 | medium | terms.html has malformed HTML in third-party list
**Location:** `public/terms.html:222-224`
**Evidence:** `<strong>FatSecret<\strong>` and `<strong>Apple Sign-In<\strong>` use backslash `\` instead of forward slash `/` in the closing tags. Most browsers are lenient and render these anyway, but it's malformed HTML.
**Fix:** Change `<\strong>` to `</strong>` in both instances.
**Requires build:** No

---

### F-11 | medium | DEV_UNLIMITED_UIDS hardcodes Justin's Firebase UID in production function
**Location:** `functions/src/faithCompanion.ts:31`
**Evidence:** `const DEV_UNLIMITED_UIDS = ['zLZOx2aqiKXcl3tlg7LNmkwbGxH3'];` — Justin's real UID gives unlimited Faith AI messages. This bypasses the daily cap server-side. Not a security risk (UID alone grants nothing), but exposes a real UID in source and will cause confusing behavior if the UID ever changes.
**Fix:** Clear the array before public launch. For continued testing, use a Firestore-based role flag or a Firebase Auth custom claim instead.
**Requires build:** No (Cloud Function redeploy only)

---

### F-12 | medium | PRO_LIMIT = 9999 TestFlight hack — must revert before public launch
**Location:** `services/aiMealEstimator.ts:29-32`
**Evidence:** Comment: "TESTFLIGHT HACK (2026-06-24) — raised from 30 so devProUnlocked = effectively unlimited estimates for Justin's trip. REVERT to the real cap before App Store launch." Real Pro limit should be 30.
**Fix:** Change `PRO_LIMIT` back to `30` before App Store submission.
**Requires build:** No

---

## LOW (not beta blockers, but pre-public-launch)

### F-13 | low | devProUnlocked persists in production code
**Location:** `app/settings.tsx:429,3361-3364`, `app/ai-meal-estimator.tsx:164`, `app/comparison-report.tsx:165`
**Evidence:** The 7-tap Easter egg in Settings reveals a Dev Tools panel that includes a "Dev Pro" toggle. Once toggled on, `devProUnlocked: true` is written to `pj_settings` and persists across restarts. Any user who discovers the tap sequence gets permanent Pro features for free.
**Severity for TestFlight:** Low (fine — this is intentional for beta). Acceptable risk for a small trusted beta.
**Fix (pre-public-launch):** Either remove the toggle from the Easter egg panel, or gate it on `__DEV__` only.
**Requires build:** Yes (when fixed)

---

## APP STORE CONNECT SETUP (no code — required before submit)

These are not Apple rejections in the code sense, but they'll block you from completing submission or will get flagged during review:

- [ ] Deploy privacy.html and terms.html to Firebase Hosting (`firebase deploy --only hosting`) — URLs must be live before submission
- [ ] Enter `https://projectj-5d024.web.app/privacy` in App Store Connect Privacy Policy field
- [ ] Enter `https://projectj-5d024.web.app/terms` in App Store Connect Terms of Service field
- [ ] Enter Support URL (can be `mailto:dev.harmke@gmail.com` or a contact page)
- [ ] Fill Privacy Nutrition Label:
  - **Contact Info** (email from Sign-In) — Collected, Linked to Identity, App Functionality
  - **Health & Fitness** — Collected, Linked to Identity, App Functionality; NOT for tracking/advertising
  - **User Content** (food logs, journal entries, workout notes, food photos, chat messages, prayer requests) — Collected, Linked to Identity, App Functionality
  - **Identifiers** (Firebase UID) — Collected, Linked to Identity, App Functionality
  - **Usage Data** (app interactions) — likely Collected, Not Linked, Analytics
  - **Photos or Videos** (food-entry photos, meal estimator photos) — Collected, Linked to Identity, App Functionality
  - Everything else: NOT collected
  - Tracking: NO on everything (no ad SDKs, no cross-app tracking)
- [ ] Set Age Rating to 13+
- [ ] Set Category: Health & Fitness (Primary)
- [ ] Set Copyright: "2026 Justin Harmke"
- [ ] App description must include "Powered by FatSecret"
- [ ] Beta App Review notes (required for external TestFlight):
  - Reviewer access: use your own Apple ID via Sign in with Apple — no demo account needed, full app available on first sign-in
  - Faith integration is an intentional feature (Christian wellness design)
  - HealthKit is read-only, used for personal health/fitness tracking only, never for advertising
  - Not a medical device; all health data shown with "informational purposes only" disclaimers
  - Food database powered by FatSecret (licensed Premier API)
  - Feedback email: dev.harmke@gmail.com
- [ ] Screenshots: 6.9" iPhone (required) and 6.7" Pro Max (required)
- [ ] Confirm bundle ID `com.jharmke.projectj` is registered in Apple Developer portal under team 8A8F5933RX
- [ ] Finalize app display name (currently "ProjectJ" — this shows to reviewers and testers)
- [ ] Answer Medical Device Declaration: "No, this is not a regulated medical device"

---

## VERIFIED CLEAN

- Age gate: `onboarding/profile-setup.tsx:74-78` correctly blocks under-13 ✓
- Account deletion UI: visible in Settings, two-step Alert confirm, error handling, routes to sign-in on success ✓
- Apple token revocation: implemented server-side in `deleteAccount` ✓
- Sign in with Apple: entitlement in `app.json`, implemented in `sign-in.tsx` ✓
- ITSAppUsesNonExemptEncryption: false — in `app.json` ✓
- supportsTablet: false — iPhone-only, no iPad screenshots required ✓
- Privacy manifest: UserDefaults / CA92.1 in `app.json`; major SDKs (expo-file-system, async-storage, expo-notifications, react-native) ship their own PrivacyInfo.xcprivacy in node_modules — covered ✓
- Camera permission string: specific and non-generic ✓
- Photo library permission string: present (expo-image-picker + infoPlist) ✓
- Microphone + speech recognition strings: present (expo-speech-recognition plugin) ✓
- NSUserNotificationUsageDescription: present and specific ✓
- Medical disclaimers on all new health screens: Body Measurements (inline + first-use modal), HR Zones Stats card, HR Zone per-workout modal, Home sleep/recovery cards, Day Summary, Comparison Report, AI Meal Estimator, Diagnostic Report, Sleep screen, Challenge Create ✓
- FatSecret attribution badge: "Powered by FatSecret" tappable badge in `add-food.tsx:2094` and `food-detail.tsx:1697` ✓
- Faith AI crisis handling: two-layer (client + server), hardcoded crisis card with real hotline resources ✓
- Faith AI data: only chat text sent, no email/name/UID/prayer log/journal ✓
- Faith AI companion is NOT user-to-user (no UGC sharing between users) — Apple 1.2 strict UGC requirement doesn't apply ✓
- Local notifications only: no APNs push token registration found ✓
- KJV Bible content: public domain, no licensing required ✓
- No external purchase flows or steering to outside payment (no IAP) ✓
- devPro toggle behind 7-tap Easter egg — not easily discoverable ✓
- EAS production profile: autoIncrement: true, environment: production ✓
- eas.json production profile links to the EAS production environment where EXPO_PUBLIC_ANTHROPIC_API_KEY is loaded ✓

---

## ATTACK ORDER (recommended fix sequence)

### Must do before submitting (blockers + high):
1. **F-01 + F-02** — Fix `deleteAccount` Cloud Function to also wipe Storage photos + prayer_requests (one Cloud Function edit, redeploy, no app build)
2. **F-03 + F-04 + F-06** — Update privacy.html in one pass: photos/Storage, Faith Companion, Firebase Storage in Section 5/6 (one HTML file, one deploy)
3. **F-05** — Remove `NSHealthUpdateUsageDescription` from app.json, remove `toShare` from useHealthKit.ts, remove HealthKit write bullet from privacy.html (requires new build)
4. **App Store Connect setup** — all the checklist items above

### Should do before submitting (medium):
5. **F-09 + F-10** — Update terms.html (Faith Companion + prayer mentions + HTML typos) — one HTML edit, one deploy
6. **F-11** — Clear DEV_UNLIMITED_UIDS before launch (Cloud Function redeploy, no build)
7. **F-12** — Revert PRO_LIMIT to 30 before App Store launch (pure JS, no build)

### Pre-public-launch only (low):
8. **F-07 + F-08** — Move Anthropic + FatSecret API calls to Cloud Functions (significant JS work)
9. **F-13** — Gate devProUnlocked on __DEV__ only
