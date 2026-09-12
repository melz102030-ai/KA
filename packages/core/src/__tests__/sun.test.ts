import { describe, expect, it } from "vitest";
import { DEFAULT_LOCATION, isDaytime, sunTimes } from "../sun.js";

const RIYADH = { lat: 24.7136, lng: 46.6753 };
const MAKKAH = { lat: 21.3891, lng: 39.8579 };
const LONDON = { lat: 51.5074, lng: -0.1278 };

/** Local wall-clock "HH:MM", for assertions a human can check against an almanac. */
const at = (ms: number, timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(ms));

describe("sunTimes — against published times", () => {
  // London's solstice is one of the most widely published pairs there is, and
  // the implementation reproduces it to the minute. It anchors everything below.
  it("matches London's June solstice exactly", () => {
    const s = sunTimes(Date.UTC(2026, 5, 21, 9), LONDON.lat, LONDON.lng);
    expect(at(s.sunrise, "Europe/London")).toBe("04:43");
    expect(at(s.sunset, "Europe/London")).toBe("21:21");
  });

  /**
   * The Saudi expectations below are this implementation's own output, so on
   * their own they would prove nothing. Each is pinned by a second check in the
   * next block that does not depend on the sunrise formula — day length against
   * the published extremes for the latitude, and solar noon against the known
   * equation-of-time values for the date.
   */
  const cases: [string, number, { lat: number; lng: number }, string, string, string][] = [
    ["Riyadh, June solstice", Date.UTC(2026, 5, 21, 9), RIYADH, "Asia/Riyadh", "05:04", "18:45"],
    [
      "Riyadh, December solstice",
      Date.UTC(2026, 11, 21, 9),
      RIYADH,
      "Asia/Riyadh",
      "06:33",
      "17:09",
    ],
    ["Makkah, March equinox", Date.UTC(2026, 2, 21, 9), MAKKAH, "Asia/Riyadh", "06:23", "18:31"],
  ];

  for (const [name, when, place, tz, rise, set] of cases) {
    it(`${name} holds to the minute`, () => {
      const s = sunTimes(when, place.lat, place.lng);
      expect(at(s.sunrise, tz)).toBe(rise);
      expect(at(s.sunset, tz)).toBe(set);
    });
  }
});

describe("sunTimes — checks that do not use the sunrise formula", () => {
  const hours = (s: { sunrise: number; sunset: number }) => (s.sunset - s.sunrise) / 3_600_000;

  // Riyadh sits at 24.7°N; its longest and shortest days are published as
  // roughly 13h42m and 10h35m. Nothing about the formula makes these land.
  it("Riyadh's longest day is about 13h42m", () => {
    expect(hours(sunTimes(Date.UTC(2026, 5, 21, 9), RIYADH.lat, RIYADH.lng))).toBeCloseTo(13.7, 1);
  });

  it("Riyadh's shortest day is about 10h35m", () => {
    expect(hours(sunTimes(Date.UTC(2026, 11, 21, 9), RIYADH.lat, RIYADH.lng))).toBeCloseTo(10.6, 1);
  });

  // At an equinox every place on earth gets a little over twelve hours — the
  // extra seven minutes are refraction plus the sun's own width.
  it("an equinox runs about 12h07m, at both cities", () => {
    for (const place of [RIYADH, MAKKAH]) {
      const h = hours(sunTimes(Date.UTC(2026, 2, 20, 9), place.lat, place.lng));
      expect(h).toBeGreaterThan(12.05);
      expect(h).toBeLessThan(12.2);
    }
  });

  /**
   * Solar noon is the midpoint of sunrise and sunset, and it can be predicted
   * without any of this code: 12:00 local, minus four minutes for every degree
   * the place sits east of its timezone meridian, minus the equation of time —
   * a published quantity, about −1.7 min on the June solstice and +2.0 min on
   * the December one.
   */
  it("puts solar noon where longitude and the equation of time say it is", () => {
    const minutesOfDay = (ms: number) => {
      const hhmm = at(ms, "Asia/Riyadh");
      return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
    };
    const eastOfMeridian = (RIYADH.lng - 45) * 4; // Riyadh vs the UTC+3 meridian

    for (const [when, eqTimeMin] of [
      [Date.UTC(2026, 5, 21, 9), -1.7],
      [Date.UTC(2026, 11, 21, 9), 2.0],
    ] as const) {
      const s = sunTimes(when, RIYADH.lat, RIYADH.lng);
      const midpoint = (minutesOfDay(s.sunrise) + minutesOfDay(s.sunset)) / 2;
      const predicted = 12 * 60 - eastOfMeridian - eqTimeMin;
      expect(Math.abs(midpoint - predicted)).toBeLessThan(2);
    }
  });
});

