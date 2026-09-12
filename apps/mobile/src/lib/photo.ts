import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

/** Everything is normalised to this before it is stored. ~30KB as JPEG. */
export const AVATAR_PX = 256;

export type PickResult = { uri: string } | { error: string } | null;

/**
 * Square-crop to the centre, shrink to AVATAR_PX and re-encode as JPEG, so a
 * 12-megapixel phone photo does not end up in device storage at full size.
 */
async function normalise(uri: string, width: number, height: number): Promise<string> {
  const side = Math.min(width, height);
  const ctx = ImageManipulator.manipulate(uri)
    .crop({
      originX: Math.round((width - side) / 2),
      originY: Math.round((height - side) / 2),
      width: side,
      height: side,
    })
    .resize({ width: AVATAR_PX, height: AVATAR_PX });

  const image = await ctx.renderAsync();
  const out = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });
  return out.base64 ? `data:image/jpeg;base64,${out.base64}` : out.uri;
}

async function run(
  launch: () => Promise<ImagePicker.ImagePickerResult>,
  ask: () => Promise<ImagePicker.PermissionResponse>,
  denied: string,
): Promise<PickResult> {
  // The web build resolves permissions through the file input itself.
  if (Platform.OS !== "web") {
    const perm = await ask();
    if (!perm.granted) return { error: denied };
  }
  const res = await launch();
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  try {
    return { uri: await normalise(a.uri, a.width, a.height) };
  } catch {
    return { error: "تعذّرت معالجة الصورة" };
  }
}

/** Opens the camera. On a phone browser the file input opens the camera too. */
export const takePhoto = () =>
  run(
    () => ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false }),
    () => ImagePicker.requestCameraPermissionsAsync(),
    "لم يُسمح للتطبيق باستخدام الكاميرا",
  );

export const pickFromLibrary = () =>
  run(
    () =>
      ImagePicker.launchImageLibraryAsync({
        quality: 0.8,
        allowsEditing: false,
        mediaTypes: ["images"],
      }),
    () => ImagePicker.requestMediaLibraryPermissionsAsync(),
    "لم يُسمح للتطبيق بالوصول إلى الصور",
  );

/** Whether {@link cartoonify} can run here — it needs a real canvas. */
export const canCartoonify = Platform.OS === "web" && typeof document !== "undefined";

/**
 * Flattens the photo into a few blocks of flat colour with darkened edges — the
 * cartoon-sticker look, done on the pixels we already have rather than by
 * shipping the child's face to a model somewhere.
 *
 * Canvas-only, so web-only: React Native has no pixel access without adding a
 * graphics engine. Callers must check {@link canCartoonify} first.
 */
export function cartoonify(dataUri: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("decode failed"));
    img.onload = () => {
      const n = AVATAR_PX;
      const canvas = document.createElement("canvas");
      canvas.width = n;
      canvas.height = n;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return reject(new Error("no 2d context"));
      ctx.drawImage(img, 0, 0, n, n);

      const src = ctx.getImageData(0, 0, n, n);
      const p = src.data;
      const lum = new Float32Array(n * n);
      for (let i = 0, q = 0; i < p.length; i += 4, q++) {
        lum[q] = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
      }

      // Posterise to 5 levels, with saturation pushed up so the flat areas read
      // as drawn rather than as a badly compressed photo.
      const LEVELS = 5;
      const step = 255 / (LEVELS - 1);
      for (let i = 0, q = 0; i < p.length; i += 4, q++) {
        const grey = lum[q]!;
        for (let c = 0; c < 3; c++) {
          const boosted = grey + (p[i + c]! - grey) * 1.45;
          p[i + c] = Math.round(Math.min(255, Math.max(0, boosted)) / step) * step;
        }
      }

      // Sobel on the luminance we kept, painted back as the outline.
      for (let y = 1; y < n - 1; y++) {
        for (let x = 1; x < n - 1; x++) {
          const at = (dx: number, dy: number) => lum[(y + dy) * n + (x + dx)]!;
          const gx = -at(-1, -1) - 2 * at(-1, 0) - at(-1, 1) + at(1, -1) + 2 * at(1, 0) + at(1, 1);
          const gy = -at(-1, -1) - 2 * at(0, -1) - at(1, -1) + at(-1, 1) + 2 * at(0, 1) + at(1, 1);
          if (Math.sqrt(gx * gx + gy * gy) > 90) {
            const i = (y * n + x) * 4;
            p[i] = 32;
            p[i + 1] = 28;
            p[i + 2] = 24;
          }
        }
      }

      ctx.putImageData(src, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.src = dataUri;
  });
}
