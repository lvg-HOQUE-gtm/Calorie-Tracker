# Ahaar AI Privacy Policy

_Last updated: 2026-09-06_

Ahaar AI ("the app") is a calorie and macro tracker for home-cooked
Bangladeshi meals. This policy explains what data the app collects, why,
and how you can delete it.

## Data we collect

| Data | Why | Where it lives |
| --- | --- | --- |
| Meal photo | Sent once to Google Gemini for calorie/macro recognition | **Never uploaded to our servers.** Resized on your device, sent directly to the `analyze-meal` server function for analysis, then discarded. A local copy stays only on your device. |
| Dish name, macros, serving size, notes | Populate your dashboard and history | Supabase Postgres (`food_logs` table), tied to your account |
| Daily calorie target | Personalize your dashboard goal | Supabase Postgres (`profiles` table), tied to your account |
| Email address | Sign-in / account recovery | Supabase Auth |
| Anonymous device identity | Let you scan a meal before creating an account | Supabase Auth (upgraded to your email if you sign up) |

We do not collect your location, contacts, or any device identifiers
beyond what Supabase Auth needs to keep you signed in.

## How your data is used

- Your meal photo is sent to Google's Gemini API (via our server) purely to
  extract a calorie/macro estimate. We do not store the photo on our
  servers, and Gemini does not use it to train models on our request.
- Your logged meals and calorie target are used only to show you your own
  dashboard and history. We do not sell, rent, or share this data with
  third parties, and we do not run ads or third-party analytics/tracking
  SDKs in the app.
- Anonymous sign-in exists so your very first scan can be saved before you
  decide to create an account. If you never sign up, your data is tied to
  that anonymous identity only.

## Where your data is stored

Nutrition data and your calorie target live in a Supabase (PostgreSQL)
database with row-level security, so only your own account can read or
write your rows. Photos are never uploaded to our storage; they stay in
the app's local storage on your device and can be removed by clearing app
data or uninstalling the app.

## Deleting your data

Open **Profile** in the app and tap **Delete account**. This permanently
removes your account and cascades to delete all of your food logs, your
calorie target, and your scan history. This cannot be undone. You can also
request deletion by emailing us at the address below.

Signing out (without deleting) keeps your data intact for the next time
you sign back in.

## Children's privacy

Ahaar AI is not directed at children under 13, and we do not knowingly
collect data from children under 13.

## Changes to this policy

If this policy changes, the "Last updated" date above will be revised. We
will not materially reduce your rights over previously collected data
without notice.

## Contact

Questions about this policy or your data: **rihamhoque1@gmail.com**
