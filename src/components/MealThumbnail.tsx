import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { resolveMealPhotoUri } from "../lib/photos";
import { colors, radii } from "../theme";

interface MealThumbnailProps {
  uri: string | null;
  dishName: string;
  size?: number;
}

export function MealThumbnail({ uri, dishName, size = 64 }: MealThumbnailProps) {
  const [resolvedUri, setResolvedUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    setFailed(false);
    if (!uri) {
      setResolvedUri(null);
      return;
    }
    void resolveMealPhotoUri(uri).then((result) => {
      if (mounted) setResolvedUri(result);
    });
    return () => {
      mounted = false;
    };
  }, [uri]);

  const showImage = resolvedUri && !failed;
  const initial = dishName.trim().charAt(0).toUpperCase() || "🍛";

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size * 0.28 },
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: resolvedUri }}
          style={[styles.image, { borderRadius: size * 0.28 }]}
          onError={() => setFailed(true)}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.fallbackContainer}>
          <Text style={[styles.initial, { fontSize: size * 0.38 }]}>{initial}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  fallbackContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    color: colors.textSecondary,
    fontWeight: "700",
  },
});
