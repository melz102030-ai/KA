# @akbadna/watch — تطبيق الساعة (Wonlex KT37)

APK يُثبَّت مباشرة على ساعة **Wonlex KT37** (Android 8.1، تقبل APK جانبي).
يقرأ الحساسات والموقع ويرفعها إلى Firebase كل 30 ثانية، ويستقبل الأوامر.

> هذا **هيكل مشروع** جاهز للفتح في Android Studio. لم يُبنَ هنا (يحتاج Android SDK + Gradle).
> افتح `apps/watch` كمشروع مستقل.

## طرق التكامل مع KT37 (بالترتيب المفضّل)

| #   | الطريقة                                                                             | الحالة                                                        |
| --- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1   | **APK على الساعة** (هذا المشروع) — Android SDK للحساسات/الموقع، رفع HTTPS/Firestore | الأساسية                                                      |
| 2   | **أوامر SMS** — `POSITION#`، `UPLOAD,30#`… عبر شريحة الساعة                         | احتياطية (كتالوج الأوامر في `@akbadna/core` → `SMS_COMMANDS`) |
| 3   | **جسر بروتوكول SeTracker** (GT06/JT808 على منفذ 8800) — سيرفر وسيط                  | لاحقًا، إن تعذّر تثبيت APK                                    |

## المعمارية

```
WatchApp.kt              تهيئة Firebase + قنوات الإشعارات
MainActivity.kt          شاشة الحالة (متصل/بطارية/آخر رفع) + زر SOS
pairing/
  PairingActivity.kt     إدخال/مسح رمز الاقتران (من تطبيق ولي الأمر)
  PairingRepository.kt    استدعاء confirmWatchPairing → يخزّن watchId + deviceToken
telemetry/
  TelemetryService.kt    Foreground Service — حلقة كل 30 ثانية
  SensorReader.kt        نبض (TYPE_HEART_RATE) + خطوات + بطارية + شريحة
  LocationReader.kt      FusedLocation / GPS_PROVIDER
  TelemetryUploader.kt   POST إلى دالة ingest أو كتابة Firestore
sos/
  SosReceiver.kt         ضغط زر SOS ‏3ث → raiseSos + اتصال بأرقام SOS
Config.kt                الثوابت (فترة الرفع، عناوين Firebase)
```

## حمولة telemetry

مطابقة لـ `TelemetryPacket` في `@akbadna/core`:

```json
{
  "watchId": "…",
  "imei": "…",
  "at": 0,
  "receivedAt": 0,
  "location": { "lat": 0, "lng": 0, "accuracy": 5 },
  "batteryPct": 78,
  "charging": false,
  "heartRate": 82,
  "skinTempC": 36.7,
  "steps": 1240,
  "signalBars": 4,
  "sos": false,
  "fall": false,
  "simPresent": true,
  "source": "apk"
}
```

الخادم (`services/functions/triggers/telemetry.ts`) يستقبلها ويحدّث `kid.live`
ويقيّم قواعد التنبيه (SOS، بطارية، نبض، سياج جغرافي).

## الأذونات المطلوبة (AndroidManifest)

`ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `BODY_SENSORS`,
`ACTIVITY_RECOGNITION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`,
`RECEIVE_BOOT_COMPLETED`, `INTERNET`, `SEND_SMS` (للطريقة الاحتياطية).

## البناء

```bash
cd apps/watch
./gradlew assembleRelease        # ينتج app/build/outputs/apk/release/app-release.apk
# ثبّت على الساعة عبر ADB أو متجرها الداخلي
adb install -r app-release.apk
```
