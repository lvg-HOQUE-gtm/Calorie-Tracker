import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import {
  DefaultTheme as NavigationDefaultTheme,
  NavigationContainer,
  type Theme as NavigationTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { CrashScreen, ErrorBoundary } from "./src/components";
import { GoalsProvider } from "./src/lib/goals";
import { subscribeJsCrash } from "./src/lib/jsCrash";
import { SessionProvider, useSession } from "./src/lib/session";
import { OnboardingCameraScreen } from "./src/screens/OnboardingCameraScreen";
import { AuthScreen } from "./src/screens/AuthScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { HistoryScreen } from "./src/screens/HistoryScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { PrivacyScreen } from "./src/screens/PrivacyScreen";
import { colors } from "./src/theme";
import type { RootStackParamList } from "./src/navigation/types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme: NavigationTheme = {
  ...NavigationDefaultTheme,
  colors: {
    ...NavigationDefaultTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.flame,
  },
};

function LoadingRoot() {
  return (
    <View style={styles.loadingRoot}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

/**
 * Navigation architecture matching Cal AI:
 * - Unauthenticated guest: OnboardingCameraScreen (Landing hook + Scan + Results) -> AuthScreen
 * - Authenticated user: DashboardScreen (Home) -> HistoryScreen (Track Progress) -> OnboardingCameraScreen (Scan)
 */
function RootNavigator() {
  const { isReady, isAuthenticated } = useSession();

  if (!isReady) {
    return <LoadingRoot />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
      }}
    >
      {isAuthenticated ? (
        <Stack.Group>
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="History" component={HistoryScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen
            name="Privacy"
            component={PrivacyScreen}
            options={{ animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="Onboarding"
            component={OnboardingCameraScreen}
            options={{ animation: "slide_from_bottom" }}
          />
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen name="Onboarding" component={OnboardingCameraScreen} />
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{ animation: "slide_from_bottom" }}
          />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen
            name="Privacy"
            component={PrivacyScreen}
            options={{ animation: "slide_from_bottom" }}
          />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });
  const [jsCrash, setJsCrash] = useState<string | null>(null);

  useEffect(() => subscribeJsCrash(setJsCrash), []);

  if (jsCrash) {
    return (
      <SafeAreaProvider>
        <CrashScreen message={jsCrash} />
      </SafeAreaProvider>
    );
  }

  if (!fontsLoaded && !fontError) {
    return (
      <SafeAreaProvider>
        <LoadingRoot />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <SessionProvider>
          <GoalsProvider>
            <StatusBar style="dark" />
            <NavigationContainer theme={navigationTheme}>
              <RootNavigator />
            </NavigationContainer>
          </GoalsProvider>
        </SessionProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
});
