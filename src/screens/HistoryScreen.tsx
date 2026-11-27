import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import {
  BottomTabBar,
  EmptyState,
  GlassCard,
  LogListItem,
  WeeklyColumnChart,
  type TabKey,
} from "../components";
import { useGoals } from "../lib/goals";
import { useSession } from "../lib/session";
import { buildDailyCalorieColumns, getRecentLogs, groupLogsByDay } from "../services/logs";
import { colors, radii, shadow, spacing, typography } from "../theme";
import { type DayLogGroup, type FoodLog } from "../types";
import type { HistoryScreenProps } from "../navigation/types";

type TimeRange = "7D" | "30D" | "90D" | "ALL";

export function HistoryScreen({ navigation }: HistoryScreenProps) {
  const { session } = useSession();
  const { goals } = useGoals();
  const userId = session?.user.id ?? null;

  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("7D");

  const loadHistory = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const recent = await getRecentLogs(userId, 200);
      setLogs(recent);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Couldn't load your progress history."
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory])
  );

  const filteredLogs = useMemo(() => {
    if (timeRange === "ALL") return logs;
    const dayCount = timeRange === "7D" ? 7 : timeRange === "30D" ? 30 : 90;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (dayCount - 1));
    const startMs = start.getTime();
    return logs.filter((log) => new Date(log.loggedAt).getTime() >= startMs);
  }, [logs, timeRange]);

  const dayGroups = useMemo(() => {
    return groupLogsByDay(filteredLogs, new Date().toISOString());
  }, [filteredLogs]);

  const weekColumns = useMemo(() => {
    return buildDailyCalorieColumns(logs, 7, goals.calories);
  }, [logs, goals.calories]);

  const todayCalories = useMemo(() => {
    const todayColumn = weekColumns.find((column) => column.isToday);
    return todayColumn?.calories ?? 0;
  }, [weekColumns]);

  const streakDays = useMemo(() => {
    const allGroups = groupLogsByDay(logs, new Date().toISOString());
    return Math.max(allGroups.length, 1);
  }, [logs]);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Title */}
          <View style={styles.headerRow}>
            <Text style={styles.screenTitle}>Statistic & Progress</Text>
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          {/* Top 2 Cards Row: Target & Day Streak */}
          <View style={styles.topCardsRow}>
            {/* Calorie Target Card */}
            <View style={styles.metricCard}>
              <Text style={styles.metricCardLabel}>Calorie Target</Text>
              <Text style={styles.metricCardValue}>
                {goals.calories.toLocaleString()}{" "}
                <Text style={styles.unitText}>kcal</Text>
              </Text>
              <View style={styles.progressBarWrapper}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(
                        100,
                        Math.round((todayCalories / goals.calories) * 100)
                      )}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressSubLabel}>
                Today: {Math.round(todayCalories).toLocaleString()} /{" "}
                {goals.calories.toLocaleString()} kcal
              </Text>
              <Pressable
                onPress={() => navigation.navigate("Onboarding")}
                style={styles.logWeightBtn}
              >
                <Text style={styles.logWeightText}>Scan Meal →</Text>
              </Pressable>
            </View>

            {/* Streak Card */}
            <View style={styles.metricCard}>
              <View style={styles.streakFlameCircle}>
                <Ionicons name="flame" size={24} color={colors.flame} />
              </View>
              <Text style={styles.streakNumber}>{streakDays}</Text>
              <Text style={styles.streakLabel}>Day Streak</Text>

              {/* S M T W T F S day dots */}
              <View style={styles.weekDotsRow}>
                {["S", "M", "T", "W", "T", "F", "S"].map((dayLetter, index) => {
                  const isActive = index <= Math.min(streakDays, 6);
                  return (
                    <View key={index} style={styles.dotColumn}>
                      <Text style={styles.dotLetter}>{dayLetter}</Text>
                      <View style={[styles.statusDot, isActive && styles.statusDotActive]}>
                        {isActive ? (
                          <Ionicons name="checkmark" size={10} color={colors.white} />
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Weekly calorie column chart — not a pie chart */}
          <GlassCard style={styles.chartCard} elevation="floating">
            <View style={styles.chartHeaderRow}>
              <View>
                <Text style={styles.chartCaloriesHeadline}>
                  {Math.round(todayCalories).toLocaleString()}{" "}
                  <Text style={styles.chartCaloriesUnit}>kcal</Text>
                </Text>
                <Text style={styles.chartTargetText}>
                  Target: {goals.calories.toLocaleString()} kcal / day
                </Text>
              </View>
              <View style={styles.goalBadge}>
                <Ionicons name="bar-chart" size={12} color={colors.primaryGreenDark} />
                <Text style={styles.goalBadgeText}>This Week</Text>
              </View>
            </View>

            <WeeklyColumnChart columns={weekColumns} />

            {/* Segmented Time Range Toggles */}
            <View style={styles.timeRangeSegment}>
              {(["7D", "30D", "90D", "ALL"] as TimeRange[]).map((r) => {
                const isSelected = timeRange === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setTimeRange(r)}
                    style={[styles.timeRangeBtn, isSelected && styles.timeRangeBtnActive]}
                  >
                    <Text
                      style={[
                        styles.timeRangeText,
                        isSelected && styles.timeRangeTextActive,
                      ]}
                    >
                      {r}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>

          {/* Historical Logs Grouped by Day */}
          <View style={styles.historySection}>
            <Text style={styles.sectionHeader}>Log History</Text>

            {loading ? (
              <ActivityIndicator
                style={{ marginTop: spacing.md }}
                color={colors.primaryGreen}
                size="small"
              />
            ) : dayGroups.length === 0 ? (
              <EmptyState
                emoji="📊"
                title="No logged meals yet"
                subtitle="Your meal history will build up here as you scan food."
              />
            ) : (
              <View style={styles.daysList}>
                {dayGroups.map((group) => (
                  <DaySummaryCard key={group.dateKey} group={group} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Bottom Tab Bar with Green Center Scanner & Profile */}
        <BottomTabBar
          activeTab="Progress"
          onTabChange={(tab: TabKey) => {
            if (tab === "Home") {
              navigation.navigate("Dashboard");
            } else if (tab === "Profile") {
              navigation.navigate("Profile");
            }
          }}
          onScanPress={() => navigation.navigate("Onboarding")}
        />
      </SafeAreaView>
    </View>
  );
}

function DaySummaryCard({ group }: { group: DayLogGroup }) {
  return (
    <GlassCard style={styles.dayCard}>
      <View style={styles.dayHeaderRow}>
        <Text style={styles.dayLabel}>{group.dateLabel}</Text>
        <Text style={styles.dayCalories}>{Math.round(group.totals.calories)} kcal</Text>
      </View>

      <View style={styles.statGrid}>
        <StatCell label="Protein" value={group.totals.proteinG} emoji="🍗" color={colors.protein} />
        <StatCell label="Carbs" value={group.totals.carbsG} emoji="🌾" color={colors.carbs} />
        <StatCell label="Fat" value={group.totals.fatG} emoji="🥑" color={colors.fat} />
      </View>

      <View style={styles.dayMealsList}>
        {group.logs.map((log) => (
          <LogListItem key={log.id} log={log} />
        ))}
      </View>
    </GlassCard>
  );
}

function StatCell({
  label,
  value,
  emoji,
  color,
}: {
  label: string;
  value: number;
  emoji: string;
  color: string;
}) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statValue, { color }]}>{Math.round(value)}g</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 110,
    gap: spacing.md,
  },
  headerRow: {
    paddingTop: spacing.xs,
  },
  screenTitle: {
    ...typography.display,
    fontSize: 26,
    color: colors.textPrimary,
    fontWeight: "800",
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    textAlign: "center",
  },
  topCardsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 180,
    ...shadow.card,
  },
  metricCardLabel: {
    ...typography.tiny,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  metricCardValue: {
    ...typography.display,
    fontSize: 22,
    color: colors.textPrimary,
    fontWeight: "800",
    marginTop: 2,
  },
  unitText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "500",
  },
  progressBarWrapper: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
    marginTop: spacing.xs,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.primaryGreen,
    borderRadius: 3,
  },
  progressSubLabel: {
    ...typography.tiny,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  logWeightBtn: {
    backgroundColor: colors.greenSoft,
    borderWidth: 1,
    borderColor: colors.greenSoftBorder,
    borderRadius: radii.pill,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
    width: "100%",
    alignItems: "center",
  },
  logWeightText: {
    ...typography.tiny,
    color: colors.primaryGreenDark,
    fontWeight: "800",
  },
  streakFlameCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: colors.flameBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  streakNumber: {
    ...typography.display,
    fontSize: 24,
    color: colors.textPrimary,
    fontWeight: "800",
    marginTop: 2,
  },
  streakLabel: {
    ...typography.tiny,
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
  },
  weekDotsRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: spacing.xs,
  },
  dotColumn: {
    alignItems: "center",
    gap: 2,
  },
  dotLetter: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: "600",
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDotActive: {
    backgroundColor: colors.primaryGreen,
    borderColor: colors.primaryGreen,
  },
  chartCard: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  chartHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  chartCaloriesHeadline: {
    ...typography.display,
    fontSize: 28,
    color: colors.textPrimary,
    fontWeight: "800",
  },
  chartCaloriesUnit: {
    fontSize: 15,
    color: colors.textMuted,
    fontWeight: "600",
  },
  chartTargetText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "500",
  },
  goalBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.greenSoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    gap: 4,
  },
  goalBadgeText: {
    ...typography.tiny,
    fontSize: 11,
    color: colors.primaryGreenDark,
    fontWeight: "800",
  },
  timeRangeSegment: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.pill,
    padding: 3,
  },
  timeRangeBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    borderRadius: radii.pill,
  },
  timeRangeBtnActive: {
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  timeRangeText: {
    ...typography.tiny,
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600",
  },
  timeRangeTextActive: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  historySection: {
    gap: spacing.sm,
  },
  sectionHeader: {
    ...typography.bodyStrong,
    fontSize: 17,
    color: colors.textPrimary,
    fontWeight: "800",
  },
  daysList: {
    gap: spacing.md,
  },
  dayCard: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  dayHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  dayLabel: {
    ...typography.h3,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: "800",
  },
  dayCalories: {
    ...typography.bodyStrong,
    color: colors.primaryGreenDark,
    fontWeight: "800",
  },
  statGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginVertical: spacing.xxs,
  },
  statCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statEmoji: {
    fontSize: 12,
  },
  statValue: {
    ...typography.bodyStrong,
    fontSize: 12,
    fontWeight: "700",
  },
  statLabel: {
    ...typography.tiny,
    fontSize: 11,
    color: colors.textMuted,
  },
  dayMealsList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
