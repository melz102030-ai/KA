# @akbadna/mobile

تطبيق أكبادنا — **Expo (React Native + Web)** → iOS + Android + PWA من كود واحد.

## التشغيل

```bash
npm install                      # من جذر المستودع
npm run core:build               # بناء الأنواع المشتركة أولاً
npm run mobile                   # = expo start
#   اضغط w للويب · i لـ iOS · a لأندرويد · أو امسح QR بتطبيق Expo Go
npm run typecheck -w @akbadna/mobile
npm run export:web -w @akbadna/mobile
```

## البنية

```
app/                       مسارات Expo Router (file-based)
  _layout.tsx              الجذر: الخطوط، RTL، AuthProvider، Splash
  index.tsx                يوجّه إلى الدخول أو التبويبات حسب الجلسة
  (auth)/sign-in.tsx       اختيار الدور + دخول تجريبي (+ حقل جوال جاهز لـ OTP)
  (tabs)/_layout.tsx       شريط التبويب السفلي
  (tabs)/index.tsx         الرئيسية — ساعة، الحصة، حيويات الأبناء
  (tabs)/attendance.tsx    الحضور — كشف + تحديد حالة
  (tabs)/carpool.tsx       كاربول — (قيد التطوير)
  (tabs)/messages.tsx      الرسائل
  (tabs)/more.tsx          المزيد — تبديل الدور، الأدوات، خروج
src/
  theme/                   الرموز البصرية (ألوان، مسافات، خطوط)
  components/               مكوّنات أساسية (Screen, Card, Button, Avatar, …)
  lib/firebase.ts          تهيئة Firebase (تُعاد قراءتها من EXPO_PUBLIC_*)
  lib/auth.tsx             AuthProvider + useAuth (دخول مجهول + bootstrapProfile)
  lib/functions.ts         استدعاء دوال Cloud مع تحقق zod من @akbadna/core
  lib/time.ts              حسابات الجدول والوقت
  data/hooks.ts            اشتراكات Firestore الحيّة (useKids, useAlerts)
  data/demo.ts             بيانات عرض حتى تُربط مدرسة/ساعة
```

## الدخول

- **الآن:** "دخول تجريبي سريع" → `signInAnonymously` + إنشاء بروفايل `users/{uid}`.
- **الجوال (OTP):** الواجهة جاهزة؛ يتطلب Dev Build + reCAPTCHA/`@react-native-firebase`
  على الأجهزة. يعمل على الويب مباشرة عبر `RecaptchaVerifier` (يُوصل لاحقًا).
- **نفاذ/نور:** خلف نفس الواجهة، يُفعّل عند توفّر الاتفاقيات.

## ملاحظات RN

- الوضع الداكن ثابت، RTL مُفعّل عبر `I18nManager.forceRTL` (يحتاج إعادة تشغيل مرة أولى على الأجهزة).
- الخطوط: Tajawal + Space Mono عبر `@expo-google-fonts`.
