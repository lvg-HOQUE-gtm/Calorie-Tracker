import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "../theme";

interface Props {
  children: ReactNode;
}

interface State {
  message: string | null;
}

export function CrashScreen({ message }: { message: string }) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Ahaar AI hit an error</Text>
      <Text style={styles.hint}>Screenshot this and send it so we can fix the crash.</Text>
      <ScrollView style={styles.scroll}>
        <Text selectable style={styles.body}>
          {message}
        </Text>
      </ScrollView>
    </View>
  );
}

/**
 * Shows the real JS error on device instead of Android "keeps stopping".
 * Native (C++) crashes still cannot be caught here.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { message: null };

  static getDerivedStateFromError(error: Error): State {
    return { message: `${error.name}: ${error.message}` };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[Ahaar AI] render crash", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.message) {
      return <CrashScreen message={this.state.message} />;
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  hint: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  scroll: {
    flex: 1,
  },
  body: {
    ...typography.caption,
    color: colors.flame,
  },
});
