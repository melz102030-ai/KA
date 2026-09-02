/**
 * Wonlex KT37 — device reference.
 * Source: manufacturer spec sheet (Shenzhen Wonlex Technology Co., Ltd).
 * Used for pairing UI, capability gating and network-compatibility checks.
 */
export const KT37 = {
  model: "KT37",
  vendor: "Wonlex",
  os: { name: "Android", version: "8.1", acceptsSideloadedApk: true },
  soc: "ASR6801 (quad-core Cortex-A55 @ 1.5GHz)",
  memory: { ramMB: 1024, romGB: 8 },
  display: { type: "AMOLED", inches: 1.78, width: 368, height: 448 },
  cellular: {
    generation: "4G LTE",
    gsm: ["B2", "B3", "B5", "B8"],
    wcdma: ["B1", "B2", "B5", "B8"],
    lte: ["B1", "B2", "B3", "B5", "B7", "B8", "B20"],
    sim: "nano",
  },
  wifi: "802.11 b/g/n 2.4GHz",
  bluetooth: true,
  positioning: ["GPS", "AGPS", "LBS", "WIFI"] as const,
  sensors: {
    heartRate: true, // PPG, continuous
    accelerometer: true, // steps + fall heuristic
    sleep: true,
    skinTemperature: "some-2025-batches", // confirm with supplier
    spo2: false,
  },
  battery: { capacityMAh: 680, typicalDays: 2.5, standbyDays: 7, fullChargeHours: 2 },
  camera: { megapixels: 2, position: "front" },
  water: "IP67",
  weightGrams: 49.7,
  telemetry: { defaultLocationIntervalSec: 30, minLocationIntervalSec: 10 },
} as const;

export type WatchModel = typeof KT37.model;

/** LTE bands each Saudi carrier needs for the KT37 to work. All are covered. */
export const SAUDI_CARRIER_BANDS = {
  STC: ["B3", "B7", "B20"],
  Zain: ["B3", "B7", "B20"],
  Mobily: ["B3", "B8", "B20"],
} as const;

export function isCarrierCompatible(carrier: keyof typeof SAUDI_CARRIER_BANDS): boolean {
  const need = SAUDI_CARRIER_BANDS[carrier];
  return need.every((b) => (KT37.cellular.lte as readonly string[]).includes(b));
}

/**
 * SeTracker-style SMS control commands (fallback channel when the companion APK
 * has no data link). Placeholders are filled by `buildSmsCommand`.
 */
export const SMS_COMMANDS = {
  requestPosition: "POSITION#",
  remoteMonitor: "MONITOR#",
  powerOff: "POWEROFF#",
  factoryReset: "RESET#",
  getImei: "IMEI#",
  setUploadInterval: "UPLOAD,{seconds}#",
  setCenterNumber: "CENTER,{phone}#",
  setSosPrimary: "SOSPHONE1,{phone}#",
  setSosSecondary: "SOS2,{phone}#",
  setAlarm: "ALARM1,{time}#",
  wipeSettings: "REMOVE#",
  syncTime: "TIMESYNC#",
} as const;

export type SmsCommandKey = keyof typeof SMS_COMMANDS;

export function buildSmsCommand(
  key: SmsCommandKey,
  params: Record<string, string | number> = {},
): string {
  return SMS_COMMANDS[key].replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = params[name];
    if (v === undefined) throw new Error(`SMS command ${key} missing param "${name}"`);
    return String(v);
  });
}
