/**
 * Sunrise and sunset, from the NOAA solar position equations.
 *
 * Used to decide whether a child is looking at their watch in daylight, so the
 * clock can show a sun or a crescent instead of the letters ص and م — which a
 * six-year-old cannot read yet.
 *
 * Computed rather than looked up: the Umm al-Qura tables publish Makkah, and a
 * child in Tabuk or Jazan sees the sun leave at a different time. Accurate to
 * roughly a minute for the latitudes Saudi Arabia spans, which is far finer
 * than "is it light out".
 */

/** Riyadh — the fallback when no school or watch position is known. */
export const DEFAULT_LOCATION = { lat: 24.7136, lng: 46.6753 };

/** The sun's centre is this far below the horizon at the moment it is "up". */
const ZENITH_OFFICIAL_DEG = 90.833;

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Days since the J2000.0 epoch, as a Julian day number. */
function julianDay(ms: number): number {
  return ms / 86_400_000 + 2_440_587.5;
}

function julianCentury(jd: number): number {
  return (jd - 2_451_545) / 36_525;
}

function solarDeclinationDeg(t: number): number {
  const meanLong = (280.46646 + t * (36_000.76983 + t * 0.0003032)) % 360;
  const meanAnom = 357.52911 + t * (35_999.05029 - 0.0001537 * t);
  const center =
    Math.sin(rad(meanAnom)) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(rad(2 * meanAnom)) * (0.019993 - 0.000101 * t) +
    Math.sin(rad(3 * meanAnom)) * 0.000289;
  const trueLong = meanLong + center;
  const apparentLong = trueLong - 0.00569 - 0.00478 * Math.sin(rad(125.04 - 1934.136 * t));
  const meanObliquity =
    23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const obliquity = meanObliquity + 0.00256 * Math.cos(rad(125.04 - 1934.136 * t));
  return deg(Math.asin(Math.sin(rad(obliquity)) * Math.sin(rad(apparentLong))));
}

/** Minutes by which the real sun runs ahead of or behind clock noon. */
function equationOfTimeMin(t: number): number {
  const meanLong = (280.46646 + t * (36_000.76983 + t * 0.0003032)) % 360;
  const meanAnom = 357.52911 + t * (35_999.05029 - 0.0001537 * t);
  const eccent = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const meanObliquity =
    23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const obliquity = meanObliquity + 0.00256 * Math.cos(rad(125.04 - 1934.136 * t));
  const y = Math.tan(rad(obliquity / 2)) ** 2;

  const eTime =
    y * Math.sin(2 * rad(meanLong)) -
    2 * eccent * Math.sin(rad(meanAnom)) +
    4 * eccent * y * Math.sin(rad(meanAnom)) * Math.cos(2 * rad(meanLong)) -
    0.5 * y * y * Math.sin(4 * rad(meanLong)) -
    1.25 * eccent * eccent * Math.sin(2 * rad(meanAnom));
  return 4 * deg(eTime);
}

export type SunTimes = {
  sunrise: number;
  sunset: number;
  /** True when the sun never rises or never sets there that day. */
  polar: boolean;
};

/**
 * Sunrise and sunset as epoch milliseconds, for the UTC day containing `at`.
 *
 * Inside the polar circles the sun can stay up or down all day; `polar` says so
 * and the two times collapse onto the day's boundaries rather than returning
 * NaN for a caller to trip over.
 */
export function sunTimes(at: number, lat: number, lng: number): SunTimes {
  const dayStart = Math.floor(at / 86_400_000) * 86_400_000;
  const t = julianCentury(julianDay(dayStart + 43_200_000)); // solar noon-ish
  const declination = solarDeclinationDeg(t);
  const eqTime = equationOfTimeMin(t);

  const cosH =
    (Math.cos(rad(ZENITH_OFFICIAL_DEG)) - Math.sin(rad(lat)) * Math.sin(rad(declination))) /
    (Math.cos(rad(lat)) * Math.cos(rad(declination)));

  if (cosH > 1) return { sunrise: dayStart, sunset: dayStart, polar: true }; // never rises
  if (cosH < -1) return { sunrise: dayStart, sunset: dayStart + 86_400_000, polar: true }; // never sets

  const hourAngleMin = 4 * deg(Math.acos(cosH));
  const solarNoonMin = 720 - 4 * lng - eqTime;

  return {
    sunrise: dayStart + (solarNoonMin - hourAngleMin) * 60_000,
    sunset: dayStart + (solarNoonMin + hourAngleMin) * 60_000,
    polar: false,
  };
}

/** Whether the sun is above the horizon at that instant and place. */
export function isDaytime(
  at: number,
  lat: number = DEFAULT_LOCATION.lat,
  lng: number = DEFAULT_LOCATION.lng,
): boolean {
  const { sunrise, sunset, polar } = sunTimes(at, lat, lng);
  if (polar) return sunset - sunrise > 43_200_000;
  return at >= sunrise && at < sunset;
}
