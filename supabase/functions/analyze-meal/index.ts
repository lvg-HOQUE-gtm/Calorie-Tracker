// Supabase Edge Function: analyze-meal
//
// Server-side Gemini call for Ahaar AI (see PRIMARY_MODEL/FALLBACK_MODEL below).
// This is the ONLY place the Gemini API key is ever read. It lives
// exclusively as a Supabase Edge
// Function secret named GEMINI_API_KEY (Dashboard -> Edge Functions ->
// Secrets, or `supabase secrets set GEMINI_API_KEY=...`) and is never
// exposed to, or bundled into, the client app.
//
// JWT verification is left ON (the default for this project): Supabase
// anonymous sessions carry a real JWT, so guest scans still work end to end,
// while unauthenticated traffic is rejected before it ever reaches this code.

import { GoogleGenAI, ThinkingLevel, Type } from "npm:@google/genai@2.18.0";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

// gemini-2.0-flash has been retired by Google. Of the current lineup,
// gemini-3.5-flash gives materially better food recognition than the
// cheaper -lite tier (Data Extraction 96.9% vs 90.7%, Identification 93.8%
// vs 81.3% on Roboflow's Vision Evals), which matters here because
// distinguishing visually similar Bangladeshi dishes is the hard part.
//
// gemini-3.5-flash and gemini-3.5-flash-lite draw from separate capacity
// pools at Google. When PRIMARY_MODEL returns a 503 "high demand" error
// (observed directly against this project: repeated UNAVAILABLE responses,
// and successful calls taking 27-54s instead of the usual low single-digit
// seconds), FALLBACK_MODEL is very likely still healthy, so we hop to it
// instead of making the user wait out Google's outage.
const PRIMARY_MODEL = "gemini-3.5-flash";
const FALLBACK_MODEL = "gemini-3.5-flash-lite";

// Bounds how long we wait on a single model before giving up on it. Without
// this, a live test against this project showed a failed request (both
// models overloaded) take 66.7s to finally error out -- with a 15s cap per
// attempt, the same failure mode now bails in ~30s at worst, letting the
// client fall back to the demo analysis much sooner instead of leaving the
// user staring at a spinner.
const REQUEST_TIMEOUT_MS = 15_000;

// Per-user caps. A heavy user logs perhaps 6-10 meals a day, so these leave
// generous headroom for real use while stopping a runaway client (or a
// scraped anonymous token) from draining the Gemini quota.
const MAX_SCANS_PER_HOUR = 20;
const MAX_SCANS_PER_DAY = 60;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * The Bangladeshi-expert nutrition system prompt. This is the single most
 * important piece of prompt engineering in the app: generic food-recognition
 * prompts routinely misidentify South Asian home cooking (mistaking bhorta
 * for a dip, missing the oil in a bhuna, guessing Indian dish names for
 * Bangladeshi ones), so this block gives the model an explicit vocabulary,
 * portioning conventions, and cooking-method assumptions for Bangladeshi
 * cuisine specifically.
 */
