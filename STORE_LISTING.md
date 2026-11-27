# Google Play Store Listing — Ahaar AI

Reference copy for the Play Console store listing. Edit freely; nothing
here is read by the app itself.

## App details

- **App name:** Ahaar AI
- **Package name:** `com.ahaarai.app`
- **Category:** Health & Fitness
- **Content rating:** Everyone (no user-generated content shared publicly,
  no violence/mature themes; run the questionnaire to confirm)
- **Tags:** calorie tracker, nutrition, Bangladeshi food, meal scanner

## Short description (max 80 characters)

```
Snap a photo, get instant calories for Bangladeshi home-cooked meals.
```

(70 characters)

## Full description

```
Ahaar AI is a calorie and macro tracker built specifically for Bangladeshi
home cooking — the dishes generic calorie apps never recognize.

HOW IT WORKS
• Snap a photo of your plate — no sign-up required for your first scan.
• Ahaar AI recognizes the dish and estimates calories, protein, carbs,
  and fat, tuned for authentic South Asian recipes and cooking oil use.
• Save it to your dashboard to track today's intake against your goal.

WHY AHAAR AI
• Built for real Bangladeshi dishes — bhaji, tehari, porota, bhorta, and
  more — not just generic "rice and curry" guesses.
• Your own daily calorie target, editable any time in Profile.
• A clean daily dashboard and weekly history so you can see your trends.
• Your meal photos never leave your device — only the recognized
  nutrition data is saved to your account.

PRIVACY, SIMPLY
• No ads. No third-party trackers. No selling your data.
• Delete your account and all your data at any time from Profile.

Ahaar AI is for personal nutrition tracking and is not a medical device.
Estimates are approximate and should not replace professional dietary
advice.
```

## Data safety section (Play Console)

Match these answers to what the app actually does — see
[PRIVACY_POLICY.md](PRIVACY_POLICY.md) for full detail:

- **Data collected:** Email address (account), App activity — meal
  nutrition data and calorie target (app functionality). Photos are
  processed for analysis but **not stored** on our servers.
- **Data shared with third parties:** None sold or shared for advertising.
  Meal photos are sent to Google's Gemini API solely to compute a
  calorie/macro estimate on our behalf (processed, not stored by us).
- **Data encrypted in transit:** Yes (HTTPS to Supabase and the analysis
  function).
- **Users can request data deletion:** Yes — in-app (Profile → Delete
  account) and via the contact email in the privacy policy.
- **Ads:** None.

## Store assets (ready in `store/`)

All Play-compliant (PNG, no alpha, within Play's size/aspect limits):

| Asset | File | Size |
| --- | --- | --- |
| Hi-res app icon | `store/icon-512.png` | 512x512 |
| Feature graphic | `store/feature-graphic.png` | 1024x500 |
| Phone screenshots (upload 01–05; 06 optional) | `store/screenshots/01-scanner.png` … `06-privacy.png` | 1080x1920 |

Screenshots were captured from the app's web build at phone size; `02-result`
is a real Gemini analysis of a sample plate. Re-capture from a device if you
change the UI.

- **Privacy policy URL:** Paste the public URL you already published into
  Play Console → App content → Privacy policy. Play does not accept a
  file path. The source text is [PRIVACY_POLICY.md](PRIVACY_POLICY.md).

## Release notes (first release, max 500 chars)

```
Ahaar AI 1.0 — calorie tracking built for Bangladeshi home cooking.
• Snap or pick a meal photo and get calories, protein, carbs and fat in seconds
• Daily dashboard with your own calorie target
• Weekly progress and full meal history
• Private by design: photos stay on your device, delete your account any time
```

## Pre-submission checklist

1. `npx expo-doctor` passes and `npx tsc --noEmit` is clean.
2. Bump `android.versionCode` in `app.json` for every new upload (Play
   rejects duplicates); bump `version` for user-visible releases.
3. `eas build -p android --profile production` → download the `.aab`.
4. Play Console → Create app → Store listing (copy above) → App content
   (privacy URL, data safety, content rating, target audience 18+ or
   13+, ads = No) → Testing → Internal testing → upload `.aab`.
5. Install from the internal-testing link on a real phone; run one real
   scan, sign up, edit calorie target, delete the account.
6. Promote to Production; first review usually takes a few days.

## Contact / support

Use the same address as the privacy policy contact
(`rihamhoque1@gmail.com`) as the Play Console developer contact email.
