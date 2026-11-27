# Ahaar AI

A premium calorie-tracking mobile app built for the Bangladeshi demographic. Snap a
photo of your meal, get an instant calorie/macro breakdown tuned for authentic
South Asian home cooking, and track your progress on a daily dashboard -- no
login wall on your very first scan.

Built with Expo (React Native + TypeScript), Supabase (Postgres + Auth), and
Gemini 2.0 Flash.

## How it works

1. **Landing hook.** The app opens straight into a camera-first hero -- no
   sign-up required. Behind the scenes it silently creates a Supabase
   anonymous session (`supabase.auth.signInAnonymously()`) so the very first
   scan has somewhere safe to be saved.
2. **Scan & analyze.** The photo is resized locally (see below), sent to the
   `analyze-meal` Supabase Edge Function, and Gemini 2.0 Flash returns a
   structured calorie/macro breakdown using a Bangladeshi-cuisine-specific
   nutrition prompt.
3. **Login gate.** Tapping "Save to Dashboard" on a guest's result opens the
   auth screen. Signing up **upgrades the existing anonymous session in
   place** (`supabase.auth.updateUser({ email, password })`), so the user id
   -- and any scans already saved under it -- carry over untouched.
4. **Dashboard.** Authenticated users land on a live dashboard: a calorie
   ring (today vs. target), protein/carbs/fat gauges, and a reverse-
   chronological feed of today's logs, plus a History screen grouped by day.
5. **Profile.** The Profile tab opens an account screen (guest vs signed in)
   where you can edit the calorie target, sign out, or delete the account.

## Why photos never touch Supabase

Only the nutrition row (dish name, macros, a local file path) is written to
Postgres -- roughly 200 bytes per log, so 20,000 logs costs about 4MB against
the 500MB free tier. Photos stay entirely on-device: even at ~60KB each, the
1GB free Storage tier is shared across *every* user, and every dashboard
scroll would re-download thumbnails against the 5GB/month egress cap for
images that have no value once Gemini has already extracted the macros.

Photos are still resized before upload (800px longest edge, JPEG/WEBP,
~50-90KB) -- not for storage, but because a full-resolution photo base64-
encodes to several MB, which is slow to send on mobile data and costs more
Gemini image tokens. See [`src/lib/photos.ts`](src/lib/photos.ts).

## Why Gemini never runs on-device

The Gemini API key is **never** shipped in the app bundle. It lives only as
a Supabase Edge Function secret (`GEMINI_API_KEY`) and is read inside
[`supabase/functions/analyze-meal/index.ts`](supabase/functions/analyze-meal/index.ts),
which also holds the Bangladeshi nutrition system prompt. The client
([`src/services/gemini.ts`](src/services/gemini.ts)) just calls
`supabase.functions.invoke("analyze-meal", ...)` with the resized image.
This also means the prompt can be retuned by redeploying the function --
no app store review required.

## Project structure

```
App.tsx                         Entry point: session-gated navigation
src/
  lib/
    supabase.ts                 Supabase client (+ local demo fallback if unconfigured)
    session.tsx                 SessionProvider: anonymous sign-in, auth state, delete account
    goals.tsx                   Calorie target load/save (profiles table or demo storage)
    photos.ts                   Resize -> persist locally -> base64 for Gemini
  services/
    gemini.ts                   Thin client for the analyze-meal Edge Function
    logs.ts                     Save/fetch food_logs, day grouping, macro totals
  screens/
    OnboardingCameraScreen.tsx  Landing hook + camera capture + result card
    AuthScreen.tsx              Sign up / log in (anonymous session upgrade)
    DashboardScreen.tsx         Calorie ring, macro gauges, today's feed
    HistoryScreen.tsx           Day-by-day summaries
    ProfileScreen.tsx           Account status, calorie target, sign out, delete account
    PrivacyScreen.tsx           In-app summary of what data is collected and how to delete it
  components/                   PrimaryButton, GlassCard, CalorieRing, MacroBar, ...
  theme/                        Colors, radii, spacing, typography
  types/                        Shared domain types
supabase/
  schema.sql                    food_logs, profiles, scan_usage tables, indexes, RLS
  functions/analyze-meal/       Server-side Gemini call (key never leaves the server)
  functions/delete-account/     Service-role deletion of the calling auth user
PRIVACY_POLICY.md               Publish this to a public URL for the Play Store listing
STORE_LISTING.md                Play Store description, Data safety answers, release checklist
LESSONS.md                      Mistakes from this project — read before changing Cursor, EAS, or Play
store/                          Play assets: 512 icon, 1024x500 feature graphic, 1080x1920 screenshots
```

## Setup

### 1. Supabase

Create a project (or use an existing one) and run [`supabase/schema.sql`](supabase/schema.sql)
against it (SQL Editor, or `supabase db push` / the Supabase MCP `apply_migration` tool).

Then, in **Authentication -> Providers -> Email**:

- **Enable "Allow anonymous sign-ins"** (Authentication -> Providers -> Anonymous).
  Without this, `signInAnonymously()` fails and the hook-first onboarding flow
  cannot save a guest's first scan.
