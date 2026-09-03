import type { Kid, Message, SchedulePeriod } from "@akbadna/core";

/** In-memory sample data so screens render before a real school is connected. */

export const DEMO_KIDS: Kid[] = [
  {
    id: "demo-k1",
    name: "أحمد محمد الغامدي",
    photoEmoji: "👦",
    gradeLabel: "أول متوسط - أ",
    guardianUids: ["demo"],
    akbadnaId: "AKB-7X3K-9P2Q",
    live: {
      presence: "in_class",
      heartRate: 84,
      skinTempC: 36.7,
      batteryPct: 78,
      steps: 2450,
      watchOnline: true,
      lastTelemetryAt: Date.now(),
    },
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "demo-k2",
    name: "منى محمد الغامدي",
    photoEmoji: "👧",
    gradeLabel: "ثاني ابتدائي - ب",
    guardianUids: ["demo"],
    akbadnaId: "AKB-4M8T-1L6R",
    live: {
      presence: "break",
      heartRate: 90,
      skinTempC: 36.5,
      batteryPct: 91,
      steps: 3110,
      watchOnline: true,
      lastTelemetryAt: Date.now(),
    },
    createdAt: 0,
    updatedAt: 0,
  },
];

export const DEMO_SCHEDULE: SchedulePeriod[] = [
  { index: 0, name: "الطابور", start: "07:00", end: "07:30", kind: "assembly" },
  { index: 1, name: "الحصة الأولى", start: "07:30", end: "08:15", kind: "lesson" },
  { index: 2, name: "الحصة الثانية", start: "08:15", end: "09:00", kind: "lesson" },
  { index: 3, name: "استراحة", start: "09:00", end: "09:20", kind: "break" },
  { index: 4, name: "الحصة الثالثة", start: "09:20", end: "10:05", kind: "lesson" },
  { index: 5, name: "الحصة الرابعة", start: "10:05", end: "10:50", kind: "lesson" },
  { index: 6, name: "استراحة كبرى", start: "10:50", end: "11:20", kind: "break" },
  { index: 7, name: "الحصة الخامسة", start: "11:20", end: "12:05", kind: "lesson" },
  { index: 8, name: "الحصة السادسة", start: "12:05", end: "12:50", kind: "lesson" },
  { index: 9, name: "الانصراف", start: "12:50", end: "13:00", kind: "dismissal" },
];

export const DEMO_MESSAGES: (Message & { channel: string })[] = [
  {
    id: "m1",
    threadId: "t-school",
    senderUid: "school",
    senderName: "المدرسة",
    text: "اجتماع أولياء الأمور الأحد الساعة 5 مساءً",
    at: Date.now() - 3600_000,
    system: false,
    attachments: [],
    readBy: [],
    channel: "school",
  },
  {
    id: "m2",
    threadId: "t-carpool",
    senderUid: "abu-khaled",
    senderName: "أبو خالد",
    text: "صباح الخير، هل أحمد جاهز؟ سأكون عندكم خلال 10 دقائق",
    at: Date.now() - 7200_000,
    system: false,
    attachments: [],
    readBy: [],
    channel: "carpool",
  },
  {
    id: "m3",
    threadId: "t-alert",
    senderUid: "system",
    senderName: "أكبادنا",
    text: "تنبيه: نبض أحمد مرتفع قليلاً — 102 bpm",
    at: Date.now() - 10800_000,
    system: true,
    attachments: [],
    readBy: [],
    channel: "alert",
  },
];
