import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import { GlassCard } from "../components";
import { colors, spacing, typography } from "../theme";
import type { PrivacyScreenProps } from "../navigation/types";

interface Section {
  title: string;
  body: string;
}

const SECTIONS: Section[] = [
  {
    title: "Your meal photos",
    body:
      "Photos are resized on your device and sent once to our server function, which forwards them to Google Gemini for calorie/macro recognition. We never upload or store your photos on our servers — only the recognized nutrition data is saved to your account.",
  },
  {
    title: "Your nutrition data",
    body:
      "Dish name, calories, macros, serving size, and your daily calorie target are stored in our database, tied to your account with row-level security — only you can read or write your own rows.",
  },
  {
    title: "No ads, no selling data",
    body:
      "Ahaar AI has no ads and no third-party analytics or tracking SDKs. We do not sell or share your data with third parties. Meal photos go to Google's Gemini API solely to compute your estimate.",
  },
  {
    title: "Deleting your data",
    body:
      "Go to Profile and tap Delete account to permanently remove your account and all of your food logs, calorie target, and scan history. This cannot be undone.",
  },
];

export function PrivacyScreen({ navigation }: PrivacyScreenProps) {
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>Privacy & data</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => navigation.goBack()}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {SECTIONS.map((section) => (
            <GlassCard key={section.title}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionBody}>{section.body}</Text>
            </GlassCard>
          ))}

          <Text style={styles.footerText}>
            Questions about your data? Contact us at{" "}
            <Text
              style={styles.footerLink}
              onPress={() => void Linking.openURL("mailto:rihamhoque1@gmail.com")}
            >
              rihamhoque1@gmail.com
            </Text>
            .
          </Text>
        </ScrollView>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  screenTitle: {
    ...typography.h1,
    fontSize: 22,
    color: colors.textPrimary,
    fontWeight: "800",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.bodyStrong,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  sectionBody: {
    ...typography.body,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  footerText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  footerLink: {
    ...typography.caption,
    color: colors.primaryGreenDark,
    fontWeight: "700",
  },
});