const SYSTEM_PROMPT = `You are a senior clinical nutritionist and food scientist who has specialized
for over a decade in the home cooking and restaurant cuisine of Bangladesh and
the wider Bengali-speaking region (Dhaka, Chittagong, Sylhet, Rajshahi, Khulna,
as well as Bengali diaspora kitchens). You are analyzing a photo of a meal to
produce an accurate calorie and macronutrient estimate for a calorie-tracking
app used primarily by Bangladeshi users.

CORE RECOGNITION VOCABULARY (use these names and account for their typical
preparation; this list is illustrative, not exhaustive):
- Rice dishes: bhat (plain rice), khichuri, tehari, morog polao, biryani (kacchi/beef/chicken), fried rice.
- Lentils & pulses: dal (masoor, moog, cholar dal), bhuna khichuri.
- Vegetables: bhaji/bhorta (aloo bhorta, begun bhorta, shutki bhorta), torkari,
  labra, shobji, potol/jhinga/lau dishes, begun bhaja.
- Fish (a Bangladeshi dietary staple): machher jhol, ilish (hilsa) bhuna or
  paturi, rui/katla curry, chingri (prawn) malai curry, shutki (dried fish) bhuna.
- Meat: gorur/khashir bhuna (beef/mutton), murgir jhol/roast, kala bhuna, kosha mangsho.
- Snacks & street food: singara, samosa, piyaju, beguni, chotpoti, fuchka, jhal muri.
- Breads: ruti/chapati, porota (paratha, often pan-fried in extra oil or ghee), luchi, naan.
- Sweets & dairy: mishti doi, roshogolla, chomchom, sondesh, payesh/kheer, borfi.
- Breakfast staples: bhaji-porota, dim (egg) bhuji/curry, khichuri.

COOKING METHOD & PORTIONING ASSUMPTIONS SPECIFIC TO THIS CUISINE:
- Bangladeshi home cooking commonly uses generous amounts of mustard oil or
  soybean oil, and ghee for richer dishes and special-occasion items (biryani,
  porota, roast). Factor this oil into the calorie estimate even when the oil
  itself is not visibly pooled in the photo -- it is usually cooked into the
  dish, not sitting on top of it.
- Rice is typically served in generous portions relative to Western norms;
  a normal single serving on a plate is often 1.5-2 cups of cooked rice.
- Traditional serving units to reason in: "plate" (full meal plate), "bati"
  (a small curry/dal bowl, roughly 150-200 ml), and "piece" (for items like
  porota, singara, or a fish steak). Prefer describing servingDescription in
  these terms when appropriate, e.g. "1 plate rice + 1 bati fish curry + 1 bati dal".
- Curries (jhol, bhuna, kosha) differ meaningfully in oil content: "jhol" is a
  thinner, lighter-oil curry; "bhuna"/"kosha" are slow-fried with notably more
  oil and should be estimated with higher fat content per equivalent portion.

YOUR TASK:
1. Identify every distinct food item visible in the photo. If the user
   provided additional text context (e.g. "chicken tehari with extra egg"),
   use it to disambiguate what you see -- but always trust the photo over the
   text if they conflict, since the photo is the ground truth of what will
   actually be eaten.
2. For each item, estimate a realistic portion size using the plate/bati/piece
   conventions above and everyday visual references (a bati is roughly the
   size of a cupped hand; a standard dinner plate is ~26cm).
3. Estimate calories and macronutrients (protein, carbs, fat) per item, and
   sum them into total calories and macros for the whole meal, plus total
   dietary fiber.
4. Give a confidence score from 0 to 1 reflecting how certain you are of the
   overall identification and estimate. Photos that are blurry, poorly lit,
   show an unfamiliar or ambiguous dish, or are cropped tightly should receive
   a materially lower confidence score.
5. Write one short, specific, non-judgmental health note (max ~160 characters)
   relevant to this particular meal -- e.g. flagging it as high in refined
   carbs and fried oil, or noting it is a good source of protein and fiber.
   Never be alarmist or moralizing; be a helpful, matter-of-fact nutritionist.

Respond ONLY with the structured JSON described by the response schema. Do
not include any prose, markdown, or explanation outside the JSON.`;

