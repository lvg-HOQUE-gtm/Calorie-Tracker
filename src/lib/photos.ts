import { Platform } from "react-native";
import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import type { MealPhoto } from "../types";

const MAX_DIMENSION = 800;
const COMPRESS_QUALITY = 0.7;
const MEALS_DIR_NAME = "meals";

function mealsDirUri(): string | null {
  if (!FileSystem.documentDirectory) return null;
  return `${FileSystem.documentDirectory}${MEALS_DIR_NAME}/`;
}

async function ensureMealsDir(): Promise<string | null> {
  const dir = mealsDirUri();
  if (!dir) return null; // No native persistent filesystem (web).
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

/** Scales down to fit within an 800x800 box while preserving aspect ratio. */
function fitWithinBox(width?: number, height?: number): { width: number; height?: number } {
  if (!width || !height) {
    return { width: MAX_DIMENSION };
  }
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
    return { width, height };
  }
  const scale = MAX_DIMENSION / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function pickFormat(): { format: SaveFormat; mimeType: MealPhoto["mimeType"]; extension: string } {
  // expo-image-manipulator's WEBP encoder is Android-only; iOS/web fall back
  // to JPEG, which lands in the same ~50-90KB range at this size and quality.
  if (Platform.OS === "android") {
    return { format: SaveFormat.WEBP, mimeType: "image/webp", extension: "webp" };
  }
  return { format: SaveFormat.JPEG, mimeType: "image/jpeg", extension: "jpg" };
}

/**
 * Resizes a freshly captured/picked photo down to a small (~50-90KB) image,
 * copies it out of the OS-managed cache directory into a stable app-owned
 * location, and returns the base64 payload needed for the analyze-meal call.
 *
 * The resize is primarily about scan speed, not storage: a 5MB photo becomes
 * ~6.7MB once base64-encoded, which is slow to upload on mobile data and
 * costs more image tokens. Persisting the result under `documentDirectory`
 * (instead of leaving it in `cacheDirectory`, where `expo-camera` and
 * `expo-image-picker` write by default) matters because iOS can purge the
 * cache under storage pressure, which would silently delete meal photos.
 */
export async function prepareMealPhoto(
  sourceUri: string,
  sourceWidth?: number,
  sourceHeight?: number
): Promise<MealPhoto> {
  const { format, mimeType, extension } = pickFormat();
  const targetSize = fitWithinBox(sourceWidth, sourceHeight);

  const context = ImageManipulator.manipulate(sourceUri).resize(targetSize);
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    compress: COMPRESS_QUALITY,
    format,
    base64: true,
  });

  const base64 = saved.base64 ?? "";
  const approxBytes = Math.round((base64.length * 3) / 4);
  const dir = await ensureMealsDir();

  if (!dir) {
    // No native persistent filesystem (web). The manipulator's own
    // (blob/data) URI is already owned by the browser tab.
    return {
      localUri: saved.uri,
      base64,
      mimeType,
      width: saved.width,
      height: saved.height,
      bytes: approxBytes,
    };
  }

  const filename = `${Crypto.randomUUID()}.${extension}`;
  const destinationUri = `${dir}${filename}`;
  await FileSystem.copyAsync({ from: saved.uri, to: destinationUri });

  return {
    localUri: destinationUri,
    base64,
    mimeType,
    width: saved.width,
    height: saved.height,
    bytes: approxBytes,
  };
}

/**
 * Confirms a previously saved meal photo still exists on disk. Log rows can
 * outlive their files (reinstall, new device, manual cache clearing), so
 * callers should fall back to a placeholder thumbnail when this resolves to
 * null instead of rendering a broken image.
 */
export async function resolveMealPhotoUri(uri: string | null | undefined): Promise<string | null> {
  if (!uri) return null;
  if (Platform.OS === "web") {
    // Native existence checks aren't available on web; <Image onError> drives the fallback there.
    return uri;
  }
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists ? uri : null;
  } catch {
    return null;
  }
}

/** Deletes a meal photo from local storage, if present. Safe to call with any URI. */
export async function deleteMealPhoto(uri: string | null | undefined): Promise<void> {
  if (!uri || Platform.OS === "web") return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Best-effort cleanup; a missing file is not an error worth surfacing.
  }
}
