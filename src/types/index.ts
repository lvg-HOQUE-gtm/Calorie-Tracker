/**
 * Shared domain types for Ahaar AI.
 */

/** A single recognizable food item detected within a scanned meal. */
export interface MealItem {
  name: string;
  bengaliName?: string;
  quantity: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** Structured macro breakdown returned by the meal analysis pipeline. */
export interface MealAnalysis {
  dishName: string;
  bengaliName: string;
  servingDescription: string;
  totalCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  /** 0-1 model confidence in the recognition. */
  confidence: number;
  items: MealItem[];
  healthNote: string;
  /** True when this came from the offline/demo fallback rather than Gemini. */
  isDemo?: boolean;
}

/** A processed, on-device meal photo ready to persist and/or analyze. */
export interface MealPhoto {
  /** Stable local file:// URI under the app's document directory. */
  localUri: string;
  base64: string;
  mimeType: "image/jpeg" | "image/webp";
  width: number;
  height: number;
  bytes: number;
}

/** A saved food log row, mirroring the `food_logs` Postgres table. */
export interface FoodLog {
  id: string;
  userId: string;
  dishName: string;
  bengaliName: string | null;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  servingDescription: string | null;
  confidence: number | null;
  items: MealItem[];
  /** On-device path to the meal photo, if the file still exists locally. */
  imageUri: string | null;
  /** Reserved for optional future cloud photo backup. Unused today. */
  imagePath: string | null;
  notes: string | null;
  loggedAt: string;
  createdAt: string;
}

/** Aggregate macro totals, used for both a single log and a running day sum. */
export interface MacroTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

/** Daily nutrition targets shown against the dashboard ring/gauges. */
export interface NutritionGoals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export const DEFAULT_GOALS: NutritionGoals = {
  calories: 2200,
  proteinG: 110,
  carbsG: 260,
  fatG: 75,
};

/** Logs for a single calendar day, grouped for the History screen. */
export interface DayLogGroup {
  dateKey: string;
  dateLabel: string;
  totals: MacroTotals;
  logs: FoodLog[];
}
