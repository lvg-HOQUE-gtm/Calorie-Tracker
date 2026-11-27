import React, { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { MealAnalysis } from "../types";
import { colors, radii, shadow, spacing, typography } from "../theme";
import { PortionStepper } from "./PortionStepper";
import { PrimaryButton } from "./PrimaryButton";

interface MealResultCardProps {
  analysis: MealAnalysis;
  photoUri: string | null;
  onSave: (scaledAnalysis: MealAnalysis) => void;
  onRetake: () => void;
  saving?: boolean;
  saveLabel?: string;
  onBack?: () => void;
}

function formatCurrentTime(): string {
  try {
    return new Date().toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "Just now";
  }
}

export function MealResultCard({
  analysis,
  photoUri,
  onSave,
  onRetake,
  saving = false,
  saveLabel = "Done",
  onBack,
}: MealResultCardProps) {
  const [portion, setPortion] = useState(1);
  const [showEditContext, setShowEditContext] = useState(false);

  // Scaled nutrition values based on portion stepper
  const totalCalories = Math.round(analysis.totalCalories * portion);
  const proteinG = Math.round(analysis.proteinG * portion);
  const carbsG = Math.round(analysis.carbsG * portion);
  const fatG = Math.round(analysis.fatG * portion);
  const fiberG = Math.round(analysis.fiberG * portion);

  const confidencePercent = Math.round(analysis.confidence * 100);

  function handleDone() {
    const scaledAnalysis: MealAnalysis = {
      ...analysis,
      totalCalories,
      proteinG,
      carbsG,
      fatG,
      fiberG,
      servingDescription:
        portion === 1
          ? analysis.servingDescription
          : `${portion}x (${analysis.servingDescription})`,
      items: analysis.items.map((item) => ({
        ...item,
        calories: Math.round(item.calories * portion),
        proteinG: Math.round(item.proteinG * portion),
        carbsG: Math.round(item.carbsG * portion),
        fatG: Math.round(item.fatG * portion),
      })),
    };
    onSave(scaledAnalysis);
  }

  return (
    <View style={styles.container}>
      {/* Top Bar above image */}
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack ?? onRetake}
          style={styles.iconCircle}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.screenHeaderTitle}>Nutrition</Text>
        <View style={styles.topRightActions}>
          <Pressable style={styles.iconCircle}>
            <Ionicons name="share-outline" size={18} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Full-bleed style rounded image container */}
        <View style={styles.imageCard}>
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={styles.foodImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>🥗</Text>
            </View>
          )}

          {/* Floating Match Confidence badge over image */}
          <View style={styles.confidenceBadge}>
            <Ionicons name="sparkles" size={12} color={colors.white} />
            <Text style={styles.confidenceText}>
              {analysis.isDemo ? "Demo Estimate" : `${confidencePercent}% Match`}
            </Text>
          </View>
        </View>

        {/* Sliding nutrition details sheet */}
        <View style={styles.sheetCard}>
          {/* Header Row with Dish name and Portion Stepper */}
          <View style={styles.sheetHeader}>
            <View style={styles.titleColumn}>
              <View style={styles.timeRow}>
                <View style={styles.greenDot} />
                <Text style={styles.timeBadgeText}>{formatCurrentTime()}</Text>
              </View>
              <Text style={styles.dishTitle}>{analysis.dishName}</Text>
              {analysis.bengaliName ? (
                <Text style={styles.bengaliTitle}>{analysis.bengaliName}</Text>
              ) : null}
            </View>

            <View style={styles.stepperWrapper}>
              <PortionStepper value={portion} onChange={setPortion} min={0.5} max={5} step={0.5} />
            </View>
          </View>

          {/* Floating Fresh Green Calorie Banner */}
          <View style={styles.floatingCalorieBanner}>
            <View style={styles.flameCircle}>
              <Ionicons name="flame" size={24} color={colors.primaryGreenDark} />
            </View>
            <View style={styles.calorieTextGroup}>
              <Text style={styles.calorieLabel}>Total Energy</Text>
              <Text style={styles.calorieValue}>
                {totalCalories} <Text style={styles.calorieUnit}>kcal</Text>
              </Text>
            </View>
          </View>

          {/* 3 Macro Summary Pills in a Row */}
          <View style={styles.macroRow}>
            <View style={styles.macroPill}>
              <View style={[styles.macroIconCircle, { backgroundColor: colors.proteinSoft }]}>
                <Text style={styles.macroEmoji}>🍗</Text>
              </View>
              <View>
                <Text style={styles.macroPillLabel}>Protein</Text>
                <Text style={styles.macroPillValue}>{proteinG}g</Text>
              </View>
            </View>

            <View style={styles.macroPill}>
              <View style={[styles.macroIconCircle, { backgroundColor: colors.carbsSoft }]}>
                <Text style={styles.macroEmoji}>🌾</Text>
              </View>
              <View>
                <Text style={styles.macroPillLabel}>Carbs</Text>
                <Text style={styles.macroPillValue}>{carbsG}g</Text>
              </View>
            </View>

            <View style={styles.macroPill}>
              <View style={[styles.macroIconCircle, { backgroundColor: colors.fatSoft }]}>
                <Text style={styles.macroEmoji}>🥑</Text>
              </View>
              <View>
                <Text style={styles.macroPillLabel}>Fats</Text>
                <Text style={styles.macroPillValue}>{fatG}g</Text>
              </View>
            </View>
          </View>

          {/* Ingredients / Food Breakdown List */}
          {analysis.items.length > 0 ? (
            <View style={styles.ingredientsSection}>
              <View style={styles.ingredientsHeaderRow}>
                <Text style={styles.sectionTitle}>Ingredients</Text>
                <Pressable onPress={() => setShowEditContext(!showEditContext)}>
                  <Text style={styles.addMoreLink}>
                    {showEditContext ? "Hide note" : "+ Health note"}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.itemsList}>
                {analysis.items.map((item, index) => {
                  const itemCal = Math.round(item.calories * portion);
                  return (
                    <View key={`${item.name}-${index}`} style={styles.ingredientPill}>
                      <Text style={styles.ingredientName} numberOfLines={1}>
                        {item.name}
                        {item.bengaliName ? ` (${item.bengaliName})` : ""}
                        <Text style={styles.ingredientCal}> • {itemCal} cal</Text>
                      </Text>
                      <Text style={styles.ingredientPortion} numberOfLines={1}>
                        {item.quantity}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Health Note */}
          {analysis.healthNote || showEditContext ? (
            <View style={styles.noteBox}>
              <Ionicons name="sparkles" size={15} color={colors.primaryGreenDark} />
              <Text style={styles.noteText}>{analysis.healthNote}</Text>
            </View>
          ) : null}

          {/* Bottom Action Bar */}
          <View style={styles.actionsRow}>
            <PrimaryButton
              title="Fix Results"
              onPress={onRetake}
              variant="outline"
              fullWidth={false}
              style={styles.fixButton}
              textStyle={styles.fixButtonText}
              size="md"
            />
            <PrimaryButton
              title={saveLabel}
              onPress={handleDone}
              loading={saving}
              variant="primary"
              fullWidth={false}
              style={styles.doneButton}
              size="md"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  screenHeaderTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: "800",
  },
  topRightActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.md,
  },
  imageCard: {
    width: "100%",
    height: 260,
    borderRadius: radii.xxl,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadow.card,
  },
  foodImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    fontSize: 64,
  },
  confidenceBadge: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    backgroundColor: "rgba(17, 25, 12, 0.72)",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  confidenceText: {
    ...typography.tiny,
    color: colors.white,
    fontWeight: "700",
  },
  sheetCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
    gap: spacing.lg,
    ...shadow.floating,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  titleColumn: {
    flex: 1,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryGreen,
  },
  timeBadgeText: {
    ...typography.tiny,
    color: colors.textMuted,
    fontWeight: "600",
  },
  dishTitle: {
    ...typography.h2,
    fontSize: 19,
    color: colors.textPrimary,
    lineHeight: 24,
    fontWeight: "800",
  },
  bengaliTitle: {
    ...typography.caption,
    color: colors.primaryGreenDark,
    marginTop: 2,
    fontWeight: "600",
  },
  stepperWrapper: {
    alignSelf: "flex-start",
  },
  floatingCalorieBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.greenHeroCard,
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.greenHeroCardBorder,
    gap: spacing.md,
  },
  flameCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  calorieTextGroup: {
    justifyContent: "center",
  },
  calorieLabel: {
    ...typography.tiny,
    fontSize: 12,
    color: colors.primaryGreenDark,
    fontWeight: "800",
  },
  calorieValue: {
    ...typography.display,
    fontSize: 30,
    color: colors.textPrimary,
    fontWeight: "800",
    lineHeight: 34,
  },
  calorieUnit: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  macroPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.lg,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  macroIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  macroEmoji: {
    fontSize: 12,
  },
  macroPillLabel: {
    ...typography.tiny,
    fontSize: 10,
    color: colors.textMuted,
  },
  macroPillValue: {
    ...typography.bodyStrong,
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: "800",
  },
  ingredientsSection: {
    gap: spacing.sm,
  },
  ingredientsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    ...typography.bodyStrong,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: "800",
  },
  addMoreLink: {
    ...typography.caption,
    color: colors.primaryGreenDark,
    fontWeight: "700",
  },
  itemsList: {
    gap: spacing.xs,
  },
  ingredientPill: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  ingredientName: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
  },
  ingredientCal: {
    color: colors.primaryGreenDark,
    fontWeight: "700",
  },
  ingredientPortion: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.greenSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.greenSoftBorder,
    padding: spacing.md,
    gap: spacing.sm,
  },
  noteText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  fixButton: {
    flex: 1,
  },
  fixButtonText: {
    fontWeight: "700",
  },
  doneButton: {
    flex: 1.2,
  },
});
