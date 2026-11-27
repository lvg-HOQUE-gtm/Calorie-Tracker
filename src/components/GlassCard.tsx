import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radii, shadow, spacing } from "../theme";

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  elevation?: "none" | "card" | "floating";
}

/** The app's standard crisp white surface card with gentle rounded corners. */
export function GlassCard({
  children,
  style,
  padded = true,
  elevation = "card",
}: GlassCardProps) {
  const elevationStyle =
    elevation === "floating"
      ? shadow.floating
      : elevation === "card"
      ? shadow.card
      : null;

  return (
    <View style={[styles.card, padded && styles.padded, elevationStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  padded: {
    padding: spacing.md,
  },
});
