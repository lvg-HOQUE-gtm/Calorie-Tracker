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
import { Camera, CameraView, type CameraType } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import { LoadingOverlay, MealResultCard, PrimaryButton } from "../components";
import { useSession } from "../lib/session";
import { prepareMealPhoto } from "../lib/photos";
import { analyzeMeal } from "../services/gemini";
import { saveFoodLog } from "../services/logs";
import { colors, radii, shadow, spacing, typography } from "../theme";
import type { MealAnalysis, MealPhoto } from "../types";
import type { OnboardingScreenProps } from "../navigation/types";

type LoadingStage = null | "preparing" | "analyzing" | "saving";

const LOADING_COPY: Record<Exclude<LoadingStage, null>, { message: string; subMessage?: string }> = {
  preparing: { message: "In Progress...", subMessage: "Preparing photo..." },
  analyzing: { message: "In Progress...", subMessage: "Analyzing food & calories..." },
  saving: { message: "In Progress...", subMessage: "Saving to dashboard..." },
};

export function OnboardingCameraScreen({ navigation }: OnboardingScreenProps) {
  const { session, isAuthenticated, setPendingMeal } = useSession();

  const [contextText, setContextText] = useState("");
  const [photo, setPhoto] = useState<MealPhoto | null>(null);
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [facing, setFacing] = useState<CameraType>("back");
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);

  async function runPipeline(sourceUri: string, width?: number, height?: number) {
    setErrorMessage(null);
    setAnalysis(null);
    try {
      setLoadingStage("preparing");
      const preparedPhoto = await prepareMealPhoto(sourceUri, width, height);
      setPhoto(preparedPhoto);

      setLoadingStage("analyzing");
      const result = await analyzeMeal({ photo: preparedPhoto, contextText });
      setAnalysis(result);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong while scanning your meal."
      );
    } finally {
      setLoadingStage(null);
    }
  }

  async function handleOpenCamera() {
    const response = await Camera.requestCameraPermissionsAsync();
    if (!response.granted) {
      setErrorMessage(
        "Camera access is needed to scan your meal. You can also choose a photo from your gallery."
      );
      return;
    }
    setCameraOpen(true);
  }

  async function handleCapture() {
    if (!cameraRef) return;
    try {
      const picture = await cameraRef.takePictureAsync({ quality: 0.9 });
      setCameraOpen(false);
      if (picture?.uri) {
        await runPipeline(picture.uri, picture.width, picture.height);
      }
    } catch {
      setCameraOpen(false);
      setErrorMessage("Couldn't capture that photo. Please try again.");
    }
  }

  async function handlePickFromGallery() {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      setErrorMessage("Photo library access is needed to choose a meal picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      await runPipeline(asset.uri, asset.width, asset.height);
    }
  }

  function handleRetake() {
    setAnalysis(null);
    setPhoto(null);
    setErrorMessage(null);
  }

  async function handleSave(scaledAnalysis: MealAnalysis) {
    if (!photo) return;

    if (!isAuthenticated) {
      setPendingMeal({ analysis: scaledAnalysis, photo, contextText });
      navigation.navigate("Auth");
      return;
    }

    try {
      setSaving(true);
      setLoadingStage("saving");
      if (session?.user.id) {
        await saveFoodLog(session.user.id, scaledAnalysis, photo, contextText || undefined);
      }
      navigation.reset({ index: 0, routes: [{ name: "Dashboard" }] });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Couldn't save this meal. Please try again.");
    } finally {
      setSaving(false);
      setLoadingStage(null);
    }
  }

  if (cameraOpen) {
    return (
      <View style={styles.cameraContainer}>
        <StatusBar style="light" />
        <CameraView ref={setCameraRef} style={styles.camera} facing={facing}>
          <SafeAreaView style={styles.cameraOverlay}>
            <View style={styles.cameraTopRow}>
              <Pressable style={styles.cameraIconButton} onPress={() => setCameraOpen(false)}>
                <Ionicons name="close" size={24} color={colors.white} />
              </Pressable>
              <Pressable
                style={styles.cameraIconButton}
                onPress={() => setFacing((prev) => (prev === "back" ? "front" : "back"))}
              >
                <Ionicons name="camera-reverse" size={24} color={colors.white} />
              </Pressable>
            </View>

            {/* Viewfinder Target in Center */}
            <View style={styles.viewfinderCenter}>
              <View style={[styles.vfCorner, styles.vfTopLeft]} />
              <View style={[styles.vfCorner, styles.vfTopRight]} />
              <View style={[styles.vfCorner, styles.vfBottomLeft]} />
              <View style={[styles.vfCorner, styles.vfBottomRight]} />
              <Text style={styles.vfHint}>Point camera at your food</Text>
            </View>

            <View style={styles.shutterRow}>
              <Pressable style={styles.shutterButton} onPress={handleCapture}>
                <View style={styles.shutterInner} />
              </Pressable>
            </View>
          </SafeAreaView>
        </CameraView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        {analysis ? (
          <MealResultCard
            analysis={analysis}
            photoUri={photo?.localUri ?? null}
            onSave={handleSave}
            onRetake={handleRetake}
            onBack={() => {
              if (isAuthenticated) {
                navigation.goBack();
              } else {
                handleRetake();
              }
            }}
            saving={saving}
            saveLabel={isAuthenticated ? "Done" : "Sign Up to Lock in"}
          />
        ) : (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Brand Header */}
              <View style={styles.brandRow}>
                <View style={styles.brandGroup}>
                  <View style={styles.brandIconCircle}>
                    <Ionicons name="scan-outline" size={18} color={colors.primaryGreenDark} />
                  </View>
                  <Text style={styles.brandMark}>Ahaar AI</Text>
                </View>

                {isAuthenticated ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close scanner"
                    onPress={() => navigation.goBack()}
                    style={styles.closeBtn}
                  >
                    <Ionicons name="close" size={20} color={colors.textPrimary} />
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Profile"
                    onPress={() => navigation.navigate("Profile")}
                    style={styles.closeBtn}
                  >
                    <Ionicons name="person-outline" size={20} color={colors.textPrimary} />
                  </Pressable>
                )}
              </View>

              {/* FitBite-style Hero Banner */}
              <View style={styles.heroCard}>
                <View style={styles.greenTagBadge}>
                  <Ionicons name="leaf" size={13} color={colors.primaryGreenDark} />
                  <Text style={styles.greenTagText}>Smart Nutrition AI</Text>
                </View>
                <Text style={styles.heroTitle}>Your Daily Guide to Smarter Eating.</Text>
                <Text style={styles.heroSubtitle}>
                  Accurately recognize Bangladeshi home cooking and track calories with a single photo.
                </Text>

                {/* Optional Context Input */}
                <View style={styles.contextBox}>
                  <Text style={styles.contextLabel}>Add meal details (optional)</Text>
                  <TextInput
                    style={styles.contextInput}
                    placeholder='e.g. "1 plate beef tehari with begun bhaji"'
                    placeholderTextColor={colors.textMuted}
                    value={contextText}
                    onChangeText={setContextText}
                    multiline
                    maxLength={200}
                  />
                </View>
              </View>

              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              {/* Action Buttons */}
              <View style={styles.ctaSection}>
                {/* Signature Large Fresh Green Scan Button */}
                <PrimaryButton
                  title="Scan Your Food"
                  onPress={handleOpenCamera}
                  variant="primary"
                  size="lg"
                  icon={<Ionicons name="scan" size={22} color={colors.white} />}
                  style={styles.primaryCta}
                />
                <PrimaryButton
                  title="Choose from Gallery"
                  onPress={handlePickFromGallery}
                  variant="secondary"
                  size="md"
                  icon={<Ionicons name="images-outline" size={18} color={colors.primaryGreenDark} />}
                />
              </View>

              <Text style={styles.footnote}>
                No account needed to try it out. We silently create a guest session so your first scan
                is safe.
              </Text>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>

      <LoadingOverlay
        visible={loadingStage !== null}
        message={loadingStage ? LOADING_COPY[loadingStage].message : undefined}
        subMessage={loadingStage ? LOADING_COPY[loadingStage].subMessage : undefined}
      />
    </View>
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
  },
  brandGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  brandIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.greenSoft,
    borderWidth: 1.5,
    borderColor: colors.greenSoftBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  brandMark: {
    ...typography.h3,
    fontSize: 19,
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
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.sm,
    ...shadow.card,
  },
  greenTagBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.greenSoft,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
    marginBottom: 4,
  },
  greenTagText: {
    ...typography.tiny,
    fontSize: 11,
    color: colors.primaryGreenDark,
    fontWeight: "800",
  },
  heroTitle: {
    ...typography.display,
    fontSize: 28,
    color: colors.textPrimary,
    fontWeight: "800",
    lineHeight: 34,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  contextBox: {
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
  },
  contextLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xxs,
  },
  contextInput: {
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 44,
    textAlignVertical: "top",
  },
  ctaSection: {
    gap: spacing.md,
  },
  primaryCta: {
    ...shadow.scannerBtn,
  },
  footnote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    lineHeight: 18,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    textAlign: "center",
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: colors.black,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  cameraTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cameraIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewfinderCenter: {
    alignSelf: "center",
    width: 260,
    height: 260,
    justifyContent: "center",
    alignItems: "center",
  },
  vfCorner: {
    position: "absolute",
    width: 32,
    height: 32,
    borderColor: colors.primaryGreen,
  },
  vfTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 12,
  },
  vfTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 12,
  },
  vfBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 12,
  },
  vfBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 12,
  },
  vfHint: {
    ...typography.tiny,
    color: colors.white,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    fontWeight: "700",
  },
  shutterRow: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  shutterButton: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: colors.primaryGreen,
  },
});
