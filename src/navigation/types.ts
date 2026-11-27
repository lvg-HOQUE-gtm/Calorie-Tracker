import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Dashboard: undefined;
  History: undefined;
  Profile: undefined;
  Privacy: undefined;
};

export type OnboardingScreenProps = NativeStackScreenProps<RootStackParamList, "Onboarding">;
export type AuthScreenProps = NativeStackScreenProps<RootStackParamList, "Auth">;
export type DashboardScreenProps = NativeStackScreenProps<RootStackParamList, "Dashboard">;
export type HistoryScreenProps = NativeStackScreenProps<RootStackParamList, "History">;
export type ProfileScreenProps = NativeStackScreenProps<RootStackParamList, "Profile">;
export type PrivacyScreenProps = NativeStackScreenProps<RootStackParamList, "Privacy">;
