import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, radii, spacing, typography } from "../theme";

interface PortionStepperProps {
  value: number;
  onChange: (nextValue: number) => void;
  step?: number;
  min?: number;
  max?: number;
}

export function PortionStepper({
  value,
  onChange,
  step = 0.5,
  min = 0.5,
  max = 10,
}: PortionStepperProps) {
  function handleDecrement() {
    const next = Math.max(min, Math.round((value - step) * 10) / 10);
    onChange(next);
  }

  function handleIncrement() {
    const next = Math.min(max, Math.round((value + step) * 10) / 10);
    onChange(next);
  }

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrease portion"
        onPress={handleDecrement}
        disabled={value <= min}
        style={({ pressed }) => [
          styles.btn,
          value <= min && styles.btnDisabled,
          pressed && styles.btnPressed,
        ]}
      >
        <Ionicons name="remove" size={16} color={value <= min ? colors.textMuted : colors.textPrimary} />
      </Pressable>

      <Text style={styles.valueText}>
        {Number.isInteger(value) ? value : value.toFixed(1)}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase portion"
        onPress={handleIncrement}
        disabled={value >= max}
        style={({ pressed }) => [
          styles.btn,
          value >= max && styles.btnDisabled,
          pressed && styles.btnPressed,
        ]}
      >
        <Ionicons name="add" size={16} color={value >= max ? colors.textMuted : colors.textPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  btn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  valueText: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.textPrimary,
    minWidth: 28,
    textAlign: "center",
    paddingHorizontal: spacing.xs,
  },
});
