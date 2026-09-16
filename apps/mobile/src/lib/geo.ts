import { Platform } from "react-native";

export type Coords = { lat: number; lng: number; accuracy?: number };

/**
 * The device's own position, used when a school marks where it stands.
 *
 * The app ships as a web build — that is what a parent installs from the link —
 * so the browser's geolocation is the real path, not a fallback. On a native
 * build this returns null rather than pretending: the caller offers manual
 * entry instead of a coordinate nobody measured.
 *
 * Accuracy is passed through untouched. A fix taken indoors can be off by a
 * hundred metres, and a school fence drawn around a bad fix marks children
 * absent while they sit in class — so the screen shows the figure and lets a
 * person judge it.
 */
export function captureLocation(timeoutMs = 15000): Promise<Coords | null> {
  if (Platform.OS !== "web" || typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? undefined,
        }),
      (err) => reject(new Error(geoMessage(err.code))),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}

function geoMessage(code: number): string {
  if (code === 1) return "رُفض إذن الموقع — اسمح به من إعدادات المتصفح ثم أعد المحاولة";
  if (code === 2) return "تعذّر تحديد الموقع — تأكد من تفعيل خدمة الموقع";
  return "انتهت مهلة تحديد الموقع — حاول من داخل فناء المدرسة";
}

/** Six decimals is about 0.1 m; more digits imply precision no phone has. */
export const fmtCoord = (n: number): string => n.toFixed(6);
