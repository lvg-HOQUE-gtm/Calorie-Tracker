import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, radii, shadow, spacing, typography } from "../theme";
import { CalorieRing } from "./CalorieRing";

interface MacroCardProps {
  label: string;
  current: number;
  target: number;
  color: string;
  trackColor?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  emoji?: string;
}

export function MacroCard({
  label,
  current,
  target,
  color,
  trackColor = colors.surfaceAlt,
  iconName,
  emoji,
}: MacroCardProps) {
  return (
    <View style={styles.macroCard}>
      <View style={styles.textContainer}>
        <Text style={styles.valueText}>
          {Math.round(current)}
          <Text style={styles.targetText}>/{Math.round(target)}g</Text>
        </Text>
        <Text style={styles.labelText} numberOfLines={1}>
          {label}
        </Text>
      </View>

      <View style={styles.ringContainer}>
        <CalorieRing
          current={current}
          target={target}
          size={48}
          strokeWidth={5.5}
          strokeColor={color}
          trackColor={trackColor}
          showIcon={Boolean(iconName && !emoji)}
          iconName={iconName}
          iconColor={color}
          centerEmoji={emoji}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  macroCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 116,
    ...shadow.card,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: spacing.xxs,
  },
  valueText: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  targetText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "500",
  },
  labelText: {
    ...typography.tiny,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: "600",
  },
  ringContainer: {
    marginTop: 2,
  },
});
