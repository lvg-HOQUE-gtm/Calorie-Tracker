import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "../theme";

interface DayItem {
  dayName: string; // "S", "M", "T", etc.
  dateNum: number; // 07, 08, etc.
  fullDateISO: string; // "YYYY-MM-DD"
  isToday: boolean;
  hasLogs?: boolean;
}

interface WeeklyDateStripProps {
  days: DayItem[];
  selectedDateISO: string;
  onSelectDate: (iso: string) => void;
  monthYearLabel?: string;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
}

/**
 * FitBite-styled Weekly Date Selector Strip with Month Header & circular date badges.
 */
export function WeeklyDateStrip({
  days,
  selectedDateISO,
  onSelectDate,
  monthYearLabel,
}: WeeklyDateStripProps) {
  return (
    <View style={styles.card}>
      {monthYearLabel ? (
        <View style={styles.monthHeaderRow}>
          <Text style={styles.monthYearText}>{monthYearLabel}</Text>
          <View style={styles.arrowsRow}>
            <View style={styles.arrowCircle}>
              <Text style={styles.arrowText}>‹</Text>
            </View>
            <View style={styles.arrowCircle}>
              <Text style={styles.arrowText}>›</Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.stripRow}>
        {days.map((item) => {
          const isSelected = item.fullDateISO === selectedDateISO;

          return (
            <Pressable
              key={item.fullDateISO}
              onPress={() => onSelectDate(item.fullDateISO)}
              style={[
                styles.dayColumn,
                isSelected && styles.dayColumnSelected,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${item.dayName} ${item.dateNum}`}
            >
              <Text
                style={[
                  styles.dayName,
                  isSelected && styles.dayNameSelected,
                  item.isToday && !isSelected && styles.dayNameToday,
                ]}
              >
                {item.dayName}
              </Text>

              <View
                style={[
                  styles.dateCircle,
                  isSelected && styles.dateCircleSelected,
                  item.isToday && !isSelected && styles.dateCircleToday,
                  item.hasLogs && !isSelected && !item.isToday && styles.dateCircleHasLogs,
                ]}
              >
                <Text
                  style={[
                    styles.dateNum,
                    isSelected && styles.dateNumSelected,
                    item.isToday && !isSelected && styles.dateNumToday,
                  ]}
                >
                  {String(item.dateNum).padStart(2, "0")}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Generates the current week (Sun - Sat) around a reference date. */
export function getCurrentWeekDays(referenceDate = new Date()): DayItem[] {
  const current = new Date(referenceDate);
  const currentDayOfWeek = current.getDay(); // 0 = Sun, 6 = Sat
  const sunday = new Date(current);
  sunday.setDate(current.getDate() - currentDayOfWeek);

  const todayYear = current.getFullYear();
  const todayMonth = String(current.getMonth() + 1).padStart(2, "0");
  const todayDay = String(current.getDate()).padStart(2, "0");
  const todayISO = `${todayYear}-${todayMonth}-${todayDay}`;

  const days: DayItem[] = [];
  const dayNames = ["S", "M", "T", "W", "T", "F", "S"];

  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const fullDateISO = `${year}-${month}-${day}`;

    days.push({
      dayName: dayNames[i] ?? "",
      dateNum: d.getDate(),
      fullDateISO,
      isToday: fullDateISO === todayISO,
    });
  }

  return days;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.sm,
  },
  monthHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    marginBottom: 2,
  },
  monthYearText: {
    ...typography.bodyStrong,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: "800",
  },
  arrowsRow: {
    flexDirection: "row",
    gap: 6,
  },
  arrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "700",
    lineHeight: 16,
  },
  stripRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayColumn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
  },
  dayColumnSelected: {
    backgroundColor: colors.greenSoft,
  },
  dayName: {
    ...typography.tiny,
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
    fontWeight: "600",
  },
  dayNameToday: {
    color: colors.primaryGreenDark,
    fontWeight: "800",
  },
  dayNameSelected: {
    color: colors.primaryGreenDark,
    fontWeight: "800",
  },
  dateCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  dateCircleToday: {
    backgroundColor: colors.greenSoft,
    borderWidth: 1.5,
    borderColor: colors.primaryGreen,
  },
  dateCircleSelected: {
    backgroundColor: colors.primaryGreen,
  },
  dateCircleHasLogs: {
    borderWidth: 1.5,
    borderColor: colors.greenHeroCardBorder,
  },
  dateNum: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  dateNumToday: {
    color: colors.primaryGreenDark,
    fontWeight: "800",
  },
  dateNumSelected: {
    color: colors.white,
    fontWeight: "800",
  },
});
