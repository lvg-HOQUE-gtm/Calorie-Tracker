import React from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";

import { colors, radii, shadow, spacing, typography } from "../theme";

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  subMessage?: string;
}

/** Crisp light modal overlay shown while analyzing a meal. */
export function LoadingOverlay({
  visible,
  message = "In Progress...",
  subMessage,
}: LoadingOverlayProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.spinnerWrapper}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
          <Text style={styles.message}>{message}</Text>
          {subMessage ? <Text style={styles.subMessage}>{subMessage}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    minWidth: 260,
    maxWidth: 320,
    ...shadow.floating,
  },
  spinnerWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: "center",
  },
  subMessage: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: "center",
    lineHeight: 18,
  },
});
