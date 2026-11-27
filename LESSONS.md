# Lessons from building Ahaar AI

**Open this anytime:** in Cursor’s left file list, click `LESSONS.md`
(project root). It is also a Cursor rule at `.cursor/rules/lessons.mdc`
(always on for this repo). After `git pull` on your PC, the same file is
there. It is saved on `main`.

Read this before changing Cursor, Expo, EAS, Supabase, or Play Store
settings. These are mistakes that already cost time on this project.

## 1. Cursor chat vs a custom API key

**What happened:** Desktop Cursor showed
`This model is not available with a custom API key` / `ERROR_UNAUTHORIZED`.

**Mistake:** Using a personal OpenAI / Gemini / Anthropic key in Cursor
Settings while picking a **Cursor-hosted** model (Grok, Cloud Agent, Auto
on Cursor’s list).

**Do instead:**

- Cursor Cloud Agents and many chat models need you **signed in to Cursor**.
- Turn **off** “override / custom API key” if you want those models.
- Keep a custom key **only** if you pick a model that key actually pays for
  (OpenAI key → GPT, not Grok).
- `GEMINI_API_KEY` for **meal scanning** lives in **Supabase Edge Function
  secrets**. It is not the Cursor chat key.

## 2. Gemini key in the wrong place

**Mistake:** Thinking the Gemini key should go in `.env`, EAS secrets, or
`EXPO_PUBLIC_*`.

**Do instead:**

| Secret | Where |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | `.env` + EAS secrets (safe in the app) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env` + EAS secrets (safe in the app) |
| `GEMINI_API_KEY` | Supabase Dashboard → Edge Functions → Secrets **only** |

If Gemini is in the app bundle, anyone can steal it.

## 3. Quotes and spaces in `.env`

**Mistake:** `EXPO_PUBLIC_SUPABASE_ANON_KEY= 'eyJ...'` (space + quotes).
Expo then fails to load the key and the app falls into demo mode.

**Do instead:**

```
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...no-quotes
```

Copy from `.env.example`. No spaces around `=`.

## 4. Android crash: missing fonts / icons

**Mistake:** Using Ionicons / Expo fonts without `expo-font` in `app.json`
`plugins`. Preview APK crashed on launch.

**Do instead:** After adding icon fonts, run `npx expo-doctor`, keep
`expo-font` in plugins, and test a **preview APK**, not only web.

## 5. Demo backend constructed too early

**Mistake:** Creating the demo Supabase client above the `class DemoAuthClient`
definitions. Web demo crashed:
`Cannot access 'DemoAuthClient' before initialization`.

**Do instead:** Build `supabase` **after** those classes (see
`src/lib/supabase.ts`). Never use a class before it is defined.

## 6. Cloud Agent “kitchen” vs the app

**Mistake:** Putting `npx expo start` in `.cursor/environment.json` **`start`**.
`start` must **finish**. Expo never exits, so **Builds** go red.

**Do instead:**

- `install` = `npm ci` and copy `.env` — then stop.
- Expo web belongs in **`terminals`**, not `start`.
- Product work (screens, Play listing) stays on the **app branch**.
- `cursor/setup-dev-environment-*` is only the kitchen. Do not mix Play
  Store work into that branch.
- Environment Builds need a **real git repo** (Create repo). A temporary
  remote makes Builds say “repository not found”.

## 7. Play Store files you cannot “open” in chat

**Mistake:** Expecting `store/screenshots/*.png` on the Cloud Agent to open
like a file on the PC. They live on the agent machine.

**Do instead:** Open the store gallery preview, or copy files locally, or
upload from a clone of the repo. Paths in chat are not Downloads.

## 8. Privacy text vs a public URL

**Mistake:** Leaving `privacy@ahaarai.app` / “replace this email”, and
thinking `PRIVACY_POLICY.md` in Git is enough for Play.

**Do instead:**

- Real inbox (this project: `rihamhoque1@gmail.com`).
- Publish the policy as a **https URL**.
- Paste that URL in Play Console → App content.
- First listing said “no ads”. Adding ads later needs a **new version**,
  new Data safety answers, and an updated policy. Do not surprise users.

## 9. Android permissions

**Mistake:** Extra storage permissions (`READ_EXTERNAL_STORAGE`) that Play
flags. The app only needs camera + photos.

**Do instead:** Only declare what you use. Explain why in `app.json` plugin
copy. Deny paths must not crash (show a message, offer gallery vs camera).

## 10. `.apk` vs `.aab` vs keystore

**Mistake:** Treating a preview APK as a Play upload, or losing the
production keystore.

**Do instead:**

- Preview / tap on your phone → `.apk` (`build:android:preview`).
- Play Store → `.aab` (`build:android:production`).
- First production build: **Yes** to generate a keystore, then **save it**.
  Lose it → you cannot update `com.ahaarai.app`.
- Bump `android.versionCode` on **every** new Play upload.

## 11. Gemini model and timeouts

**Mistake:** Pinning a **retired** Gemini model / old SDK in
`analyze-meal`, and waiting forever on a hung call.

**Do instead:** Use a current model name from Google’s docs. Bound the
Edge Function with a timeout and a clear error (or demo fallback). Rate
limits must show as limits, not as a fake meal.

## 12. Figma and design APIs

**Mistake:** Depending on Figma MCP for every screen. Starter plans hit
**tool call limits**.

**Do instead:** Implement in Expo first. Use Figma when quota allows. Do
not block shipping on design-tool rate limits.

## 13. Timezones and “today”

**Mistake:** Grouping meals by UTC day so Dhaka users see the wrong
“today”. Using `Date.now()` inside Convex/query-style caches if you add
that later.

**Do instead:** Group `logged_at` in the user’s timezone (this app: Asia
Dhaka). Do not put `Date.now()` inside cached queries.

## Checklist before the next change

- [ ] Cursor: signed in; no custom key unless the model matches that key
- [ ] Gemini still **only** on the Edge Function
- [ ] `.env` has no quotes around the anon key
- [ ] `npx expo-doctor` and a device/APK smoke test if native changed
- [ ] Privacy URL + real email still match the in-app Privacy screen
- [ ] Play: versionCode bumped; AAB not APK; keystore backed up
- [ ] Ads still **off** until you ship a version that updates policy + Data safety