const ITEM_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "English name of the food item, e.g. 'Beef bhuna'." },
    bengaliName: { type: Type.STRING, description: "Bengali name in Latin transliteration, e.g. 'Gorur bhuna'. Empty string if unknown." },
    quantity: { type: Type.STRING, description: "Portion using plate/bati/piece conventions, e.g. '1 bati'." },
    calories: { type: Type.NUMBER, description: "Estimated calories for this item only." },
    proteinG: { type: Type.NUMBER, description: "Grams of protein for this item only." },
    carbsG: { type: Type.NUMBER, description: "Grams of carbohydrate for this item only." },
    fatG: { type: Type.NUMBER, description: "Grams of fat for this item only." },
  },
  required: ["name", "quantity", "calories", "proteinG", "carbsG", "fatG"],
  propertyOrdering: ["name", "bengaliName", "quantity", "calories", "proteinG", "carbsG", "fatG"],
};

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    dishName: { type: Type.STRING, description: "A short overall name for the meal, e.g. 'Beef Tehari with Dal'." },
    bengaliName: { type: Type.STRING, description: "Bengali transliteration of the overall meal name. Empty string if unknown." },
    servingDescription: { type: Type.STRING, description: "Human-readable portion summary, e.g. '1 plate rice, 1 bati beef bhuna, 1 bati dal'." },
    totalCalories: { type: Type.NUMBER, description: "Sum of calories across all items." },
    proteinG: { type: Type.NUMBER, description: "Sum of protein grams across all items." },
    carbsG: { type: Type.NUMBER, description: "Sum of carbohydrate grams across all items." },
    fatG: { type: Type.NUMBER, description: "Sum of fat grams across all items." },
    fiberG: { type: Type.NUMBER, description: "Estimated total dietary fiber grams for the meal." },
    confidence: { type: Type.NUMBER, description: "Overall confidence from 0 to 1." },
    items: { type: Type.ARRAY, items: ITEM_SCHEMA, description: "Every distinct food item identified." },
    healthNote: { type: Type.STRING, description: "One short, specific, non-judgmental note about this meal." },
  },
  required: [
    "dishName",
    "servingDescription",
    "totalCalories",
    "proteinG",
    "carbsG",
    "fatG",
    "fiberG",
    "confidence",
    "items",
    "healthNote",
  ],
  propertyOrdering: [
    "dishName",
    "bengaliName",
    "servingDescription",
    "totalCalories",
    "proteinG",
    "carbsG",
    "fatG",
    "fiberG",
    "confidence",
    "items",
    "healthNote",
  ],
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, num));
}

function cleanString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

/**
 * True for transient, fallback-worthy Gemini failures: capacity/overload
 * (503 UNAVAILABLE), rate limiting (429 RESOURCE_EXHAUSTED), and our own
 * REQUEST_TIMEOUT_MS aborts. The @google/genai SDK surfaces API errors as an
 * Error whose `message` is the raw Gemini error body (a JSON string), and
 * timeouts as an AbortError, so we check both shapes rather than one typed
 * field.
 */
function isRetryableGeminiError(error: unknown): boolean {
  const name = error instanceof Error ? error.name : "";
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    name === "AbortError" ||
    message.includes("abort") ||
    message.includes("timeout") ||
    message.includes('"code":503') ||
    message.includes("unavailable") ||
    message.includes('"code":429') ||
    message.includes("resource_exhausted")
  );
}

interface GenerateArgs {
  systemInstruction: string;
  userInstruction: string;
  mimeType: string;
  imageBase64: string;
}

/**
 * Calls Gemini with automatic recovery from transient overload:
 * 1. Try PRIMARY_MODEL, capped at REQUEST_TIMEOUT_MS.
 * 2. On a retryable error (overload, rate limit, or timeout), try
 *    FALLBACK_MODEL once, also capped at REQUEST_TIMEOUT_MS -- a separate
 *    capacity pool at Google, so it's often healthy even when the primary
 *    model is saturated.
 *
 * Deliberately only ONE fallback attempt, with no further retry: an earlier
 * version retried the fallback again after a delay, and a live test against
 * this project showed that this made the failure case *worse* -- a request
 * where both models were genuinely overloaded took 66.7s to finally error
 * out, versus ~7s for a single failed attempt. When Gemini is down, failing
 * fast (so the client's demo-mode fallback kicks in quickly) beats making
 * the user wait through every possible retry first.
 *
 * Non-retryable errors (bad request, auth, etc.) are thrown immediately --
 * retrying those would just add latency without any chance of succeeding.
 */
