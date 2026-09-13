import type { SchedulePeriod } from "@akbadna/core";

export const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes();

export const clockToMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export function currentPeriod(schedule: SchedulePeriod[], now: Date) {
  const m = minutesOfDay(now);
  return schedule.find((p) => m >= clockToMinutes(p.start) && m < clockToMinutes(p.end)) ?? null;
}

export function nextPeriod(schedule: SchedulePeriod[], now: Date) {
  const m = minutesOfDay(now);
  return schedule.find((p) => clockToMinutes(p.start) > m) ?? null;
}

export function periodProgress(p: SchedulePeriod, now: Date) {
  const start = clockToMinutes(p.start);
  const end = clockToMinutes(p.end);
  return Math.max(0, Math.min(1, (minutesOfDay(now) - start) / (end - start)));
}

/* ── Dates ───────────────────────────────────────────────────────────────
 * Two things the "ar-SA" locale does NOT give us on its own, so both are
 * forced through locale extensions instead of trusting the runtime:
 *
 *   nu-latn  — plain "ar-SA" renders ٠١٢٣ (Arabic-Indic). We want 0123.
 *   ca-islamic-umalqura — plain "ar-SA" resolves to the Gregorian calendar
 *     on Node and Chrome alike, so the Hijri date has to be asked for.
 *
 * Month and weekday names are taken from the tables below rather than from
 * ICU, so the wording stays identical on every engine.
 */

const AR_WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const HIJRI_MONTHS = [
  "محرّم",
  "صفر",
  "ربيع الأول",
  "ربيع الآخر",
  "جمادى الأولى",
  "جمادى الآخرة",
  "رجب",
  "شعبان",
  "رمضان",
  "شوّال",
  "ذو القعدة",
  "ذو الحجة",
];

function makeFormat(locale: string, options: Intl.DateTimeFormatOptions) {
  try {
    return new Intl.DateTimeFormat(locale, options);
  } catch {
    return null; // A cut-down Intl (some Hermes builds) throws on extensions.
  }
}

const hijriFmt = makeFormat("en-u-ca-islamic-umalqura-nu-latn", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
});
const hijriUsable = hijriFmt?.resolvedOptions().calendar === "islamic-umalqura";

const timeFmt = makeFormat("ar-SA-u-nu-latn", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

/**
 * Tabular ("civil") Islamic calendar — used only when the engine's Intl has no
 * Umm al-Qura data, which on today's web and native targets means never.
 *
 * It is NOT the Saudi calendar: measured against Umm al-Qura across 2026-27 it
 * drifts by up to 3 days, most of it around a month boundary. Good enough to
 * keep a header from going blank, not good enough to plan Ramadan by.
 */
function tabularHijri(d: Date) {
  const jd = Math.floor(d.getTime() / 86_400_000) + 2_440_588;
  let l = jd - 1_948_440 + 10_632;
  const n = Math.floor((l - 1) / 10_631);
  l = l - 10_631 * n + 354;
  const j =
    Math.floor((10_985 - l) / 5_316) * Math.floor((50 * l) / 17_719) +
    Math.floor(l / 5_670) * Math.floor((43 * l) / 15_238);
  l =
    l -
    Math.floor((30 - j) / 15) * Math.floor((17_719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15_238 * j) / 43) +
    29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  return { day, month, year: 30 * n + j - 30 };
}

/** Hijri day/month/year for a Gregorian date. Month is 1-12. */
export function hijri(d: Date): { day: number; month: number; year: number } {
  if (hijriUsable && hijriFmt) {
    const parts = hijriFmt.formatToParts(d);
    const num = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const day = num("day");
    const month = num("month");
    const year = num("year");
    if (Number.isFinite(day) && Number.isFinite(month) && Number.isFinite(year)) {
      return { day, month, year };
    }
  }
  return tabularHijri(d);
}

/** Split so the digits can be set in the numeral face and the ص/م left in Arabic. */
export function fmtTimeParts(d: Date): { time: string; meridiem: string } {
  if (timeFmt) {
    const parts = timeFmt.formatToParts(d);
    const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const hour = pick("hour");
    const minute = pick("minute");
    if (hour && minute) return { time: `${hour}:${minute}`, meridiem: pick("dayPeriod") };
  }
  const h24 = d.getHours();
  return {
    time: `${String(h24 % 12 || 12).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
    meridiem: h24 < 12 ? "ص" : "م",
  };
}

export const fmtTime = (d: Date) => {
  const { time, meridiem } = fmtTimeParts(d);
  return meridiem ? `${time} ${meridiem}` : time;
};

/** e.g. "السبت" — the day on its own, for a heading. */
export const weekdayName = (d: Date) => AR_WEEKDAYS[d.getDay()]!;

/** Gregorian month names as used in Saudi Arabia (not the Levantine set). */
const GREGORIAN_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

/** Which calendar a reader wants. Chosen per user in Settings. */
export type CalendarPref = "hijri" | "gregorian" | "both";

/**
 * e.g. "1 ربيع الآخر 1448 هـ" — the date alone.
 *
 * The weekday is deliberately absent: callers that want it ask {@link
 * weekdayName} and place it themselves, rather than every date line carrying a
 * day that the surrounding screen has usually already said.
 */
export const fmtDate = (d: Date) => {
  const h = hijri(d);
  return `${h.day} ${HIJRI_MONTHS[h.month - 1]} ${h.year} هـ`;
};

/** e.g. "12 سبتمبر 2026 م" */
export const fmtGregorian = (d: Date) =>
  `${d.getDate()} ${GREGORIAN_MONTHS[d.getMonth()]} ${d.getFullYear()} م`;

/** The date split into what to show, honouring the reader's calendar choice. */
export function fmtDateParts(d: Date, mode: CalendarPref): { primary: string; secondary?: string } {
  if (mode === "gregorian") return { primary: fmtGregorian(d) };
  if (mode === "both") {
    return { primary: fmtDate(d), secondary: fmtGregorian(d) };
  }
  return { primary: fmtDate(d) };
}

/** Short Hijri day + month, for dense rows. e.g. "1 ربيع الآخر" */
export const fmtDateShort = (d: Date) => {
  const h = hijri(d);
  return `${h.day} ${HIJRI_MONTHS[h.month - 1]}`;
};

export const fmtClock = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

type Tone = "success" | "warning" | "danger";

/** Maps a vital reading to a status tone. */
export const vitalsTone = {
  heartRate: (hr: number): Tone => (hr > 100 ? "danger" : hr > 90 ? "warning" : "success"),
  battery: (b: number): Tone => (b > 50 ? "success" : b > 20 ? "warning" : "danger"),
};

/**
 * Seconds from `now` until a "HH:MM" later today. Zero once the moment passes,
 * so a countdown never runs backwards past its target.
 */
export const secondsUntilClock = (clock: string, now: Date) => {
  const target = clockToMinutes(clock) * 60;
  const elapsed = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  return Math.max(0, target - elapsed);
};

/**
 * A running countdown: "MM:SS" inside the hour, "H:MM:SS" beyond it.
 *
 * Minutes are not padded in the hour form — "1:05:09" reads as a clock, while
 * "01:05:09" reads as a duration nobody asked for.
 */
export const fmtDuration = (totalSec: number) => {
  const s = Math.max(0, Math.floor(totalSec));
  const pad = (n: number) => String(n).padStart(2, "0");
  const hours = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return hours ? `${hours}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
};
