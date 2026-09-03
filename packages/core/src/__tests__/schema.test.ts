import { describe, expect, it } from "vitest";
import { callables } from "../callables";
import { Kid } from "../schema/kid";
import { TelemetryPacket } from "../schema/watch";
import { paths } from "../paths";

describe("Kid schema", () => {
  it("applies live-state defaults", () => {
    const kid = Kid.parse({
      id: "k1",
      name: "أحمد",
      guardianUids: ["u1"],
      akbadnaId: "AKB-7X3K-9P2Q",
      createdAt: 0,
      updatedAt: 0,
    });
    expect(kid.photoEmoji).toBe("🧒");
    expect(kid.live.presence).toBe("unknown");
    expect(kid.live.watchOnline).toBe(false);
  });

  it("requires at least one guardian", () => {
    const r = Kid.safeParse({
      id: "k1",
      name: "أحمد",
      guardianUids: [],
      akbadnaId: "AKB-7X3K-9P2Q",
      createdAt: 0,
      updatedAt: 0,
    });
    expect(r.success).toBe(false);
  });
});

describe("TelemetryPacket schema", () => {
  it("accepts a minimal KT37 packet and defaults flags", () => {
    const p = TelemetryPacket.parse({
      watchId: "w1",
      imei: "123456789012345",
      at: 1_700_000_000_000,
      receivedAt: 1_700_000_000_500,
    });
    expect(p.sos).toBe(false);
    expect(p.fall).toBe(false);
    expect(p.source).toBe("apk");
  });

  it("rejects a bad IMEI", () => {
    expect(
      TelemetryPacket.safeParse({ watchId: "w1", imei: "abc", at: 1, receivedAt: 2 }).success,
    ).toBe(false);
  });
});

describe("callable contracts", () => {
  it("submitAttendance validates marks", () => {
    const ok = callables.submitAttendance.request.safeParse({
      schoolId: "s1",
      classId: "c1",
      date: "2026-09-03",
      marks: [{ kidId: "k1", status: "present" }],
    });
    expect(ok.success).toBe(true);
  });

  it("rejects an unknown attendance status", () => {
    const bad = callables.submitAttendance.request.safeParse({
      schoolId: "s1",
      classId: "c1",
      date: "2026-09-03",
      marks: [{ kidId: "k1", status: "here" }],
    });
    expect(bad.success).toBe(false);
  });

  it("seedDemoSchool accepts an empty request", () => {
    expect(callables.seedDemoSchool.request.parse(undefined)).toEqual({});
    expect(callables.seedDemoSchool.request.parse({})).toEqual({});
  });

  it("every callable name matches its map key", () => {
    for (const [key, spec] of Object.entries(callables)) {
      expect(spec.name).toBe(key);
    }
  });
});

describe("paths", () => {
  it("builds nested Firestore paths", () => {
    expect(paths.class("s1", "c1")).toBe("schools/s1/classes/c1");
    expect(paths.telemetryPackets("w9")).toBe("telemetry/w9/packets");
    expect(paths.messages("t1")).toBe("threads/t1/messages");
  });
});
