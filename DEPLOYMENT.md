# النشر — أكبادنا

المشروع في Firebase: **`kasa-dcabd`**. كل الأوامر من جذر المستودع ما لم يُذكر غير ذلك.

---

## 0. متطلبات لمرة واحدة

```bash
npm install -g firebase-tools
firebase login
firebase use kasa-dcabd            # يكتب .firebaserc محليًا (غير متتبَّع)
```

في **وحدة تحكم Firebase**:

1. **Build → Authentication → Sign-in method**: فعّل **Anonymous**. (ولاحقًا **Phone** لدخول OTP.)
2. **Build → Firestore Database → Create database** (الموقع الأقرب: `eur3` أو `nam5`).
3. **⚙️ → Usage and billing → Modify plan → Blaze** (Cloud Functions تتطلبها).
4. **Project settings → Your apps**: تأكد من وجود تطبيق ويب (لـ `apps/web` و `apps/mobile`)
   وأضف تطبيق **Android** بحزمة `sa.akbadna.watch` ثم نزّل `google-services.json`
   إلى `apps/watch/app/`.

---

## 1. قواعد وفهارس Firestore

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

- `firestore.rules` — العميل قراءة غالبًا؛ الكتابات المتميّزة عبر Functions فقط.
- `firestore.indexes.json` — الفهارس المركّبة لمعالجات telemetry والتنبيهات.

---

## 2. Cloud Functions (`services/functions`)

```bash
npm run core:build                       # الأنواع المشتركة أولاً
npm run build -w @akbadna/functions
firebase deploy --only functions
```

المنطقة: `europe-west1` (مضبوطة في الكود). الدوال المنشورة:

| الدالة              | النوع        | الغرض                                                        |
| ------------------- | ------------ | ------------------------------------------------------------ |
| `bootstrapProfile`  | callable     | إنشاء/تحديث `users/{uid}` بعد أول دخول                       |
| `submitAttendance`  | callable     | حضور جماعي — الخادم مرجع الكشف، idempotent، الغياب ضمني      |
| `resolveAkbadnaId`  | callable     | بحث عن ساعة بمعرّف أكبادنا العام                             |
| `raiseSos`          | callable     | رفع تنبيه SOS + إشعار أولياء الأمر                           |
| `onTelemetryPacket` | Firestore    | تحديث `kid.live` + تقييم قواعد التنبيه (SOS/بطارية/نبض/سياج) |
| `watchOfflineSweep` | scheduled 5د | تحويل الساعات الصامتة إلى offline                            |

اختبار محلي:

```bash
firebase emulators:start --only functions,firestore,auth
```

---

## 3. تطبيق الويب (`apps/web`)

### Vercel (الحالي)

متصل بالمستودع. الإعداد في `vercel.json`:

- تثبيت مُنطاق: جذر + `@akbadna/core` + `@akbadna/web` فقط
- بناء: `core:build` ثم `vite build`
- المخرجات: `apps/web/dist`، مع إعادة توجيه SPA

يُنشر تلقائيًا عند الدفع إلى `main`.

### بديل — Firebase Hosting

```bash
npm run core:build && npm run build -w @akbadna/web
firebase deploy --only hosting        # ينشر apps/web/dist (مضبوط في firebase.json)
```

---

## 4. تطبيق الموبايل (`apps/mobile`) — Expo / EAS

### تطوير

```bash
npm run mobile           # expo start — w=ويب، i=iOS، a=Android، أو Expo Go
```

### PWA / ويب

```bash
npm run export:web -w @akbadna/mobile   # → apps/mobile/dist (استضِفه في أي مكان)
```

### بناء المتاجر (يحتاج حساب Expo + حسابات مطوّرين)

```bash
npm install -g eas-cli && eas login
cd apps/mobile
eas build:configure
eas build --platform android          # AAB لمتجر Play
eas build --platform ios              # يحتاج حساب Apple Developer
eas submit --platform android
eas submit --platform ios
```

- معرّفات الحزم: `sa.akbadna.app` (iOS + Android) — مضبوطة في `app.json`.
- **دخول OTP على الأجهزة:** يحتاج Dev Build + reCAPTCHA / `@react-native-firebase`.
  يعمل على الويب مباشرة. الآن الأجهزة تستخدم "الدخول التجريبي".

---

## 5. تطبيق الساعة (`apps/watch`) — Wonlex KT37

يُفتح كمشروع مستقل في **Android Studio** (ليس ضمن npm workspaces).

```bash
cd apps/watch
# ضع google-services.json في app/ (من وحدة تحكم Firebase — تطبيق Android)
./gradlew assembleRelease
# apps/watch/app/build/outputs/apk/release/app-release.apk
adb install -r app-release.apk        # على ساعة KT37 عبر ADB
```

- `minSdk = 27` (Android 8.1 على KT37).
- الأذونات: الموقع في الخلفية + `BODY_SENSORS` + خدمة foreground.
- الاقتران: التطبيق يطلب رمزًا من ولي الأمر → `confirmWatchPairing` → يخزّن `watchId`.

---

## 6. ترتيب النشر الموصى به

1. Auth (Anonymous) + Firestore + Blaze في وحدة التحكم
2. `firestore:rules,firestore:indexes`
3. `functions`
4. الويب (Vercel تلقائي، أو `firebase deploy --only hosting`)
5. الموبايل عبر EAS
6. APK الساعة يدويًا على جهاز KT37

## 7. أسرار / إعدادات البيئة

- إعداد Firebase للويب ليس سرًّا (يُطابق `apps/web/src/firebase.js`).
  لتجاوزه في الموبايل: `apps/mobile/.env.local` بمتغيرات `EXPO_PUBLIC_FIREBASE_*`.
- لا تُودَع في المستودع: `.firebaserc`، `google-services.json`، ملفات توقيع Android/iOS.
