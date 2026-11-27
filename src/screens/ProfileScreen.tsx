import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import { BottomTabBar, GlassCard, PrimaryButton, type TabKey } from "../components";
import {
  CALORIE_TARGET_STEP,
  MAX_CALORIE_TARGET,
  MIN_CALORIE_TARGET,
  clampCalorieTarget,
  useGoals,
} from "../lib/goals";
import { useSession } from "../lib/session";
import { colors, radii, spacing, typography } from "../theme";
import type { ProfileScreenProps } from "../navigation/types";

async function confirmDeleteAccount(): Promise<boolean> {
  if (Platform.OS === "web") {
    return window.confirm(
      "Delete your account permanently? Your food logs and calorie target will be removed. This cannot be undone."
    );
  }

  return new Promise((resolve) => {
    Alert.alert(
      "Delete account?",
      "This permanently removes your account, food logs, and calorie target. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: "Delete", style: "destructive", onPress: () => resolve(true) },
      ]
    );
  });
}

export function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { user, isAuthenticated, signOut, deleteAccount } = useSession();
  const { goals, isLoading, isSaving, errorMessage, saveCalorieTarget } = useGoals();

  const [draftCalories, setDraftCalories] = useState(goals.calories);
  const [draftText, setDraftText] = useState(String(goals.calories));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setDraftCalories(goals.calories);
      setDraftText(String(goals.calories));
    }
  }, [isLoading, goals.calories]);

  const isDirty = draftCalories !== goals.calories;

  function applyDraft(next: number) {
    const clamped = Math.min(MAX_CALORIE_TARGET, Math.max(MIN_CALORIE_TARGET, Math.round(next)));
    setDraftCalories(clamped);
    setDraftText(String(clamped));
    setSaveError(null);
  }

  function handleDraftTextChange(text: string) {
    const digits = text.replace(/[^0-9]/g, "");
    setDraftText(digits);
    if (digits.length === 0) {
      return;
    }
    const parsed = Number.parseInt(digits, 10);
    if (Number.isFinite(parsed)) {
      setDraftCalories(Math.min(MAX_CALORIE_TARGET, Math.max(MIN_CALORIE_TARGET, parsed)));
      setSaveError(null);
    }
  }

  async function handleSave() {
    setSaveError(null);
    try {
      const next = clampCalorieTarget(draftCalories);
      await saveCalorieTarget(next);
      setDraftCalories(next);
      setDraftText(String(next));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Couldn't save your calorie target.");
    }
  }

  async function handleSignOut() {
    setActionError(null);
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Couldn't sign out.");
      setSigningOut(false);
    }
  }

  async function handleDelete() {
    const confirmed = await confirmDeleteAccount();
    if (!confirmed) return;

    setActionError(null);
    setDeleting(true);
    try {
      await deleteAccount();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Couldn't delete your account.");
      setDeleting(false);
    }
  }

  function handleTabChange(tab: TabKey) {
    if (tab === "Profile") return;
    if (tab === "Home") {
      navigation.navigate(isAuthenticated ? "Dashboard" : "Onboarding");
      return;
    }
    if (tab === "Progress") {
      navigation.navigate(isAuthenticated ? "History" : "Onboarding");
    }
  }

  const emailLabel = user?.email?.trim() || "Signed in";

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.screenTitle}>Profile</Text>

          <GlassCard>
            <View style={styles.identityRow}>
              <View style={styles.avatarCircle}>
                <Ionicons
                  name={isAuthenticated ? "person" : "person-outline"}
                  size={22}
                  color={colors.primaryGreenDark}
                />
              </View>
              <View style={styles.identityCopy}>
                <Text style={styles.identityName} numberOfLines={1}>
                  {isAuthenticated ? emailLabel : "Guest"}
                </Text>
                <Text style={styles.identitySub}>
                  {isAuthenticated
                    ? "Signed in with email"
                    : "Browsing without an account"}
                </Text>
              </View>
            </View>

            <View style={styles.badge}>
              <Text style={styles.badgeText}>{isAuthenticated ? "Signed in" : "Guest"}</Text>
            </View>

            {!isAuthenticated ? (
              <PrimaryButton
                title="Sign up"
                onPress={() => navigation.navigate("Auth")}
                style={styles.accountAction}
              />
            ) : null}
          </GlassCard>

          <GlassCard>
            <Text style={styles.cardEyebrow}>Daily calorie target</Text>
            {isLoading ? (
              <ActivityIndicator
                color={colors.primaryGreen}
                style={styles.goalSpinner}
              />
            ) : (
              <>
                <View style={styles.stepperRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Decrease calorie target"
                    onPress={() => applyDraft(draftCalories - CALORIE_TARGET_STEP)}
                    disabled={draftCalories <= MIN_CALORIE_TARGET}
                    style={({ pressed }) => [
                      styles.stepperBtn,
                      draftCalories <= MIN_CALORIE_TARGET && styles.stepperBtnDisabled,
                      pressed && styles.stepperBtnPressed,
                    ]}
                  >
                    <Ionicons
                      name="remove"
                      size={20}
                      color={
                        draftCalories <= MIN_CALORIE_TARGET
                          ? colors.textMuted
                          : colors.primaryGreenDark
                      }
                    />
                  </Pressable>

                  <View style={styles.calorieField}>
                    <TextInput
                      accessibilityLabel="Calorie target"
                      keyboardType="number-pad"
                      value={draftText}
                      onChangeText={handleDraftTextChange}
                      onBlur={() => applyDraft(draftCalories)}
                      style={styles.calorieInput}
                      maxLength={4}
                    />
                    <Text style={styles.calorieUnit}>kcal</Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Increase calorie target"
                    onPress={() => applyDraft(draftCalories + CALORIE_TARGET_STEP)}
                    disabled={draftCalories >= MAX_CALORIE_TARGET}
                    style={({ pressed }) => [
                      styles.stepperBtn,
                      styles.stepperBtnPlus,
                      draftCalories >= MAX_CALORIE_TARGET && styles.stepperBtnDisabled,
                      pressed && styles.stepperBtnPressed,
                    ]}
                  >
                    <Ionicons
                      name="add"
                      size={20}
                      color={
                        draftCalories >= MAX_CALORIE_TARGET ? colors.textMuted : colors.white
                      }
                    />
                  </Pressable>
                </View>

                <Text style={styles.hintText}>
                  Between {MIN_CALORIE_TARGET.toLocaleString()} and{" "}
                  {MAX_CALORIE_TARGET.toLocaleString()} kcal
                </Text>

                {errorMessage || saveError ? (
                  <Text style={styles.errorText}>{saveError ?? errorMessage}</Text>
                ) : null}

                <PrimaryButton
                  title="Save"
                  onPress={() => void handleSave()}
                  disabled={!isDirty}
                  loading={isSaving}
                  style={styles.saveButton}
                />
              </>
            )}
          </GlassCard>

          {isAuthenticated ? (
            <View style={styles.actions}>
              {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}
              <PrimaryButton
                title="Sign out"
                variant="secondary"
                onPress={() => void handleSignOut()}
                loading={signingOut}
                disabled={deleting}
              />
              <PrimaryButton
                title="Delete account"
                variant="danger"
                onPress={() => void handleDelete()}
                loading={deleting}
                disabled={signingOut}
              />
            </View>
          ) : actionError ? (
            <Text style={styles.errorText}>{actionError}</Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Privacy and data"
            onPress={() => navigation.navigate("Privacy")}
            style={styles.privacyRow}
          >
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.privacyText}>Privacy & data</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </ScrollView>

        <BottomTabBar
          activeTab="Profile"
          onTabChange={handleTabChange}
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
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 110,
    gap: spacing.md,
  },
  screenTitle: {
    ...typography.h1,
    color: colors.textPrimary,
    fontWeight: "800",
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.greenSoft,
    borderWidth: 1.5,
    borderColor: colors.greenHeroCardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  identityCopy: {
    flex: 1,
    gap: 2,
  },
  identityName: {
    ...typography.bodyStrong,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: "800",
  },
  identitySub: {
    ...typography.caption,
    color: colors.textMuted,
  },
  badge: {
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    backgroundColor: colors.greenHeroCard,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    ...typography.tiny,
    fontSize: 11,
    color: colors.primaryGreenDark,
    fontWeight: "800",
  },
  accountAction: {
    marginTop: spacing.md,
  },
  cardEyebrow: {
    ...typography.captionStrong,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  goalSpinner: {
    marginVertical: spacing.lg,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnPlus: {
    backgroundColor: colors.primaryGreen,
  },
  stepperBtnDisabled: {
    opacity: 0.4,
  },
  stepperBtnPressed: {
    transform: [{ scale: 0.96 }],
  },
  calorieField: {
    flex: 1,
    alignItems: "center",
  },
  calorieInput: {
    ...typography.heroMetric,
    color: colors.textPrimary,
    textAlign: "center",
    minWidth: 110,
    paddingVertical: 0,
  },
  calorieUnit: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  hintText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  saveButton: {
    marginTop: spacing.md,
  },
  actions: {
    gap: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  privacyText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "600",
  },
});
