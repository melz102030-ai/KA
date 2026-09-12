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
 * Kuwahara filter: replaces each pixel with the mean of whichever surrounding
 * quadrant varies least. That is what flattens skin and hair into the smooth
 * painted patches a drawing has, while leaving the boundary between them sharp
 * — a plain blur would smear the boundary too and the result would just look
 * out of focus.
 */
function kuwahara(src: Uint8ClampedArray, n: number, radius: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  const at = (x: number, y: number) =>
    (Math.min(n - 1, Math.max(0, y)) * n + Math.min(n - 1, Math.max(0, x))) * 4;

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let bestVar = Infinity;
      let bestR = 0,
        bestG = 0,
        bestB = 0;

      // The four overlapping quadrants around (x, y).
      for (const [sx, sy] of [
        [-1, -1],
        [0, -1],
        [-1, 0],
        [0, 0],
      ] as const) {
        let sum = 0,
          sumSq = 0,
          r = 0,
          g = 0,
          b = 0,
          count = 0;
        for (let dy = 0; dy <= radius; dy++) {
          for (let dx = 0; dx <= radius; dx++) {
            const i = at(x + sx * radius + dx, y + sy * radius + dy);
            const pr = src[i]!,
              pg = src[i + 1]!,
              pb = src[i + 2]!;
            const lum = 0.299 * pr + 0.587 * pg + 0.114 * pb;
            sum += lum;
            sumSq += lum * lum;
            r += pr;
            g += pg;
            b += pb;
            count++;
          }
        }
        const mean = sum / count;
        const variance = sumSq / count - mean * mean;
        if (variance < bestVar) {
          bestVar = variance;
          bestR = r / count;
          bestG = g / count;
          bestB = b / count;
        }
      }

      const o = (y * n + x) * 4;
      out[o] = bestR;
      out[o + 1] = bestG;
      out[o + 2] = bestB;
      out[o + 3] = 255;
    }
  }
  return out;
}

/**
 * Turns a face photo into a flat colour drawing with ink outlines.
 *
 * Kuwahara smoothing → saturation lift → posterise to a handful of tones →
 * Sobel outline thickened by one pixel. All of it runs on the pixels already on
 * the device; the photo is never sent anywhere.
 *
 * It is a stylised version of the real photo, NOT a generated character: making
 * something that looks like a Bitmoji means detecting face landmarks and
 * redrawing from a character kit, which needs a model this app does not ship.
 *
 * Canvas-only, so web-only — React Native has no pixel access without a
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

      const frame = ctx.getImageData(0, 0, n, n);
      const original = new Uint8ClampedArray(frame.data);

      const smooth = kuwahara(original, n, 3);

      // Outlines are traced from the SMOOTHED luminance, not the raw pixels.
      // Sobel on a real photo fires on sensor noise, and the flat areas come
      // back speckled with black dots. Kuwahara preserves edges by
      // construction, so the real ones survive while the noise does not.
      const lum = new Float32Array(n * n);
      for (let i = 0, q = 0; i < smooth.length; i += 4, q++) {
        lum[q] = 0.299 * smooth[i]! + 0.587 * smooth[i + 1]! + 0.114 * smooth[i + 2]!;
      }

      // Saturation lift, then posterise. Few levels = poster, many = photo.
      const LEVELS = 6;
      const step = 255 / (LEVELS - 1);
      const p = frame.data;
      for (let i = 0; i < smooth.length; i += 4) {
        const grey = 0.299 * smooth[i]! + 0.587 * smooth[i + 1]! + 0.114 * smooth[i + 2]!;
        for (let c = 0; c < 3; c++) {
          const lifted = grey + (smooth[i + c]! - grey) * 1.5;
          p[i + c] = Math.round(Math.min(255, Math.max(0, lifted)) / step) * step;
        }
        p[i + 3] = 255;
      }

      // Sobel, thickened by a pass of dilation so the ink reads as a drawn line
      // rather than a one-pixel seam.
      const edge = new Uint8Array(n * n);
      for (let y = 1; y < n - 1; y++) {
        for (let x = 1; x < n - 1; x++) {
          const L = (dx: number, dy: number) => lum[(y + dy) * n + (x + dx)]!;
          const gx = -L(-1, -1) - 2 * L(-1, 0) - L(-1, 1) + L(1, -1) + 2 * L(1, 0) + L(1, 1);
          const gy = -L(-1, -1) - 2 * L(0, -1) - L(1, -1) + L(-1, 1) + 2 * L(0, 1) + L(1, 1);
          if (Math.hypot(gx, gy) > 70) edge[y * n + x] = 1;
        }
      }
      for (let y = 1; y < n - 1; y++) {
        for (let x = 1; x < n - 1; x++) {
          if (!edge[y * n + x]) continue;
          for (const [dx, dy] of [
            [1, 0],
            [0, 1],
          ] as const) {
            const i = ((y + dy) * n + (x + dx)) * 4;
            p[i] = 26;
            p[i + 1] = 22;
            p[i + 2] = 20;
          }
          const i = (y * n + x) * 4;
          p[i] = 26;
          p[i + 1] = 22;
          p[i + 2] = 20;
        }
      }

      ctx.putImageData(frame, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.src = dataUri;
  });
}
