import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from "react-native";

import { colors, radii, spacing, typography } from "../theme";

type Variant = "primary" | "secondary" | "dark" | "outline" | "ghost" | "danger";

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  size?: "sm" | "md" | "lg";
}

export function PrimaryButton({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  icon,
  fullWidth = true,
  style,
  textStyle,
  size = "md",
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  const sizeStyle =
    size === "sm"
      ? styles.sizeSm
      : size === "lg"
      ? styles.sizeLg
      : styles.sizeMd;

  const labelSizeStyle =
    size === "sm"
      ? styles.labelSm
      : size === "lg"
      ? styles.labelLg
      : styles.labelMd;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        sizeStyle,
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "primary" || variant === "dark" || variant === "danger"
              ? colors.white
              : colors.textPrimary
          }
        />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text
            style={[styles.label, labelSizeStyle, variantLabelStyles[variant], textStyle]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  sizeSm: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    minHeight: 40,
  },
  sizeMd: {
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  sizeLg: {
    paddingVertical: 18,
    paddingHorizontal: spacing.xl,
    minHeight: 60,
  },
  fullWidth: {
    width: "100%",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  label: {
    ...typography.bodyStrong,
    letterSpacing: -0.2,
    fontWeight: "700",
  },
  labelSm: {
    fontSize: 13,
  },
  labelMd: {
    fontSize: 15,
  },
  labelLg: {
    fontSize: 17,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primaryGreen,
  },
  dark: {
    backgroundColor: colors.textPrimary,
  },
  secondary: {
    backgroundColor: colors.greenSoft,
    borderWidth: 1,
    borderColor: colors.greenSoftBorder,
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  danger: {
    backgroundColor: colors.danger,
  },
});

const variantLabelStyles = StyleSheet.create({
  primary: {
    color: colors.white,
  },
  dark: {
    color: colors.white,
  },
  secondary: {
    color: colors.primaryGreenDark,
  },
  outline: {
    color: colors.textPrimary,
  },
  ghost: {
    color: colors.textPrimary,
  },
  danger: {
    color: colors.white,
  },
});
