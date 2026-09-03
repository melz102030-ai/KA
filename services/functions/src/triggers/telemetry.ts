import { onDocumentCreated } from "firebase-functions/v2/firestore";
import {
  distanceMeters,
  isInside,
  paths,
  type AlertKind,
  type GeoPoint,
  type TelemetryPacket,
} from "@akbadna/core";
import { db, now } from "../lib/admin.js";
import { notifyGuardians } from "../lib/notify.js";

const LOW_BATTERY_PCT = 20;

/**
 * telemetry/{watchId}/packets/{packetId} onCreate:
 *  1. refresh the denormalised kid.live snapshot + watch link state
 *  2. evaluate safety rules and raise alerts (deduped while one is still open)
 */
export const onTelemetryPacket = onDocumentCreated(
  { region: "europe-west1", document: "telemetry/{watchId}/packets/{packetId}" },
  async (event) => {
    const p = event.data?.data() as TelemetryPacket | undefined;
    if (!p) return;
    const watchId = event.params.watchId;

    const watchRef = db.doc(paths.watch(watchId));
    const watchSnap = await watchRef.get();
    const kidId: string | undefined = watchSnap.get("kidId");

    await watchRef.set(
      {
        link: "online",
        lastSeenAt: p.receivedAt,
        ...(p.location ? { lastLocation: p.location } : {}),
        ...(p.batteryPct != null ? { batteryPct: p.batteryPct } : {}),
        updatedAt: now(),
      },
      { merge: true },
    );

    if (!kidId) return;
    const kidRef = db.doc(paths.kid(kidId));
    const kidSnap = await kidRef.get();

    await kidRef.set(
      {
        live: {
          watchOnline: true,
          lastTelemetryAt: p.receivedAt,
          ...(p.heartRate != null ? { heartRate: p.heartRate } : {}),
          ...(p.skinTempC != null ? { skinTempC: p.skinTempC } : {}),
          ...(p.batteryPct != null ? { batteryPct: p.batteryPct } : {}),
          ...(p.steps != null ? { steps: p.steps } : {}),
          ...(p.location ? { location: p.location } : {}),
        },
        updatedAt: now(),
      },
      { merge: true },
    );

    const th = kidSnap.get("vitalsThresholds") ?? {};
    const hrMax = th.heartRateMax ?? 140;
    const hrMin = th.heartRateMin ?? 50;
    const tempMax = th.skinTempMaxC ?? 38.5;

    const fire = (
      kind: AlertKind,
      severity: "critical" | "warning",
      title: string,
      detail?: string,
    ) => raiseAlertOnce({ kind, severity, title, detail, kidId, watchId, location: p.location });

    if (p.sos) await fire("sos", "critical", "طلب استغاثة SOS");
    if (p.fall) await fire("fall_detected", "critical", "اشتباه سقوط");
    if (p.simPresent === false) await fire("sim_removed", "warning", "تمت إزالة شريحة الساعة");
    if (p.batteryPct != null && p.batteryPct <= LOW_BATTERY_PCT)
      await fire("low_battery", "warning", `بطارية الساعة ${p.batteryPct}%`);
    if (p.heartRate != null && (p.heartRate > hrMax || p.heartRate < hrMin))
      await fire("abnormal_heart_rate", "warning", `نبض غير معتاد: ${Math.round(p.heartRate)} bpm`);
    if (p.skinTempC != null && p.skinTempC > tempMax)
      await fire("abnormal_temperature", "warning", `حرارة مرتفعة: ${p.skinTempC.toFixed(1)}°`);

    if (p.location) await evaluateGeofences(kidId, watchId, p.location);
  },
);

async function evaluateGeofences(kidId: string, watchId: string, loc: GeoPoint) {
  const fences = await db
    .collection(paths.geofences())
    .where("scope.kind", "==", "kid")
    .where("scope.id", "==", kidId)
    .where("enabled", "==", true)
    .get();

  for (const f of fences.docs) {
    const inside = isInside({ center: f.get("center"), radiusM: f.get("radiusM") }, loc);
    const wasInside: boolean = f.get("_lastInside") ?? inside;
    await f.ref.set({ _lastInside: inside }, { merge: true });

    const alertOn: string[] = f.get("alertOn") ?? ["exit"];
    if (wasInside && !inside && alertOn.includes("exit"))
      await raiseAlertOnce({
        kind: "geofence_exit",
        severity: "warning",
        title: `خروج من نطاق: ${f.get("name")}`,
        kidId,
        watchId,
        location: loc,
        detail: `على بعد ${Math.round(distanceMeters(f.get("center"), loc))}م من المركز`,
      });
    if (!wasInside && inside && alertOn.includes("enter"))
      await raiseAlertOnce({
        kind: "geofence_enter",
        severity: "info",
        title: `دخول نطاق: ${f.get("name")}`,
        kidId,
        watchId,
        location: loc,
      });
  }
}

type NewAlert = {
  kind: AlertKind;
  severity: "critical" | "warning" | "info";
  title: string;
  detail?: string;
  kidId?: string;
  watchId?: string;
  location?: GeoPoint;
};

/** Skip if an unresolved alert of the same kind for the same kid already exists. */
async function raiseAlertOnce(a: NewAlert): Promise<void> {
  if (a.kidId) {
    const dup = await db
      .collection(paths.alerts())
      .where("kidId", "==", a.kidId)
      .where("kind", "==", a.kind)
      .where("state", "in", ["open", "acknowledged"])
      .limit(1)
      .get();
    if (!dup.empty) return;
  }

  const ref = db.collection(paths.alerts()).doc();
  await ref.set({
    id: ref.id,
    kind: a.kind,
    severity: a.severity,
    state: "open",
    ...(a.kidId ? { kidId: a.kidId } : {}),
    ...(a.watchId ? { watchId: a.watchId } : {}),
    ...(a.location ? { location: a.location } : {}),
    title: a.title,
    ...(a.detail ? { detail: a.detail } : {}),
    raisedAt: now(),
    notifiedUids: [] as string[],
    createdAt: now(),
    updatedAt: now(),
  });

  if (a.kidId && a.severity !== "info")
    await notifyGuardians(a.kidId, {
      title: a.severity === "critical" ? `🆘 ${a.title}` : `⚠️ ${a.title}`,
      body: a.detail ?? "افتح تطبيق أكبادنا للتفاصيل",
      data: { alertId: ref.id, kind: a.kind },
    });
}
