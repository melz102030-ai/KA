# أكبادنا (Akbadna)

منصة تعليم ذكية لمتابعة الأبناء في المدرسة وأثناء التنقل، محورها ساعة ذكية
(**Wonlex KT37**) يلبسها الطالب، مع تطبيقات لولي الأمر والمعلم وإدارة المدرسة.

## المعمارية (Monorepo)

```
apps/
  web/              تطبيق الويب الحالي — نموذج مرجعي يعمل بـ Vite + React + Firebase
  mobile/           (قادم) Expo — React Native + Web → iOS + Android + PWA من كود واحد
  watch/            (قادم) تطبيق Android/Kotlin لساعة KT37 (APK جانبي)
services/
  functions/        (قادم) Firebase Cloud Functions (TypeScript) — منطق الأعمال
  ingest/           (اختياري لاحقًا) جسر بروتوكول GT06/JT808 لسيراكر
packages/
  core/             العمود الفقري: مخطط Firestore + أنواع TypeScript + تحقق zod + مواصفات الساعة
  watch-protocol/   (قادم) عقد الساعة: أوامر SMS، حمولة telemetry، واجهة WatchGateway
```

الجذر يدير الحزم عبر **npm workspaces**. لغة المشروع **TypeScript** في كل مكان.

## الحزمة الأساسية `@akbadna/core`

مصدر الحقيقة الوحيد للنموذج — يستهلكه الويب والموبايل و Functions وقواعد الأمان:

| ملف | المحتوى |
|---|---|
| `enums.ts` | الأدوار، حالات الحضور، أنواع الرسائل والتنبيهات، دورة حياة الرحلات والطلبات |
| `common.ts` | الوقت، الإحداثيات، الجوال السعودي، الهوية، IMEI، **معرّف أكبادنا** + مولّده، المبالغ |
| `schema/*.ts` | كل مجموعات Firestore: المستخدمون، المدارس والفصول، الأبناء، الساعات و`telemetry`، الحضور والمكافآت، الرسائل، الكاربول، المحفظة، السياج الجغرافي والتنبيهات وجهات الاتصال |
| `paths.ts` | مسارات مستندات Firestore (تُبقي العميل و Functions والقواعد متطابقة) |
| `callables.ts` | عقود دوال Cloud Functions (طلب/رد بـ zod) |
| `watch/kt37.ts` | مواصفات KT37، توافق شبكات السعودية، كتالوج أوامر SMS |

بناء الحزمة: `npm run core:build`

## Firebase

المشروع: `kasa-dcabd`. الإعداد في `apps/web/src/firebase.js`.
مطلوب في وحدة التحكم: تفعيل **Anonymous Auth**، إنشاء **Firestore**، نشر `firestore.rules`.

## التشغيل

```bash
npm install            # تثبيت كل الحزم
npm run core:build     # بناء الأنواع المشتركة
npm run web            # تطبيق الويب على http://localhost:5173
npm run lint
npm run format
```

## خارطة الطريق

- [x] نموذج واجهة كامل (apps/web)
- [x] ربط Firebase أولي (Auth مجهول + Firestore حيّ لبعض البيانات)
- [x] `@akbadna/core` — النموذج الكامل بـ TypeScript
- [ ] `apps/mobile` — Expo، تحويل الشاشات لنظام مكوّنات RN
- [ ] `services/functions` — الحضور، التنبيهات، SOS، الكاربول، اقتران الساعة
- [ ] `apps/watch` — APK لساعة KT37 (الحساسات + الموقع + الرفع)
- [ ] دخول برقم الجوال (OTP)، ثم واجهة نفاذ/نور لاحقًا
- [ ] اختبارات (Vitest) + CI (GitHub Actions) + نشر (Firebase Hosting + متاجر التطبيقات)
