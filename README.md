# أكبادنا (Akbadna)

منصة تعليم ذكية لمتابعة الأبناء في المدرسة وأثناء التنقل، محورها ساعة ذكية
(**Wonlex KT37**) يلبسها الطالب، مع تطبيقات لولي الأمر والمعلم وإدارة المدرسة.

## المعمارية (Monorepo)

```
apps/
  web/              تطبيق الويب — نموذج مرجعي (Vite + React + Firebase)، منشور على Vercel
  mobile/           Expo — React Native + Web → iOS + Android + PWA من كود واحد
  watch/            تطبيق Android/Kotlin لساعة KT37 (APK جانبي) — هيكل جاهز
services/
  functions/        Firebase Cloud Functions (TypeScript) — منطق الأعمال
packages/
  core/             العمود الفقري: مخطط Firestore + أنواع TypeScript + تحقق zod + مواصفات الساعة + WatchGateway
```

الجذر يدير الحزم عبر **npm workspaces**. لغة المشروع **TypeScript** في كل مكان.
النشر: `DEPLOYMENT.md`.

## الحزمة الأساسية `@akbadna/core`

مصدر الحقيقة الوحيد للنموذج — يستهلكه الويب والموبايل و Functions وقواعد الأمان:

| ملف                | المحتوى                                                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `enums.ts`         | الأدوار، حالات الحضور، أنواع الرسائل والتنبيهات، دورة حياة الرحلات والطلبات والاقتران                                              |
| `common.ts`        | الوقت، الإحداثيات، الجوال السعودي، الهوية، IMEI، **معرّف أكبادنا** + مولّده، المبالغ                                               |
| `schema/*.ts`      | كل مجموعات Firestore (users, schools/classes, kids, watches + telemetry, attendance + rewards, messaging, carpool, wallet, safety) |
| `paths.ts`         | مسارات مستندات Firestore (تُبقي العميل و Functions والقواعد متطابقة)                                                               |
| `callables.ts`     | عقود دوال Cloud Functions (طلب/رد بـ zod)                                                                                          |
| `watch/kt37.ts`    | مواصفات KT37، توافق شبكات السعودية، كتالوج أوامر SMS                                                                               |
| `watch/gateway.ts` | `WatchGateway` — تجريد نقل الأوامر/التتبع (apk / sms / setracker)                                                                  |

## التشغيل

```bash
npm install
npm run core:build      # ابنِ الأنواع المشتركة أولاً
npm run web             # تطبيق الويب     → http://localhost:5173
npm run mobile          # تطبيق Expo      → اضغط w / i / a
npm test                # اختبارات @akbadna/core (Vitest)
npm run lint
npm run typecheck
```

## Firebase — يعمل بالكامل على الخطة المجانية (Spark)

المشروع: `kasa-dcabd`. لا حاجة لخطة Blaze. كل الكتابات تتم من العميل مباشرةً
على Firestore محميّةً بـ `firestore.rules`.

1. **Authentication** → فعّل **Anonymous** (و **Phone** لدخول OTP).
2. **Firestore Database** → أنشئ القاعدة.
3. `firebase deploy --only firestore:rules,firestore:indexes,hosting`

**Cloud Functions اختيارية** (تتطلب Blaze): مكتوبة كاملة في `services/functions`
كمسار ترقية — عند تفعيلها ضع `EXPO_PUBLIC_USE_FUNCTIONS=1` فتتحوّل نفس العمليات
لتمرّ عبر الدوال المنشورة دون تغيير أي شاشة. تضيف: تحقق من جهة الخادم، اقتران
KT37 (توكن جهاز)، خط أنابيب telemetry، إشعارات push، المهام المجدولة.

## خارطة الطريق

- [x] `@akbadna/core` — النموذج الكامل بـ TypeScript + 31 اختبار
- [x] **طبقة بيانات حيّة** — هوكات Firestore مُتحقَّقة بـ zod لكل مجموعة
- [x] **عمليات الكتابة من العميل** (خطة مجانية) — عائلات، مدارس/فصول،
      انضمام برمز، رسائل، حضور، محفظة، كاربول، جهات اتصال، SOS
- [x] **Onboarding** — ولي أمر ينشئ عائلة · معلم ينشئ/ينضم لمدرسة برمز
- [x] **دخول برقم الجوال (OTP)** على الويب
- [x] `apps/mobile` — Expo، كل الشاشات موصولة بالبيانات الحقيقية، مظهر مؤسسي
- [x] `services/functions` — 17 دالة كمسار ترقية اختياري (Blaze)
- [x] `apps/watch` — هيكل APK لساعة KT37
- [x] CI + اختبارات قواعد الأمان + نشر الويب (Vercel/Firebase Hosting)
- [ ] نشر القواعد والفهارس على مشروع Firebase (خطوة المستخدم)
- [ ] دخول OTP على الأجهزة عبر Dev Build (`@react-native-firebase`)
- [ ] بناء الموبايل عبر EAS ونشره على المتاجر
- [ ] APK الساعة واختباره على جهاز KT37 حقيقي
- [ ] تكامل نفاذ ونور الرسمي
