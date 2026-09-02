# أكبادنا (Akbadna)

منصة تعليم ذكية لمتابعة الأبناء عبر الساعة الذكية — واجهة عربية (RTL) مصمّمة للجوال.

## المزايا

- **الرئيسية:** ساعة كبيرة، الحصة الحالية والتالية، مؤشرات صحة الأبناء (نبض / حرارة / بطارية).
- **الحضور:** تسجيل حضور الطلاب حسب الدور (ولي أمر / معلم / طالب).
- **الكاربول:** البحث عن توصيلة أو الإعلان عن رحلة، نظام طلب وموافقة داخل التطبيق مع محادثة مباشرة وتتبع الرحلة.
- **الرسائل:** رسائل من المدرسة والمعلمين وأولياء أمور الكاربول وتنبيهات أكبادنا.
- **معرّف أكبادنا (Akbadna ID):** إضافة جهات اتصال بالمعرّف بدل رقم الجوال.
- **الجدول، الصحة، المحفظة، نظام نور، لوحة مباشر، تتبع الخروج** ضمن قائمة "المزيد".
- **الدخول عبر نفاذ** مع حفظ الجلسة وفتح سريع (Face ID / PIN).

## التقنيات

- [Vite](https://vite.dev/) + [React 18](https://react.dev/)
- [Firebase](https://firebase.google.com/) — Auth (مجهول) + Firestore
- ملف واحد `src/App.jsx` يحتوي كامل الواجهة والأنماط (`GLOBAL_CSS` مضمّن).

## Firebase

المشروع: `kasa-dcabd`. الإعداد في [src/firebase.js](src/firebase.js) (مفتاح الويب ليس سرًّا — الحماية من قواعد الأمان).

| الجزء | الملف | الوظيفة |
|---|---|---|
| تهيئة | `src/firebase.js` | `app`, `auth`, `db` |
| الجلسة + الدخول | `src/auth.js` | دخول مجهول عند نجاح نفاذ، وحفظ البروفايل `{role, pin, faceId}` في `users/{uid}`. الجلسة تبقى بعد إعادة التحميل عبر Firebase نفسه |
| البيانات | `src/data/store.js` | `useKids()` / `useMessages()` — اشتراك حيّ `onSnapshot` مع بذر أولي من `src/data/seed.js` عند أول تشغيل |
| القواعد | `firestore.rules` | كل مستخدم مسجّل يقرأ/يكتب `kids` و`messages`؛ ويعدّل بروفايله فقط |

**خطوات لازمة في وحدة تحكم Firebase:**
1. **Authentication** → فعّل مزوّد **Anonymous**.
2. **Firestore Database** → أنشئ القاعدة (ابدأ بوضع الاختبار، أو انشر `firestore.rules`).
3. نشر القواعد: `npx firebase deploy --only firestore:rules`

عند أول تشغيل تُبذر مجموعتا `kids` و`messages` تلقائيًّا من `seed.js`. باقي الشاشات (الكاربول، الحضور، المعرّف، المحفظة) ما زالت على بيانات وهمية محلية — نقلها لـ Firestore هو الخطوة التالية بنفس نمط `store.js`.

## التشغيل

```bash
npm install
npm run dev      # خادم تطوير على http://localhost:5173
npm run build    # بناء الإنتاج في dist/
npm run preview  # معاينة نسخة الإنتاج
```

## البنية

```
index.html            # جذر الصفحة، lang="ar" dir="rtl"
firebase.json         # إعداد Firestore + Hosting
firestore.rules       # قواعد أمان Firestore
src/
  main.jsx            # نقطة الدخول
  App.jsx             # كامل الواجهة (مكوّن افتراضي واحد)
  firebase.js         # تهيئة Firebase
  auth.js             # الجلسة وتسجيل الدخول
  data/
    store.js          # هوكات Firestore الحيّة (useKids / useMessages)
    seed.js           # البيانات الأولية
  index.css           # إعادة تهيئة بسيطة قبل تركيب React
public/
  watch.svg           # أيقونة الموقع
```
