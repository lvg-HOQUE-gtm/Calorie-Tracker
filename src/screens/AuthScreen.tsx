import React, { useState } from "react";
import {
  KeyboardAvoidingView,
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

import { GlassCard, PrimaryButton } from "../components";
import { supabase } from "../lib/supabase";
import { useSession } from "../lib/session";
import { saveFoodLog } from "../services/logs";
import { colors, radii, shadow, spacing, typography } from "../theme";
import type { AuthScreenProps } from "../navigation/types";

type Mode = "signup" | "login";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthScreen({ navigation }: AuthScreenProps) {
  const { session, isAnonymous, pendingMeal, setPendingMeal } = useSession();

  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  function validate(): string | null {
    if (!EMAIL_PATTERN.test(email.trim())) return "Enter a valid email address.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    return null;
  }

  async function finishWithUser(userId: string) {
    if (pendingMeal) {
      try {
        await saveFoodLog(
          userId,
          pendingMeal.analysis,
          pendingMeal.photo,
          pendingMeal.contextText || undefined
        );
      } finally {
        setPendingMeal(null);
      }
    }
  }

  async function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage(null);
    setInfoMessage(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const shouldUpgradeAnonymous = isAnonymous && Boolean(session);
        let userId: string | undefined;
        let pendingConfirmation: boolean;

        if (shouldUpgradeAnonymous) {
          const { data, error } = await supabase.auth.updateUser({ email: email.trim(), password });
          if (error) throw error;
          pendingConfirmation = Boolean(data.user?.is_anonymous);
          userId = data.user?.id ?? session?.user.id;
        } else {
          const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
          if (error) throw error;
          pendingConfirmation = !data.session;
          userId = data.user?.id;
        }

        if (pendingConfirmation) {
          setInfoMessage(
            "Check your email to confirm your account, then log in below to unlock your dashboard."
          );
          setMode("login");
          return;
        }

        if (!userId) throw new Error("Sign up succeeded but no user was returned.");
        await finishWithUser(userId);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        const userId = data.user?.id;
        if (!userId) throw new Error("Login succeeded but no user was returned.");
        await finishWithUser(userId);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header Brand */}
            <View style={styles.brandRow}>
              <View style={styles.brandIconCircle}>
                <Ionicons name="leaf" size={20} color={colors.accent} />
              </View>
              <Text style={styles.brandTitle}>Ahaar AI</Text>
            </View>

            <Text style={styles.title}>
              {mode === "signup" ? "Lock in Your Progress" : "Welcome back"}
            </Text>
            <Text style={styles.subtitle}>
              {pendingMeal
                ? `Create an account to save "${pendingMeal.analysis.dishName}" to your dashboard.`
                : "Track every meal with your personal Ahaar AI profile."}
            </Text>

            <GlassCard style={styles.card} elevation="floating">
              <View style={styles.segmentRow}>
                <SegmentButton
                  label="Sign Up"
                  active={mode === "signup"}
                  onPress={() => setMode("signup")}
                />
                <SegmentButton
                  label="Log In"
                  active={mode === "login"}
                  onPress={() => setMode("login")}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Email address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              {infoMessage ? <Text style={styles.infoText}>{infoMessage}</Text> : null}
              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              <PrimaryButton
                title={mode === "signup" ? "Create Account" : "Log In"}
                onPress={handleSubmit}
                loading={submitting}
                size="lg"
                style={styles.submitButton}
              />

              <Text style={styles.reassurance}>
                {isAnonymous
                  ? "Your guest scans will automatically sync to this account."
                  : "All your saved meals are backed up securely."}
              </Text>
            </GlassCard>

            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.laterButton}
              disabled={submitting}
            >
              <Text style={styles.laterText}>Maybe later</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function SegmentButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.segment, active && styles.segmentActive]}
      onPress={onPress}
    >
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
    flexGrow: 1,
    justifyContent: "center",
  },
  brandRow: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  brandIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  brandTitle: {
    ...typography.h2,
    fontSize: 22,
    color: colors.textPrimary,
    fontWeight: "800",
  },
  title: {
    ...typography.h1,
    fontSize: 24,
    color: colors.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 2,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    lineHeight: 20,
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  segmentRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: radii.pill,
  },
  segmentActive: {
    backgroundColor: colors.accent,
  },
  segmentText: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.white,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    textAlign: "center",
  },
  infoText: {
    ...typography.caption,
    color: colors.success,
    textAlign: "center",
  },
  submitButton: {
    marginTop: spacing.xs,
  },
  reassurance: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
  },
  laterButton: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  laterText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
