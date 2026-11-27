import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { FoodLog } from "../types";
import { colors, radii, shadow, spacing, typography } from "../theme";
import { MealThumbnail } from "./MealThumbnail";

interface LogListItemProps {
  log: FoodLog;
  mealCategory?: "Breakfast" | "Lunch time" | "Dinner" | "Snack";
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/** Infers a FitBite-style meal badge from the log time. */
function inferMealCategory(iso: string): string {
  try {
    const hour = new Date(iso).getHours();
    if (hour >= 5 && hour < 11) return "Breakfast";
    if (hour >= 11 && hour < 16) return "Lunch time";
    if (hour >= 16 && hour < 22) return "Dinner";
    return "Snack";
  } catch {
    return "Meal";
  }
}

export function LogListItem({ log, mealCategory }: LogListItemProps) {
  const category = mealCategory ?? inferMealCategory(log.loggedAt);

  return (
    <View style={styles.card}>
      <View style={styles.leftCol}>
        <View style={styles.categoryRow}>
          <View style={styles.categoryDot} />
          <Text style={styles.categoryLabel}>{category}</Text>
          <Text style={styles.timeText}>{formatTime(log.loggedAt)}</Text>
        </View>

        <Text style={styles.dishName} numberOfLines={1}>
          {log.dishName}
        </Text>

        <View style={styles.caloriesRow}>
          <Ionicons name="flame" size={13} color={colors.flame} />
          <Text style={styles.caloriesText}>{log.calories} kcal</Text>
          <Text style={styles.dotSeparator}>•</Text>
          <Text style={styles.macroSummary}>
            🍗 {Math.round(log.proteinG)}g  🌾 {Math.round(log.carbsG)}g  🥑 {Math.round(log.fatG)}g
          </Text>
        </View>
      </View>

      <View style={styles.rightCol}>
        <MealThumbnail uri={log.imageUri} dishName={log.dishName} size={54} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadow.card,
  },
  leftCol: {
    flex: 1,
    justifyContent: "center",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 3,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryGreen,
  },
  categoryLabel: {
    ...typography.tiny,
    fontSize: 11,
    color: colors.primaryGreenDark,
    fontWeight: "700",
  },
  timeText: {
    ...typography.tiny,
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 4,
  },
  dishName: {
    ...typography.bodyStrong,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: "800",
  },
  caloriesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  caloriesText: {
    ...typography.captionStrong,
    color: colors.textPrimary,
    fontSize: 12,
  },
  dotSeparator: {
    color: colors.borderStrong,
    fontSize: 10,
  },
  macroSummary: {
    ...typography.tiny,
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  rightCol: {
    alignItems: "center",
    justifyContent: "center",
  },
});
