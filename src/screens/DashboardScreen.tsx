import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
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
  CalorieRing,
  EmptyState,
  LogListItem,
  MacroCard,
  WeeklyDateStrip,
  getCurrentWeekDays,
  type TabKey,
} from "../components";
import { useGoals } from "../lib/goals";
import { useSession } from "../lib/session";
import { getRecentLogs, sumMacros } from "../services/logs";
import { colors, radii, shadow, spacing, typography } from "../theme";
import { type FoodLog } from "../types";
import type { DashboardScreenProps } from "../navigation/types";

function getLocalDateISO(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthYearLabel(date = new Date()): string {
  try {
    return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  } catch {
    return "This Month";
  }
}

export function DashboardScreen({ navigation }: DashboardScreenProps) {
  const { session } = useSession();
  const { goals } = useGoals();
  const userId = session?.user.id ?? null;

  const [allLogs, setAllLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const todayISO = useMemo(() => getLocalDateISO(), []);
  const [selectedDateISO, setSelectedDateISO] = useState<string>(todayISO);

  const loadLogs = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!userId) return;
      if (!opts.silent) setLoading(true);
      setErrorMessage(null);
      try {
        const recent = await getRecentLogs(userId, 200);
        setAllLogs(recent);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Couldn't load your food logs."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId]
  );

  useFocusEffect(
    useCallback(() => {
      void loadLogs({ silent: allLogs.length > 0 });
    }, [loadLogs, allLogs.length])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await loadLogs({ silent: true });
  }

  // Filter logs to the selected date
  const selectedDateLogs = useMemo(() => {
    return allLogs.filter((log) => {
      const logDateISO = getLocalDateISO(new Date(log.loggedAt));
      return logDateISO === selectedDateISO;
    });
  }, [allLogs, selectedDateISO]);

  // Compute nutrition totals for the selected date
  const totals = useMemo(() => sumMacros(selectedDateLogs), [selectedDateLogs]);

  // Generate the 7 days of the current week with log dots
  const weekDays = useMemo(() => {
    const rawDays = getCurrentWeekDays();
    const logDateSet = new Set(
      allLogs.map((log) => getLocalDateISO(new Date(log.loggedAt)))
    );
    return rawDays.map((d) => ({
      ...d,
      hasLogs: logDateSet.has(d.fullDateISO),
    }));
  }, [allLogs]);

  // Compute streak count (days with at least 1 log)
  const streakCount = useMemo(() => {
    const datesWithLogs = new Set(
      allLogs.map((log) => getLocalDateISO(new Date(log.loggedAt)))
    );
    return Math.max(datesWithLogs.size, 1);
  }, [allLogs]);

  const monthYearLabel = useMemo(() => getMonthYearLabel(), []);
  const isViewingToday = selectedDateISO === todayISO;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <FlatList
          data={selectedDateLogs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <LogListItem log={item} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primaryGreenDark}
            />
          }
          ListHeaderComponent={
            <View style={styles.headerSection}>
              {/* Top User Greeting Header: Avatar + "Good morning! User" + Notification/Settings Icons */}
              <View style={styles.topRow}>
                <View style={styles.userProfileGroup}>
                  <View style={styles.avatarCircle}>
                    <Ionicons name="person" size={18} color={colors.primaryGreenDark} />
                  </View>
                  <View>
                    <Text style={styles.greetingText}>Good morning!</Text>
                    <Text style={styles.userNameText}>Ahaar Explorer</Text>
                  </View>
                </View>

                <View style={styles.topRightGroup}>
                  {/* Streak Flame Pill */}
                  <View style={styles.streakBadge}>
                    <Ionicons name="flame" size={15} color={colors.flame} />
                    <Text style={styles.streakText}>{streakCount} days</Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Profile"
                    style={styles.iconButton}
                    onPress={() => navigation.navigate("Profile")}
                  >
                    <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </View>

              {/* FitBite Sage/Lime Green Hero Card: "Daily Intake / Your Weekly Progress" */}
              <View style={styles.greenHeroCard}>
                <View style={styles.greenHeroLeft}>
                  <View style={styles.dailyIntakeBadge}>
                    <Ionicons name="sparkles" size={13} color={colors.primaryGreenDark} />
                    <Text style={styles.dailyIntakeBadgeText}>Daily Nutrition</Text>
                  </View>
                  <Text style={styles.greenHeroTitle}>Your Calorie Goal</Text>
                  <Text style={styles.greenHeroCalories}>
                    {Math.round(totals.calories)}
                    <Text style={styles.greenHeroCaloriesTarget}>
                      {" "}/ {goals.calories} kcal
                    </Text>
                  </Text>
                </View>

                <View style={styles.greenHeroRight}>
                  <CalorieRing
                    current={totals.calories}
                    target={goals.calories}
                    size={84}
                    strokeWidth={9}
                    strokeColor={colors.primaryGreenDark}
                    trackColor="rgba(255, 255, 255, 0.55)"
                    showIcon={false}
                    centerText={String(streakCount)}
                    centerSubText="days"
                  />
                </View>
              </View>

              {/* FitBite Weekly Date Strip (Month Header + S M T W T F S) */}
              <WeeklyDateStrip
                days={weekDays}
                selectedDateISO={selectedDateISO}
                onSelectDate={setSelectedDateISO}
                monthYearLabel={monthYearLabel}
              />

              {/* 3-Column Macro Ring Cards */}
              <View style={styles.macroCardsRow}>
                <MacroCard
                  label="Protein"
                  current={totals.proteinG}
                  target={goals.proteinG}
                  color={colors.protein}
                  trackColor={colors.proteinTrack}
                  emoji="🍗"
                />
                <MacroCard
                  label="Carbs"
                  current={totals.carbsG}
                  target={goals.carbsG}
                  color={colors.carbs}
                  trackColor={colors.carbsTrack}
                  emoji="🌾"
                />
                <MacroCard
                  label="Fat"
                  current={totals.fatG}
                  target={goals.fatG}
                  color={colors.fat}
                  trackColor={colors.fatTrack}
                  emoji="🥑"
                />
              </View>

              {errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
              ) : null}

              {/* Meals Log Header with Floating Scan Shortcut */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>
                  {isViewingToday ? "Today's Meals" : "Logged Meals"}
                </Text>

                <Pressable
                  onPress={() => navigation.navigate("Onboarding")}
                  style={styles.scanMiniButton}
                >
                  <Ionicons name="scan" size={14} color={colors.primaryGreenDark} />
                  <Text style={styles.scanMiniButtonText}>Scan Meal</Text>
                </Pressable>
              </View>
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator
                style={styles.loadingIndicator}
                color={colors.primaryGreen}
                size="small"
              />
            ) : (
              <EmptyState
                emoji="🥗"
                title={isViewingToday ? "No meals logged yet today" : "No logs for this date"}
                subtitle={
                  isViewingToday
                    ? "Snap a photo of your plate to automatically recognize Bangladeshi foods & macros."
                    : "Tap below or use the green scanner to log a meal."
                }
                actionLabel="Scan Your Meal 📸"
                onAction={() => navigation.navigate("Onboarding")}
              />
            )
          }
        />

        {/* Bottom Tab Bar with Centered Green Food Scanner Button & Profile */}
        <BottomTabBar
          activeTab="Home"
          onTabChange={(tab: TabKey) => {
            if (tab === "Progress") {
              navigation.navigate("History");
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 110, // Clearance for floating bottom scanner bar
  },
  headerSection: {
    gap: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  userProfileGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.greenSoft,
    borderWidth: 1.5,
    borderColor: colors.greenHeroCardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  greetingText: {
    ...typography.tiny,
    fontSize: 12,
    color: colors.textMuted,
  },
  userNameText: {
    ...typography.bodyStrong,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: "800",
  },
  topRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: colors.flameBorder,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  streakText: {
    ...typography.tiny,
    fontSize: 12,
    color: colors.flame,
    fontWeight: "800",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  greenHeroCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.greenHeroCard,
    borderRadius: radii.xxl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.greenHeroCardBorder,
    ...shadow.card,
  },
  greenHeroLeft: {
    flex: 1,
    gap: 2,
  },
  dailyIntakeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  dailyIntakeBadgeText: {
    ...typography.tiny,
    fontSize: 11,
    color: colors.primaryGreenDark,
    fontWeight: "800",
  },
  greenHeroTitle: {
    ...typography.h2,
    fontSize: 19,
    color: colors.textPrimary,
    fontWeight: "800",
  },
  greenHeroCalories: {
    ...typography.display,
    fontSize: 26,
    color: colors.textPrimary,
    fontWeight: "800",
    marginTop: 2,
  },
  greenHeroCaloriesTarget: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  greenHeroRight: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm,
  },
  macroCardsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  sectionTitle: {
    ...typography.bodyStrong,
    fontSize: 17,
    color: colors.textPrimary,
    fontWeight: "800",
  },
  scanMiniButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.greenSoft,
    borderWidth: 1,
    borderColor: colors.greenSoftBorder,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 4,
  },
  scanMiniButtonText: {
    ...typography.tiny,
    fontSize: 12,
    color: colors.primaryGreenDark,
    fontWeight: "800",
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    textAlign: "center",
  },
  loadingIndicator: {
    marginTop: spacing.xl,
  },
});
