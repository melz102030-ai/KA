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

export const fmtTime = (d: Date) =>
  d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", hour12: true });

export const fmtDate = (d: Date) =>
  d.toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long" });

export const fmtClock = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export function useVitalsColor() {
  return {
    heartRate: (hr: number) => (hr > 100 ? "#EF4444" : hr > 90 ? "#F59E0B" : "#22C55E"),
    battery: (b: number) => (b > 50 ? "#22C55E" : b > 20 ? "#F59E0B" : "#EF4444"),
  };
}
