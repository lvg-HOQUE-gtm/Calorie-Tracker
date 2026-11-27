import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "../theme";

interface CalorieRingProps {
  current: number;
  target: number;
  size?: number;
  strokeWidth?: number;
  strokeColor?: string;
  trackColor?: string;
  showIcon?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  centerText?: string;
  centerSubText?: string;
  centerEmoji?: string;
}

/**
 * FitBite circular progress gauge with lime-green active arc and inner badge.
 */
export function CalorieRing({
  current,
  target,
  size = 76,
  strokeWidth = 8,
  strokeColor = colors.primaryGreen,
  trackColor = colors.greenSoftBorder,
  showIcon = true,
  iconName = "flame",
  iconColor = colors.primaryGreenDark,
  centerText,
  centerSubText,
  centerEmoji,
}: CalorieRingProps) {
  const radius = Math.max((size - strokeWidth) / 2, 1);
  const circumference = 2 * Math.PI * radius;
  const safeTarget = Math.max(target, 1);
  const progress = Math.min(Math.max(current / safeTarget, 0), 1);
  const dashOffset = circumference * (1 - progress);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Active Progress */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={[circumference, circumference].join(" ")}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {centerText ? (
        <View style={styles.centerContent} pointerEvents="none">
          <Text style={[styles.centerNumber, { fontSize: size * 0.28 }]}>{centerText}</Text>
          {centerSubText ? (
            <Text style={[styles.centerSub, { fontSize: size * 0.14 }]}>{centerSubText}</Text>
          ) : null}
        </View>
      ) : centerEmoji ? (
        <View style={styles.centerContent} pointerEvents="none">
          <Text style={{ fontSize: size * 0.38 }}>{centerEmoji}</Text>
        </View>
      ) : showIcon ? (
        <View style={styles.centerIcon} pointerEvents="none">
          <Ionicons name={iconName} size={size * 0.34} color={iconColor} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerIcon: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  centerContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  centerNumber: {
    fontWeight: "800",
    color: colors.textPrimary,
    lineHeight: 22,
  },
  centerSub: {
    fontWeight: "600",
    color: colors.textMuted,
    marginTop: -2,
  },
});