- **Turn OFF "Confirm email"** (Authentication -> Providers -> Email) for the
  frictionless "scan, then sign up" flow described in the product spec. With
  email confirmations on, Supabase requires the user to click an emailed
  link before an anonymous session is fully upgraded to a permanent one --
  the app handles this gracefully (see `AuthScreen.tsx`), showing a "check
  your email" message instead of breaking, but it adds a step the original
  design doesn't call for.

Copy your project's URL and anon/publishable key into `.env` (see `.env.example`):

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

If these are left unset, the app still runs end-to-end against a small local
in-memory/AsyncStorage-backed demo backend (`src/lib/supabase.ts`), so the
full onboarding -> scan -> auth gate -> dashboard flow stays demoable with
zero setup.

### 2. Gemini (server-side only)

Get a free key at [aistudio.google.com](https://aistudio.google.com), then
set it as a **Supabase Edge Function secret** -- never as a client env var:

```bash
supabase secrets set GEMINI_API_KEY=your-key
# or: Supabase Dashboard -> Edge Functions -> Secrets
```

Deploy the function:

```bash
supabase functions deploy analyze-meal
supabase functions deploy delete-account
```

Without a configured key, or if the function is unreachable, `src/services/gemini.ts`
falls back to a deterministic sample Bangladeshi meal analysis so the app
remains fully demoable.

### 3. Run the app (web / Expo Go)

```bash
npm install
npx expo start
```

This launches the Metro bundler; press `w` for web, or scan the QR code with
Expo Go on your phone. Equivalent shortcuts:

```bash
npm run web       # Expo web (camera falls back to the gallery picker in-browser)
npm run ios       # iOS simulator (requires macOS)
npm run android   # Android emulator
```

From WSL, Expo Go on a physical phone usually cannot reach Metro (`172.23.x.x`).
Prefer an APK preview build below, or `npx expo start --tunnel` after
`npm install --save-dev @expo/ngrok`.

### 4. Install a preview APK on your Android phone (no Expo Go)

This produces a real Ahaar AI icon you can tap. Camera works without Metro.

1. Create a free Expo account at [expo.dev](https://expo.dev/signup).
2. On your PC, in this repo:

```bash
npm install
npm install -g eas-cli
eas login
eas build:configure
```

`eas build:configure` links the project and writes an EAS project id into
`app.json`. Commit that change.

3. Put the same Supabase public values the app needs at **build** time
   (never put `GEMINI_API_KEY` here — that stays on the Edge Function):

```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value https://your-project-ref.supabase.co
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value your-anon-key
```

Skip this step to ship a demo-mode APK (local fake backend, sample meals).

4. Build the APK (10–20 minutes in Expo's cloud):

```bash
npm run build:android:preview
```

When Expo asks "Generate a new Android Keystore?", choose **yes** for the
first preview. When the build finishes, open the URL it prints, download the
`.apk` on your phone, and install it (allow install from the browser if asked).

### 5. Publish to Google Play

The preview APK above is for testing only. Play Store production uses a
different, signed artifact and a different track.

1. **Privacy policy URL** is already published. Paste that public URL into
   Play Console → App content → Privacy policy. Contact email is
   `rihamhoque1@gmail.com` (see [`PRIVACY_POLICY.md`](PRIVACY_POLICY.md)).
2. **Build the production bundle** on a machine where you are logged into
   Expo (`eas login` / `eas build:configure` if you haven't already). Set
   the same two `EXPO_PUBLIC_SUPABASE_*` secrets with `eas secret:create`
   — **never** `GEMINI_API_KEY`, which must stay a Supabase Edge Function
   secret, not an EAS build secret:

```bash
npm run build:android:production
```

   This produces an `.aab`, not an `.apk`. When EAS asks about the
   production keystore, generate a new one and **save the credentials
   Expo shows you** — losing it means you can never update this app on
   Play again.
3. **Create the app in Play Console** (package `com.ahaarai.app`, category
   Health & Fitness, not a medical device) and **upload the `.aab` to the
   Internal testing track first** — not Production. Verify a real device
   install works end to end (scan a meal, sign up, edit calorie target,
   delete account) before promoting any release to Production.
4. **Fill in the store listing** using [`STORE_LISTING.md`](STORE_LISTING.md)
   for the short/full description and Data safety answers. Upload
   [`store/icon-512.png`](store/icon-512.png),
   [`store/feature-graphic.png`](store/feature-graphic.png), and
   [`store/screenshots/`](store/screenshots/) (`01`–`05`, `06` optional).
5. Once Internal testing passes, promote the same release to **Production**
   from Play Console (no new build needed unless you change the app).

## Notes on scope

- **Calorie target** is editable on the Profile screen (default 2200, range
  1000–5000) and is stored in `public.profiles`. Protein / carbs / fat still
  use the defaults in `src/types/index.ts`.
- **Delete account** calls the `delete-account` Edge Function (service-role
  `auth.admin.deleteUser`). Deploy that function for real deletion; demo mode
  wipes the local guest instead. Without the function, signed-in delete shows
  a clear error.
- **Social login** is not wired up (the spec mentions it as an option); the
  auth gate currently supports email/password, which is what Supabase Auth
  needs no extra provider configuration for.
