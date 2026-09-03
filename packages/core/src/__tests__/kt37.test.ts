import { describe, expect, it } from "vitest";
import { buildSmsCommand, isCarrierCompatible, KT37, SAUDI_CARRIER_BANDS } from "../watch/kt37";

describe("KT37 spec", () => {
  it("runs an APK-capable Android build", () => {
    expect(KT37.os.acceptsSideloadedApk).toBe(true);
    expect(KT37.os.name).toBe("Android");
  });

  it("is compatible with every Saudi carrier", () => {
    for (const carrier of Object.keys(
      SAUDI_CARRIER_BANDS,
    ) as (keyof typeof SAUDI_CARRIER_BANDS)[]) {
      expect(isCarrierCompatible(carrier)).toBe(true);
    }
  });
});

describe("buildSmsCommand", () => {
  it("fills placeholders", () => {
    expect(buildSmsCommand("setUploadInterval", { seconds: 30 })).toBe("UPLOAD,30#");
    expect(buildSmsCommand("setCenterNumber", { phone: "+966501234567" })).toBe(
      "CENTER,+966501234567#",
    );
  });

  it("passes through parameter-less commands", () => {
    expect(buildSmsCommand("requestPosition")).toBe("POSITION#");
  });

  it("throws when a required parameter is missing", () => {
    expect(() => buildSmsCommand("setUploadInterval")).toThrow(/missing param/);
  });
});
