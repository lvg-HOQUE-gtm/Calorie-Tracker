import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii, shadow, spacing, typography } from "../theme";

export type TabKey = "Home" | "Progress" | "Profile";

interface BottomTabBarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onScanPress: () => void;
}

/**
 * Bottom Navigation Bar with Home, centered green Food Scanner button, Progress, and Profile.
 */
export function BottomTabBar({
  activeTab,
  onTabChange,
  onScanPress,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 6);

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomPadding }]}>
      <View style={styles.tabBar}>
        {/* Left Tab: Home */}
        <Pressable
          onPress={() => onTabChange("Home")}
          style={styles.tabItem}
          accessibilityRole="button"
          accessibilityLabel="Home"
        >
          <Ionicons
            name={activeTab === "Home" ? "home" : "home-outline"}
            size={22}
            color={activeTab === "Home" ? colors.primaryGreenDark : colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === "Home" ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            Home
          </Text>
        </Pressable>

        {/* Center-Left Tab: Progress */}
        <Pressable
          onPress={() => onTabChange("Progress")}
          style={styles.tabItem}
          accessibilityRole="button"
          accessibilityLabel="Progress"
        >
          <Ionicons
            name={activeTab === "Progress" ? "bar-chart" : "bar-chart-outline"}
            size={22}
            color={activeTab === "Progress" ? colors.primaryGreenDark : colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === "Progress" ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            Progress
          </Text>
        </Pressable>

        {/* Center: Vibrant Green Food Scanner Button */}
        <View style={styles.centerScannerContainer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan Food"
            onPress={onScanPress}
            style={({ pressed }) => [
              styles.scannerButton,
              pressed && styles.scannerButtonPressed,
            ]}
          >
            <Ionicons name="scan" size={26} color={colors.white} />
          </Pressable>
          <Text style={styles.scannerLabel}>Scan</Text>
        </View>

        {/* Right Tab: Profile */}
        <Pressable
          onPress={() => onTabChange("Profile")}
          style={styles.tabItem}
          accessibilityRole="button"
          accessibilityLabel="Profile"
        >
          <Ionicons
            name={activeTab === "Profile" ? "person" : "person-outline"}
            size={22}
            color={activeTab === "Profile" ? colors.primaryGreenDark : colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === "Profile" ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            Profile
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    paddingHorizontal: spacing.lg,
    pointerEvents: "box-none",
  },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingVertical: 8,
    paddingHorizontal: spacing.lg,
    ...shadow.floating,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: spacing.xs,
    minWidth: 54,
  },
  tabLabel: {
    ...typography.tiny,
    fontSize: 10,
    marginTop: 3,
  },
  tabLabelActive: {
    color: colors.primaryGreenDark,
    fontWeight: "700",
  },
  tabLabelInactive: {
    color: colors.textMuted,
    fontWeight: "500",
  },
  centerScannerContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -16,
    paddingHorizontal: spacing.xs,
  },
  scannerButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primaryGreen,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3.5,
    borderColor: colors.surface,
    ...shadow.scannerBtn,
  },
  scannerButtonPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.92,
  },
  scannerLabel: {
    ...typography.tiny,
    fontSize: 10,
    color: colors.primaryGreenDark,
    fontWeight: "800",
    marginTop: 2,
  },
});
