import { describe, expect, it } from "vitest";
import { getARStartMode } from "../../src/utils/runtimeOptions";

describe("getARStartMode", () => {
  it("forces 8th Wall even while WebXR support is still being checked", () => {
    expect(getARStartMode(true, null)).toBe("eightwall");
    expect(getARStartMode(true, true)).toBe("eightwall");
  });

  it("prefers WebXR when it is available and forcing is disabled", () => {
    expect(getARStartMode(false, true)).toBe("webxr");
  });

  it("uses 8th Wall when WebXR is unavailable", () => {
    expect(getARStartMode(false, false)).toBe("eightwall");
  });

  it("waits for WebXR support detection before choosing a path", () => {
    expect(getARStartMode(false, null)).toBeNull();
  });
});
