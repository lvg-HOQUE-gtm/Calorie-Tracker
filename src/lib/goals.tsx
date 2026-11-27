import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "./supabase";
import { useSession } from "./session";
import { DEFAULT_GOALS, type NutritionGoals } from "../types";

export const MIN_CALORIE_TARGET = 1000;
export const MAX_CALORIE_TARGET = 5000;
export const CALORIE_TARGET_STEP = 50;

interface ProfileRow {
  user_id: string;
  calorie_target: number;
  updated_at: string;
}

interface GoalsContextValue {
  goals: NutritionGoals;
  isLoading: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  saveCalorieTarget: (calories: number) => Promise<void>;
}

const GoalsContext = createContext<GoalsContextValue | undefined>(undefined);

export function clampCalorieTarget(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Calorie target must be a number");
  }
  const rounded = Math.round(value);
  if (rounded < MIN_CALORIE_TARGET || rounded > MAX_CALORIE_TARGET) {
    throw new Error(
      `Calorie target must be between ${MIN_CALORIE_TARGET} and ${MAX_CALORIE_TARGET}`
    );
  }
  return rounded;
}

export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useSession();
  const [calorieTarget, setCalorieTarget] = useState(DEFAULT_GOALS.calories);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("calorie_target")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const row = data as Pick<ProfileRow, "calorie_target"> | null;
      if (row && typeof row.calorie_target === "number") {
        setCalorieTarget(clampCalorieTarget(row.calorie_target));
      } else {
        setCalorieTarget(DEFAULT_GOALS.calories);
      }
    } catch (error) {
      setCalorieTarget(DEFAULT_GOALS.calories);
      setErrorMessage(
        error instanceof Error ? error.message : "Couldn't load your calorie target."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    if (!user?.id) {
      setCalorieTarget(DEFAULT_GOALS.calories);
      setIsLoading(false);
      return;
    }
    void loadProfile(user.id);
  }, [isReady, user?.id, loadProfile]);

  const saveCalorieTarget = useCallback(
    async (calories: number) => {
      if (!user?.id) {
        throw new Error("Not authenticated");
      }
      const next = clampCalorieTarget(calories);
      setIsSaving(true);
      setErrorMessage(null);
      try {
        const { error } = await supabase.from("profiles").upsert(
          {
            user_id: user.id,
            calorie_target: next,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
        if (error) {
          throw error;
        }
        setCalorieTarget(next);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Couldn't save your calorie target.";
        setErrorMessage(message);
        throw new Error(message);
      } finally {
        setIsSaving(false);
      }
    },
    [user?.id]
  );

  const value = useMemo<GoalsContextValue>(
    () => ({
      goals: {
        ...DEFAULT_GOALS,
        calories: calorieTarget,
      },
      isLoading,
      isSaving,
      errorMessage,
      saveCalorieTarget,
    }),
    [calorieTarget, isLoading, isSaving, errorMessage, saveCalorieTarget]
  );

  return <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>;
}

export function useGoals(): GoalsContextValue {
  const ctx = useContext(GoalsContext);
  if (!ctx) {
    throw new Error("useGoals must be used within a GoalsProvider");
  }
  return ctx;
}
