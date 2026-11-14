import { describe, expect, it } from "vitest";
import {
  getARStartMode,
  getAnimalAreaMapFile,
  getAppFlags,
} from "../../src/utils/runtimeOptions";

describe("getARStartMode", () => {
  it("forces 8th Wall even while WebXR support is still being checked", () => {
    expect(getARStartMode(true, null)).toBe("eightwall");
    expect(getARStartMode(true, true)).toBe("eightwall");
  });

  describe("getAppFlags", () => {
    it("supports multiple flags in one query string", () => {
      expect(getAppFlags("?debug=1&force8thwall=1&game=1&ch=1&buli=1&outside=1&animal=1")).toEqual({
        debug: true,
        forceEightWall: true,
        game: true,
        swissMap: true,
        buliMap: true,
        outside: true,
        animalGallery: true,
      });
    });

    it("leaves flags disabled when they are absent or not set to 1", () => {
      expect(getAppFlags("?debug=true&game=0")).toEqual({
        debug: false,
        forceEightWall: false,
        game: false,
        swissMap: false,
        buliMap: false,
        outside: false,
        animalGallery: false,
      });
    });
  });

  describe("getAnimalAreaMapFile", () => {
    it("uses the Irchel territory map by default, the Swiss map with ch enabled, and the Bülach map with buli enabled", () => {
      expect(getAnimalAreaMapFile(false)).toBe("irchel.geojson");
      expect(getAnimalAreaMapFile(true)).toBe("animal-areas.geojson");
      expect(getAnimalAreaMapFile(false, true)).toBe("bülach.geojson");
      expect(getAnimalAreaMapFile(true, true)).toBe("bülach.geojson");
    });
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
