/**
 * Saudi national / iqama id.
 *
 * Ten digits beginning 1 (citizen) or 2 (resident), with the last digit a Luhn
 * check over the first nine — the same scheme bank cards use.
 *
 * This catches a mistyped or transposed digit before anything is sent anywhere.
 * It does NOT say the identity exists, belongs to the person holding the phone,
 * or is in good standing: only Absher / نفاذ can answer that, and this app is
 * not connected to either.
 */

const ID_SHAPE = /^[12]\d{9}$/;

/** Luhn checksum of the first nine digits. */
function checkDigitFor(firstNine: string): number {
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let d = Number(firstNine[i]);
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return (10 - (sum % 10)) % 10;
}

export function isValidNationalId(value: string): boolean {
  if (!ID_SHAPE.test(value)) return false;
  return checkDigitFor(value.slice(0, 9)) === Number(value[9]);
}

/** The digit that completes a nine-digit prefix. Useful for fixtures and tests. */
export function nationalIdCheckDigit(firstNine: string): number {
  if (!/^[12]\d{8}$/.test(firstNine)) throw new Error("expected nine digits starting 1 or 2");
  return checkDigitFor(firstNine);
}

export type NationalIdProblem = "empty" | "length" | "prefix" | "checksum";

/** Why an id was rejected, so the form can say something specific. */
export function nationalIdProblem(value: string): NationalIdProblem | null {
  const v = value.trim();
  if (!v) return "empty";
  if (!/^\d{10}$/.test(v)) return "length";
  if (!/^[12]/.test(v)) return "prefix";
  if (!isValidNationalId(v)) return "checksum";
  return null;
}

export const NATIONAL_ID_MESSAGES: Record<NationalIdProblem, string> = {
  empty: "أدخل رقم الهوية",
  length: "رقم الهوية عشرة أرقام",
  prefix: "رقم الهوية يبدأ بـ 1 للمواطن أو 2 للمقيم",
  checksum: "رقم الهوية غير صحيح — تأكد من الأرقام",
};
