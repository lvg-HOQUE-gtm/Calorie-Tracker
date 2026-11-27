import { supabase } from "../lib/supabase";
import type { MealAnalysis, MealItem, MealPhoto } from "../types";

interface AnalyzeMealParams {
  photo: MealPhoto;
  contextText?: string;
}

/**
 * Raised when the server rejects a scan because the user hit their rate
 * limit. This is deliberately NOT swallowed into the demo fallback: showing
 * someone a fabricated meal analysis when they've actually been throttled
 * would be actively misleading.
 */
export class ScanLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScanLimitError";
  }
}

/** Pulls the 429 message out of a supabase-js FunctionsHttpError, if that's what this is. */
async function extractRateLimitMessage(error: unknown): Promise<string | null> {
  if (!error || typeof error !== "object" || !("context" in error)) return null;

  const context = (error as { context?: unknown }).context;
  if (!context || typeof context !== "object" || !("status" in context)) return null;
  if ((context as Response).status !== 429) return null;

  try {
    const body = (await (context as Response).json()) as { error?: string };
    return body?.error ?? "You've reached your scan limit. Please try again later.";
  } catch {
    return "You've reached your scan limit. Please try again later.";
  }
}

/**
 * Analyzes a meal photo via the `analyze-meal` Supabase Edge Function.
 *
 * The Gemini API key and the Bangladeshi-expert system prompt live only on
 * the server (see `supabase/functions/analyze-meal`); this client never
 * talks to Gemini directly and never holds a Gemini key. If the function is
 * unreachable, not yet deployed, or misconfigured (e.g. missing secret),
 * this falls back to a deterministic demo analysis so the onboarding ->
 * scan -> save flow stays fully demoable.
 */
export async function analyzeMeal({ photo, contextText }: AnalyzeMealParams): Promise<MealAnalysis> {
  try {
    const { data, error } = await supabase.functions.invoke("analyze-meal", {
      body: {
        imageBase64: photo.base64,
        mimeType: photo.mimeType,
        context: (contextText ?? "").trim().slice(0, 500),
      },
    });

    if (error) {
      const limitMessage = await extractRateLimitMessage(error);
      if (limitMessage) throw new ScanLimitError(limitMessage);
      throw error;
    }
    if (!data || typeof data !== "object") throw new Error("Empty response from analyze-meal");
    if ("error" in (data as Record<string, unknown>)) {
      throw new Error(String((data as Record<string, unknown>).error));
    }

    return mapEdgeResponse(data as Record<string, unknown>);
  } catch (error) {
    // A throttled user must see the real reason, not a fabricated meal.
    if (error instanceof ScanLimitError) throw error;

    // eslint-disable-next-line no-console
    console.warn(
      "[Ahaar AI] analyze-meal is unavailable, falling back to a demo analysis:",
      error instanceof Error ? error.message : error
    );
    return getDemoMealAnalysis(contextText);
  }
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toStringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function mapEdgeResponse(data: Record<string, unknown>): MealAnalysis {
  const rawItems = Array.isArray(data.items) ? data.items : [];
  const items: MealItem[] = rawItems.map((raw) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    return {
      name: toStringOrEmpty(item.name) || "Unidentified item",
      bengaliName: toStringOrEmpty(item.bengaliName) || undefined,
      quantity: toStringOrEmpty(item.quantity) || "1 serving",
      calories: toNumber(item.calories),
      proteinG: toNumber(item.proteinG),
      carbsG: toNumber(item.carbsG),
      fatG: toNumber(item.fatG),
    };
  });

  return {
    dishName: toStringOrEmpty(data.dishName) || "Unrecognized meal",
    bengaliName: toStringOrEmpty(data.bengaliName),
    servingDescription: toStringOrEmpty(data.servingDescription) || "1 plate",
    totalCalories: toNumber(data.totalCalories),
    proteinG: toNumber(data.proteinG),
    carbsG: toNumber(data.carbsG),
    fatG: toNumber(data.fatG),
    fiberG: toNumber(data.fiberG),
    confidence: toNumber(data.confidence, 0.5),
    items,
    healthNote: toStringOrEmpty(data.healthNote),
  };
}

/**
 * A deterministic, illustrative Bangladeshi meal used whenever the real
 * Gemini pipeline can't be reached. Chosen to look convincingly real in the
 * UI (a common home-cooked plate) rather than an obviously fake placeholder.
 */
function getDemoMealAnalysis(contextText?: string): MealAnalysis {
  const trimmedContext = contextText?.trim();
  return {
    dishName: "Beef Tehari with Dal & Begun Bhaji",
    bengaliName: "Gorur Tehari, Dal, Begun Bhaji",
    servingDescription: "1 plate tehari, 1 bati dal, 1 bati begun bhaji",
    totalCalories: 780,
    proteinG: 34,
    carbsG: 92,
    fatG: 28,
    fiberG: 6,
    confidence: 0.5,
    items: [
      {
        name: "Beef tehari",
        bengaliName: "Gorur tehari",
        quantity: "1 plate (~1.5 cups rice + beef)",
        calories: 560,
        proteinG: 26,
        carbsG: 70,
        fatG: 20,
      },
      {
        name: "Masoor dal",
        bengaliName: "Masoor dal",
        quantity: "1 bati",
        calories: 130,
        proteinG: 7,
        carbsG: 18,
        fatG: 4,
      },
      {
        name: "Begun bhaji",
        bengaliName: "Begun bhaji",
        quantity: "1 bati",
        calories: 90,
        proteinG: 1,
        carbsG: 4,
        fatG: 4,
      },
    ],
    healthNote: trimmedContext
      ? `Demo estimate (analysis service unavailable). Noted context: "${trimmedContext}".`
      : "Demo estimate shown because the analyze-meal service is unavailable right now.",
    isDemo: true,
  };
}
