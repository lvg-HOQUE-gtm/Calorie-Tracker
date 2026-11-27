import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { DailyCalorieColumn } from "../services/logs";
import { colors, radii, typography } from "../theme";

interface WeeklyColumnChartProps {
  columns: DailyCalorieColumn[];
  emptyLabel?: string;
}

const MAX_BAR_HEIGHT = 128;
const SCALE_PERCENT = 110;

/**
 * Vertical column chart for weekly calorie progress.
 * Replaces the old circular / pie-style progress gauge.
 */
export function WeeklyColumnChart({
  columns,
  emptyLabel = "No meals logged this week",
}: WeeklyColumnChartProps) {
  if (columns.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>{emptyLabel}</Text>
      </View>
    );
  }

  const hasAnyCalories = columns.some((column) => column.calories > 0);

  return (
    <View style={styles.chartRow} accessibilityRole="summary">
      {columns.map((column) => {
        const rawHeight = (column.percent / SCALE_PERCENT) * MAX_BAR_HEIGHT;
        const barHeight =
          column.calories > 0
            ? Math.min(Math.max(rawHeight, 18), MAX_BAR_HEIGHT)
            : 8;
        const reachedTarget = column.percent >= 100;

        return (
          <View key={column.dateKey} style={styles.column}>
            <Text
              style={[
                styles.topLabel,
                column.isToday && styles.topLabelToday,
                reachedTarget && styles.topLabelTarget,
              ]}
            >
              {column.calories > 0 ? Math.round(column.calories) : "—"}
            </Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { height: barHeight },
                  reachedTarget
                    ? styles.fillTarget
                    : column.isToday
                      ? styles.fillToday
                      : column.calories > 0
                        ? styles.fillNormal
                        : styles.fillEmpty,
                ]}
              />
            </View>
            <Text style={[styles.dayLabel, column.isToday && styles.dayLabelToday]}>
              {column.dayLabel}
            </Text>
          </View>
        );
      })}
      {!hasAnyCalories ? (
        <View style={styles.overlayHint} pointerEvents="none">
          <Text style={styles.emptyText}>{emptyLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chartRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 178,
    paddingTop: 4,
    position: "relative",
  },
  column: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
    gap: 6,
  },
  topLabel: {
    ...typography.tiny,
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: "600",
  },
  topLabelToday: {
    color: colors.primaryGreenDark,
    fontWeight: "800",
  },
  topLabelTarget: {
    color: colors.primaryGreenDark,
    fontWeight: "800",
  },
  track: {
    width: 22,
    height: MAX_BAR_HEIGHT,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.pill,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  fill: {
    width: "100%",
    borderRadius: radii.pill,
  },
  fillNormal: {
    backgroundColor: colors.greenHeroCardBorder,
  },
  fillToday: {
    backgroundColor: colors.primaryGreen,
  },
  fillTarget: {
    backgroundColor: colors.primaryGreenDark,
  },
  fillEmpty: {
    backgroundColor: colors.border,
  },
  dayLabel: {
    ...typography.tiny,
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600",
  },
  dayLabelToday: {
    color: colors.primaryGreenDark,
    fontWeight: "800",
  },
  emptyWrap: {
    height: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  overlayHint: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
  },
});
