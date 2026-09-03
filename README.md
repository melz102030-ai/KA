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

## Firebase

المشروع: `kasa-dcabd`. مطلوب في وحدة التحكم قبل التشغيل الكامل:

1. **Authentication** → فعّل مزوّد **Anonymous** (ولاحقًا Phone).
2. **Firestore Database** → أنشئ القاعدة.
3. رقّ المشروع إلى خطة **Blaze** (لازمة لـ Functions).
4. `firebase deploy --only firestore:rules,firestore:indexes,functions`

## خارطة الطريق

- [x] نموذج واجهة كامل (`apps/web`)
- [x] `@akbadna/core` — النموذج الكامل بـ TypeScript + 29 اختبار
- [x] `services/functions` — الحضور، خط أنابيب telemetry، التنبيهات، SOS، الاقتران
- [x] `apps/mobile` — Expo، نظام مكوّنات RN، 5 تبويبات، دخول، يبني للويب
- [x] `apps/watch` — هيكل APK لساعة KT37 (حساسات + موقع + رفع + اقتران + SOS)
- [x] CI (GitHub Actions) + نشر الويب (Vercel)
- [ ] دخول برقم الجوال (OTP) على الأجهزة عبر Dev Build
- [ ] بناء الموبايل عبر EAS ونشره على المتاجر
- [ ] بناء APK الساعة واختباره على جهاز KT37 حقيقي
- [ ] تكامل نفاذ ونور الرسمي
- [ ] بقية الشاشات (كاربول كامل، المحفظة، نظام نور، اللوحة المباشرة، تتبع الخروج)