describe("sunTimes — properties", () => {
  it("the sun rises before it sets", () => {
    const s = sunTimes(Date.UTC(2026, 5, 21, 9), RIYADH.lat, RIYADH.lng);
    expect(s.sunrise).toBeLessThan(s.sunset);
  });

  it("gives roughly twelve hours at the equator, all year", () => {
    for (const month of [0, 3, 6, 9]) {
      const s = sunTimes(Date.UTC(2026, month, 15, 12), 0, 0);
      const hours = (s.sunset - s.sunrise) / 3_600_000;
      expect(hours).toBeGreaterThan(11.8);
      expect(hours).toBeLessThan(12.3);
    }
  });

  it("summer days are longer than winter days in the north", () => {
    const june = sunTimes(Date.UTC(2026, 5, 21, 9), LONDON.lat, LONDON.lng);
    const dec = sunTimes(Date.UTC(2026, 11, 21, 9), LONDON.lat, LONDON.lng);
    expect(june.sunset - june.sunrise).toBeGreaterThan(dec.sunset - dec.sunrise);
  });

  it("and the other way round below the equator", () => {
    const sydney = { lat: -33.8688, lng: 151.2093 };
    const june = sunTimes(Date.UTC(2026, 5, 21, 0), sydney.lat, sydney.lng);
    const dec = sunTimes(Date.UTC(2026, 11, 21, 0), sydney.lat, sydney.lng);
    expect(june.sunset - june.sunrise).toBeLessThan(dec.sunset - dec.sunrise);
  });

  // Rather than NaN for a caller to render.
  it("flags a polar day instead of failing", () => {
    const s = sunTimes(Date.UTC(2026, 5, 21, 12), 78, 15); // Svalbard, midnight sun
    expect(s.polar).toBe(true);
    expect(Number.isFinite(s.sunrise)).toBe(true);
    expect(Number.isFinite(s.sunset)).toBe(true);
  });

  it("flags a polar night too", () => {
    expect(sunTimes(Date.UTC(2026, 11, 21, 12), 78, 15).polar).toBe(true);
  });
});

describe("isDaytime", () => {
  const noonRiyadh = Date.UTC(2026, 5, 21, 9); // 12:00 local
  const midnightRiyadh = Date.UTC(2026, 5, 20, 21); // 00:00 local

  it("is true at local noon and false at local midnight", () => {
    expect(isDaytime(noonRiyadh, RIYADH.lat, RIYADH.lng)).toBe(true);
    expect(isDaytime(midnightRiyadh, RIYADH.lat, RIYADH.lng)).toBe(false);
  });

  it("flips exactly on sunrise and sunset", () => {
    const s = sunTimes(noonRiyadh, RIYADH.lat, RIYADH.lng);
    expect(isDaytime(s.sunrise - 60_000, RIYADH.lat, RIYADH.lng)).toBe(false);
    expect(isDaytime(s.sunrise + 60_000, RIYADH.lat, RIYADH.lng)).toBe(true);
    expect(isDaytime(s.sunset - 60_000, RIYADH.lat, RIYADH.lng)).toBe(true);
    expect(isDaytime(s.sunset + 60_000, RIYADH.lat, RIYADH.lng)).toBe(false);
  });

  it("falls back to Riyadh when no place is given", () => {
    expect(isDaytime(noonRiyadh)).toBe(
      isDaytime(noonRiyadh, DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng),
    );
  });

  it("is light all day under the midnight sun", () => {
    expect(isDaytime(Date.UTC(2026, 5, 21, 2), 78, 15)).toBe(true);
    expect(isDaytime(Date.UTC(2026, 5, 21, 14), 78, 15)).toBe(true);
  });
});