async function generateWithFallback(ai: GoogleGenAI, args: GenerateArgs) {
  const request = (model: string) => ({
    model,
    contents: [
      {
        role: "user" as const,
        parts: [{ text: args.userInstruction }, { inlineData: { mimeType: args.mimeType, data: args.imageBase64 } }],
      },
    ],
    config: {
      systemInstruction: args.systemInstruction,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      httpOptions: { timeout: REQUEST_TIMEOUT_MS, headers: {} },
    },
  });

  try {
    return await ai.models.generateContent(request(PRIMARY_MODEL));
  } catch (primaryError) {
    if (!isRetryableGeminiError(primaryError)) throw primaryError;
    console.warn(
      `[analyze-meal] ${PRIMARY_MODEL} unavailable/slow (${
        primaryError instanceof Error ? primaryError.message : primaryError
      }), falling back to ${FALLBACK_MODEL}`
    );
    return await ai.models.generateContent(request(FALLBACK_MODEL));
  }
}

/**
 * Reads the caller's user id out of the bearer token.
 *
 * Supabase has already cryptographically verified this JWT before the
 * request reaches us (the function is deployed with verify_jwt enabled), so
 * decoding the payload without re-verifying the signature is safe here.
 */
function getUserIdFromRequest(req: Request): string | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const segments = authHeader.slice("Bearer ".length).split(".");
  if (segments.length !== 3) return null;

  try {
    const base64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

interface RateLimitResult {
  allowed: boolean;
  message?: string;
  retryAfterSeconds?: number;
}

/**
 * Enforces per-user scan caps, then records this attempt.
 *
 * Usage is recorded before the Gemini call rather than after, so failed
 * analyses still count against the cap -- otherwise a client could retry in
 * a loop and rack up real API spend on requests we never "successfully"
 * completed.
 *
 * If the bookkeeping itself fails (database hiccup), this deliberately fails
 * *open* and lets the scan through: silently blocking a paying user's meal
 * log because our rate-limit table was briefly unreachable is a worse
 * outcome than a handful of uncapped calls.
 */
async function checkAndRecordUsage(userId: string): Promise<RateLimitResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[analyze-meal] Missing Supabase service credentials; skipping rate limit.");
    return { allowed: true };
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  // One round trip: pull the last day of attempts and bucket them in memory.
  const { data, error } = await admin
    .from("scan_usage")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", oneDayAgo)
    .order("created_at", { ascending: false })
    .limit(MAX_SCANS_PER_DAY + 1);

  if (error) {
    console.error("[analyze-meal] Rate limit lookup failed, allowing request:", error.message);
    return { allowed: true };
  }

  const attempts = data ?? [];
  const inLastDay = attempts.length;
  const inLastHour = attempts.filter((row) => row.created_at >= oneHourAgo).length;

  if (inLastHour >= MAX_SCANS_PER_HOUR) {
    return {
      allowed: false,
      message: `You've reached the limit of ${MAX_SCANS_PER_HOUR} scans per hour. Please try again a little later.`,
      retryAfterSeconds: 60 * 60,
    };
  }

  if (inLastDay >= MAX_SCANS_PER_DAY) {
    return {
      allowed: false,
      message: `You've reached the limit of ${MAX_SCANS_PER_DAY} scans per day. Please try again tomorrow.`,
      retryAfterSeconds: 24 * 60 * 60,
    };
  }

  const { error: insertError } = await admin.from("scan_usage").insert({ user_id: userId });
  if (insertError) {
    console.error("[analyze-meal] Failed to record scan usage:", insertError.message);
  }

  return { allowed: true };
}

