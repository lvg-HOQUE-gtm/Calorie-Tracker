import { supabase } from "../lib/supabase";
import type { DayLogGroup, FoodLog, MacroTotals, MealAnalysis, MealItem, MealPhoto } from "../types";

const TABLE = "food_logs";

/** Raw shape of a `food_logs` row, matching `supabase/schema.sql`. */
interface FoodLogRow {
  id: string;
  user_id: string;
  dish_name: string;
  bengali_name: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  serving_description: string | null;
  confidence: number | null;
  items: MealItem[] | null;
  image_uri: string | null;
  image_path: string | null;
  notes: string | null;
  logged_at: string;
  created_at: string;
}

function rowToFoodLog(row: FoodLogRow): FoodLog {
  return {
    id: row.id,
    userId: row.user_id,
    dishName: row.dish_name,
    bengaliName: row.bengali_name,
    calories: row.calories,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    fiberG: row.fiber_g,
    servingDescription: row.serving_description,
    confidence: row.confidence,
    items: row.items ?? [],
    imageUri: row.image_uri,
    imagePath: row.image_path,
    notes: row.notes,
    loggedAt: row.logged_at,
    createdAt: row.created_at,
  };
}

/**
 * Persists an analyzed meal against a user. Called either right after a scan
 * (already-authenticated returning users) or immediately after the auth
 * gate upgrades an anonymous session to a permanent one, flushing the
 * pending meal that was held in memory during sign-up.
 */
export async function saveFoodLog(
  userId: string,
  analysis: MealAnalysis,
  photo: MealPhoto | null,
  notes?: string
): Promise<FoodLog> {
  const row = {
    user_id: userId,
    dish_name: analysis.dishName,
    bengali_name: analysis.bengaliName || null,
    calories: Math.round(analysis.totalCalories),
    protein_g: Math.round(analysis.proteinG),
    carbs_g: Math.round(analysis.carbsG),
    fat_g: Math.round(analysis.fatG),
    fiber_g: Math.round(analysis.fiberG),
    serving_description: analysis.servingDescription || null,
    confidence: analysis.confidence,
    items: analysis.items,
    image_uri: photo?.localUri ?? null,
    image_path: null,
    notes: notes ?? null,
    logged_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from(TABLE).insert(row).select().single();
  if (error) throw error;
  return rowToFoodLog(data as FoodLogRow);
}

/** Fetches logs for a user within an explicit ISO timestamp range, newest first. */
export async function getLogsInRange(
  userId: string,
  fromISO: string,
  toISO: string
): Promise<FoodLog[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .gte("logged_at", fromISO)
    .lte("logged_at", toISO)
    .order("logged_at", { ascending: false });

  if (error) throw error;
  return ((data as FoodLogRow[]) ?? []).map(rowToFoodLog);
}

/** Fetches the most recent logs for a user, newest first, for History/backfill views. */
export async function getRecentLogs(userId: string, limit = 200): Promise<FoodLog[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return ((data as FoodLogRow[]) ?? []).map(rowToFoodLog);
}

export function sumMacros(logs: FoodLog[]): MacroTotals {
  return logs.reduce<MacroTotals>(
    (totals, log) => ({
      calories: totals.calories + log.calories,
      proteinG: totals.proteinG + log.proteinG,
      carbsG: totals.carbsG + log.carbsG,
      fatG: totals.fatG + log.fatG,
      fiberG: totals.fiberG + log.fiberG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 }
  );
}

/**
 * Converts a stored (UTC) timestamp into a YYYY-MM-DD key in the *device's
 * local* timezone.
 *
 * Slicing the ISO string directly would give the UTC date, which disagrees
 * with the dashboard's notion of "today" (built from local midnight in
 * `getTodayRange`). In Bangladesh (UTC+6) that mismatch would file every
 * meal logged between midnight and 6am under the previous day.
 */
function dateKeyOf(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString.slice(0, 10);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(dateKey: string, todayKey: string): string {
  if (dateKey === todayKey) return "Today";
  const date = new Date(`${dateKey}T00:00:00`);
  const yesterday = new Date(`${todayKey}T00:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKey === dateKeyOf(yesterday.toISOString())) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

/** One vertical column in the Progress weekly calorie chart. */
export interface DailyCalorieColumn {
  dateKey: string;
  dayLabel: string;
  calories: number;
  percent: number;
  isToday: boolean;
}

/**
 * Builds one column per local calendar day for the Progress column chart.
 * `dayCount` must be at least 1. Days with no logs stay at 0 calories.
 */
export function buildDailyCalorieColumns(
  logs: FoodLog[],
  dayCount: number,
  calorieTarget: number,
  now: Date = new Date()
): DailyCalorieColumn[] {
  if (dayCount < 1) {
    throw new Error("dayCount must be at least 1");
  }
  if (calorieTarget < 0) {
    throw new Error("calorieTarget must be zero or greater");
  }

  const caloriesByDay = new Map<string, number>();
  for (const log of logs) {
    const key = dateKeyOf(log.loggedAt);
    caloriesByDay.set(key, (caloriesByDay.get(key) ?? 0) + log.calories);
  }

  const today = new Date(now);
  today.setHours(12, 0, 0, 0);
  const todayKey = dateKeyOf(today.toISOString());

  const columns: DailyCalorieColumn[] = [];
  for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    const dateKey = dateKeyOf(day.toISOString());
    const calories = caloriesByDay.get(dateKey) ?? 0;
    const percent =
      calorieTarget > 0 ? Math.round((calories / calorieTarget) * 100) : 0;
    columns.push({
      dateKey,
      dayLabel: day.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3),
      calories,
      percent,
      isToday: dateKey === todayKey,
    });
  }
  return columns;
}

/** Groups a reverse-chronological log list into per-day summaries for the History screen. */
export function groupLogsByDay(logs: FoodLog[], nowISO: string): DayLogGroup[] {
  const todayKey = dateKeyOf(nowISO);
  const groups = new Map<string, FoodLog[]>();

  for (const log of logs) {
    const key = dateKeyOf(log.loggedAt);
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(log);
    } else {
      groups.set(key, [log]);
    }
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([dateKey, dayLogs]) => ({
      dateKey,
      dateLabel: formatDateLabel(dateKey, todayKey),
      totals: sumMacros(dayLogs),
      logs: dayLogs,
    }));
}
