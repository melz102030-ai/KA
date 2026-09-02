// ─── Canonical seed data ─────────────────────────────────────────────────────
// First run writes these into Firestore (collections: kids, messages).
// After that, Firestore is the source of truth and these are only a fallback
// for offline / first paint.

export const KIDS_SEED = [
  { id: "K1", name: "أحمد محمد الغامدي", grade: "أول متوسط - أ", photo: "👦", school: "متوسطة النور", hr: 82, temp: 36.7, battery: 78, status: "in_class", akbId: "AKB-7X3K-9P2Q" },
  { id: "K2", name: "منى محمد الغامدي", grade: "ثاني ابتدائي - ب", photo: "👧", school: "ابتدائية الأمل", hr: 88, temp: 36.5, battery: 91, status: "break", akbId: "AKB-4M8T-1L6R" },
];

export const MESSAGES_SEED = [
  { id: "1", from: "المدرسة", text: "اجتماع أولياء الأمور الأحد الساعة 5 مساءً", time: "10:30", type: "school", read: false, order: 1 },
  { id: "2", from: "أبو خالد", text: "صباح الخير، هل أحمد جاهز؟ سأكون عندكم خلال 10 دقائق", time: "06:50", type: "carpool", read: false, order: 2 },
  { id: "3", from: "أ. سعيد", text: "أحمد أدى اختباراً ممتازاً اليوم، ما شاء الله!", time: "أمس", type: "teacher", read: true, order: 3 },
  { id: "4", from: "أكبادنا", text: "تنبيه: نبض أحمد مرتفع قليلاً — 102 bpm", time: "09:15", type: "alert", read: true, order: 4 },
];