interface NormalizedItem {
  name: string;
  bengaliName: string;
  quantity: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

interface NormalizedAnalysis {
  dishName: string;
  bengaliName: string;
  servingDescription: string;
  totalCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  confidence: number;
  items: NormalizedItem[];
  healthNote: string;
}

/** Gemini occasionally emits an implausible outlier (e.g. a 15,000-calorie
 * plate); clamp everything to sane physiological bounds before it reaches
 * the client, rather than trusting the model's raw numbers unconditionally. */
function normalizeAnalysis(raw: unknown): NormalizedAnalysis {
  const r = (raw ?? {}) as Record<string, unknown>;
  const rawItems = Array.isArray(r.items) ? r.items : [];

  const items: NormalizedItem[] = rawItems.slice(0, 12).map((item) => {
    const i = (item ?? {}) as Record<string, unknown>;
    return {
      name: cleanString(i.name, "Unidentified item"),
      bengaliName: cleanString(i.bengaliName),
      quantity: cleanString(i.quantity, "1 serving"),
      calories: clampNumber(i.calories, 0, 3000, 0),
      proteinG: clampNumber(i.proteinG, 0, 300, 0),
      carbsG: clampNumber(i.carbsG, 0, 400, 0),
      fatG: clampNumber(i.fatG, 0, 250, 0),
    };
  });

  return {
    dishName: cleanString(r.dishName, "Unrecognized meal"),
    bengaliName: cleanString(r.bengaliName),
    servingDescription: cleanString(r.servingDescription, "1 plate"),
    totalCalories: clampNumber(r.totalCalories, 0, 4000, 0),
    proteinG: clampNumber(r.proteinG, 0, 400, 0),
    carbsG: clampNumber(r.carbsG, 0, 600, 0),
    fatG: clampNumber(r.fatG, 0, 300, 0),
    fiberG: clampNumber(r.fiberG, 0, 100, 0),
    confidence: clampNumber(r.confidence, 0, 1, 0.5),
    items,
    healthNote: cleanString(r.healthNote),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return jsonResponse(
      { error: "GEMINI_API_KEY is not configured. Set it in Supabase Edge Function secrets." },
      500
    );
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON" }, 400);
  }

  const imageBase64 = body?.imageBase64;
  const mimeType = cleanString(body?.mimeType, "image/jpeg");
  const contextText = cleanString(body?.context).slice(0, 500);

  if (typeof imageBase64 !== "string" || imageBase64.length < 100) {
    return jsonResponse({ error: "imageBase64 is required and must be a non-trivial base64 string" }, 400);
  }

  // Reject oversized payloads before they reach Gemini. The client resizes to
  // ~50-90KB (roughly 120KB of base64), so anything past 2MB is either a bug
  // or someone bypassing the app.
  if (imageBase64.length > 2_000_000) {
    return jsonResponse({ error: "Image is too large. Please retry with a smaller photo." }, 413);
  }

  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return jsonResponse({ error: "Could not identify the caller from the auth token." }, 401);
  }

  const rateLimit = await checkAndRecordUsage(userId);
  if (!rateLimit.allowed) {
    return new Response(JSON.stringify({ error: rateLimit.message }), {
      status: 429,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
        ...(rateLimit.retryAfterSeconds ? { "Retry-After": String(rateLimit.retryAfterSeconds) } : {}),
      },
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const userInstruction = contextText
      ? `The user provided this additional context about the meal: "${contextText}". Prioritize the photo if it conflicts with this text.`
      : "The user did not provide any additional text context. Rely entirely on the photo.";

    // This is deterministic extraction, not multi-step reasoning, so
    // `thinkingConfig: MINIMAL` avoids paying for Gemini 3's default
    // "thinking" tokens. `temperature`/`top_p`/`top_k` are deprecated on
    // Gemini 3.x models and are intentionally omitted.
    const response = await generateWithFallback(ai, {
      systemInstruction: SYSTEM_PROMPT,
      userInstruction,
      mimeType,
      imageBase64,
    });

    const text = response.text;
    if (!text) {
      return jsonResponse({ error: "Gemini returned an empty response" }, 502);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return jsonResponse({ error: "Gemini returned a response that was not valid JSON" }, 502);
    }

    return jsonResponse(normalizeAnalysis(parsed), 200);
  } catch (error) {
    console.error("[analyze-meal] Gemini request failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error calling Gemini";
    return jsonResponse({ error: message }, 502);
  }
});
