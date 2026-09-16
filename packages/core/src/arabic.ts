/**
 * Arabic counting.
 *
 * Arabic does not pluralise the way `${n} things` assumes: one and two have
 * their own forms, three to ten take the broken plural with the noun *after*
 * the number, and eleven upward returns to the singular in the accusative.
 * Writing "1 مشكلة" or "3 مشكلة" is the giveaway of a translated interface, so
 * every count shown to a parent or a teacher goes through here.
 */
export type ArabicNoun = {
  /** واحد: مشكلة */
  one: string;
  /** اثنان: مشكلتان */
  two: string;
  /** ٣–١٠: مشكلات */
  few: string;
  /** ١١ فأكثر، منصوب: مشكلةً */
  many: string;
};

export const NOUNS = {
  problem: { one: "مشكلة واحدة", two: "مشكلتان", few: "مشكلات", many: "مشكلةً" },
  schoolDay: {
    one: "يوم دراسي واحد",
    two: "يومان دراسيان",
    few: "أيام دراسية",
    many: "يومًا دراسيًا",
  },
  period: { one: "حصة واحدة", two: "حصتان", few: "حصص", many: "حصةً" },
  student: { one: "طالب واحد", two: "طالبان", few: "طلاب", many: "طالبًا" },
} satisfies Record<string, ArabicNoun>;

/**
 * Counts `n` of `noun` the way it is said aloud.
 *
 * One and two carry the number inside the word, so the digit is dropped; three
 * to ten put the digit first; above ten the singular returns in the accusative.
 */
export function arabicCount(n: number, noun: ArabicNoun): string {
  const k = Math.abs(Math.trunc(n));
  if (k === 0) return `لا ${noun.few}`;
  if (k === 1) return noun.one;
  if (k === 2) return noun.two;
  if (k <= 10) return `${k} ${noun.few}`;
  return `${k} ${noun.many}`;
}
