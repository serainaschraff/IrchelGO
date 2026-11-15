import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { animalRegistry } from "../../src/utils/animals";
import { isGeoJSONAreaCollection } from "../../src/utils/geolocation";
import {
  assignAreaAnimalsToTerritories,
  assignIrchelAnimalsToTerritories,
  assignAnimalsToCantonTerritories,
  isAreaNameTerritoryProperties,
  isCantonTerritoryProperties,
  isTerritoryProperties,
  type CantonTerritoryProperties,
  type TerritoryProperties,
} from "../../src/utils/territories";
import type { GeoJSONAreaCollection } from "../../src/utils/geolocation";

const irchelSource: GeoJSONAreaCollection<TerritoryProperties> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { fid: 4, area: "park" },
      geometry: {
        type: "Polygon",
        coordinates: [[[8, 47], [8.1, 47], [8.1, 47.1], [8, 47.1], [8, 47]]],
      },
    },
    {
      type: "Feature",
      properties: { fid: 5, area: "tram-path" },
      geometry: null,
    },
  ],
};

const cantonSource: GeoJSONAreaCollection<CantonTerritoryProperties> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        areaId: "canton-zh",
        areaName: "Canton Zürich",
        cantonISO: "CH-ZH",
        canton: "Zürich",
      },
      geometry: null,
    },
    {
      type: "Feature",
      properties: {
        areaId: "canton-be",
        areaName: "Canton Bern",
        cantonISO: "CH-BE",
        canton: "Bern",
      },
      geometry: null,
    },
  ],
};

describe("territory property guards", () => {
  it("accepts valid area-based and canton territory properties and rejects malformed values", () => {
    expect(isTerritoryProperties({ fid: 1, area: "park" })).toBe(true);
    expect(isAreaNameTerritoryProperties({ fid: 1, area: "park" })).toBe(true);
    expect(isTerritoryProperties(null)).toBe(false);
    expect(isTerritoryProperties({ fid: "1", area: "park" })).toBe(false);
    expect(isTerritoryProperties({ fid: 1, area: "" })).toBe(false);
    expect(isCantonTerritoryProperties({
      areaId: "canton-zh",
      areaName: "Canton Zürich",
      cantonISO: "CH-ZH",
    })).toBe(true);
    expect(isCantonTerritoryProperties({
      areaId: "canton-zh",
      areaName: "Canton Zürich",
    })).toBe(false);
  });
});

describe("assignAreaAnimalsToTerritories", () => {
  it("supports generic territory maps that use area names instead of canton identifiers", () => {
    const assigned = assignAreaAnimalsToTerritories(irchelSource);

    expect(assigned.features[0]?.properties).toMatchObject({
      areaId: "park-4",
      areaName: "park",
      animals: ["ember-fox", "frost-fox", "bramble-hedgehog", "moonlit-hedgehog"],
    });
  });
});

describe("assignIrchelAnimalsToTerritories", () => {
  it("keeps the source map free of assignments and applies the specified pair to each area", () => {
    const rawMap: unknown = JSON.parse(
      readFileSync(new URL("../../public/data/irchel.geojson", import.meta.url), "utf8"),
    );
    if (!isGeoJSONAreaCollection(rawMap, isTerritoryProperties)) {
      throw new Error("Irchel map does not match the territory GeoJSON schema.");
    }

    const assigned = assignIrchelAnimalsToTerritories(rawMap);
    const expected: Record<string, string[]> = {
      park: ["ember-fox", "frost-fox", "bramble-hedgehog", "moonlit-hedgehog"],
      lake: ["river-fish", "sunlit-fish", "mallard-duck", "golden-duck"],
      "tram-path": ["emerald-lizard", "copper-lizard", "midnight-cat", "ginger-cat"],
      mensa: ["suncrest-lion", "embermane-lion", "chestnut-bear", "glacier-bear"],
      geo: [
        "alpine-blue-butterfly",
        "golden-apollo-butterfly",
        "amethyst-crystal",
        "rose-quartz-crystal",
      ],
      goats: ["alpine-ibex", "glacier-ibex", "river-mink", "shadow-mink"],
      bar: ["canopy-monkey", "sunset-monkey", "edelweiss-cow", "midnight-cow"],
      hilltop: ["raven-crow", "silver-crow", "golden-eagle", "snowpeak-eagle"],
      building: ["mountain-dwarf", "crystal-dwarf", "field-mouse", "moon-mouse"],
    };

    expect(assigned.features).toHaveLength(13);
    expect(rawMap.features.every((feature) => !("animals" in (feature.properties ?? {})))).toBe(
      true,
    );
    for (const feature of assigned.features) {
      const area = feature.properties?.area;
      expect(feature.properties?.animals).toEqual(expected[area ?? ""]);
    }
  });

  it("preserves source feature properties and creates territory labels", () => {
    const assigned = assignIrchelAnimalsToTerritories(irchelSource);

    expect(assigned.features[0]?.properties).toMatchObject({
      fid: 4,
      area: "park",
      areaId: "park-4",
      areaName: "park",
      animals: ["ember-fox", "frost-fox", "bramble-hedgehog", "moonlit-hedgehog"],
    });
    expect(irchelSource.features[0]?.properties).toEqual({ fid: 4, area: "park" });
  });

  it("rejects areas without a configured animal pair", () => {
    const unknownArea: GeoJSONAreaCollection<TerritoryProperties> = {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: { fid: 9, area: "unknown" },
        geometry: null,
      }],
    };

    expect(() => assignIrchelAnimalsToTerritories(unknownArea)).toThrow(
      'No animal assignment is configured for territory "unknown".',
    );
  });
});

describe("assignAnimalsToCantonTerritories", () => {
  it("keeps canton assignments outside GeoJSON and preserves each canton species assignment", () => {
    const rawMap: unknown = JSON.parse(
      readFileSync(new URL("../../public/data/animal-areas.geojson", import.meta.url), "utf8"),
    );
    if (!isGeoJSONAreaCollection(rawMap, isCantonTerritoryProperties)) {
      throw new Error("Canton map does not match the territory GeoJSON schema.");
    }

    const assigned = assignAnimalsToCantonTerritories(rawMap);
    const expected: Record<string, string[]> = {
      "CH-AG": ["rosewood-pig", "meadow-pig"],
      "CH-AR": ["alpine-blue-butterfly", "golden-apollo-butterfly"],
      "CH-AI": ["alpine-blue-butterfly", "golden-apollo-butterfly"],
      "CH-BL": ["mountain-dwarf", "crystal-dwarf"],
      "CH-BS": ["mountain-dwarf", "crystal-dwarf"],
      "CH-BE": ["chestnut-bear", "glacier-bear"],
      "CH-FR": ["bramble-hedgehog", "moonlit-hedgehog"],
      "CH-GE": ["golden-eagle", "snowpeak-eagle"],
      "CH-GL": ["edelweiss-cow", "midnight-cow"],
      "CH-GR": ["alpine-ibex", "glacier-ibex"],
      "CH-JU": ["bramble-hedgehog", "moonlit-hedgehog"],
      "CH-LU": ["suncrest-lion", "embermane-lion"],
      "CH-NE": ["bramble-hedgehog", "moonlit-hedgehog"],
      "CH-NW": ["edelweiss-cow", "midnight-cow"],
      "CH-OW": ["edelweiss-cow", "midnight-cow"],
      "CH-SH": ["ember-fox", "frost-fox"],
      "CH-SZ": ["edelweiss-cow", "midnight-cow"],
      "CH-SO": ["rosewood-pig", "meadow-pig"],
      "CH-SG": ["alpine-blue-butterfly", "golden-apollo-butterfly"],
      "CH-TG": ["alpine-blue-butterfly", "golden-apollo-butterfly"],
      "CH-TI": ["emerald-lizard", "copper-lizard"],
      "CH-UR": ["edelweiss-cow", "midnight-cow"],
      "CH-VS": ["moon-wolf", "timber-wolf"],
      "CH-VD": ["golden-eagle", "snowpeak-eagle"],
      "CH-ZG": ["suncrest-lion", "embermane-lion"],
      "CH-ZH": ["ember-fox", "frost-fox"],
    };

    expect(assigned.features).toHaveLength(26);
    expect(rawMap.features.every((feature) => !("animals" in (feature.properties ?? {})))).toBe(
      true,
    );
    for (const feature of assigned.features) {
      const cantonISO = feature.properties?.cantonISO;
      const animals = feature.properties?.animals;
      expect(animals).toHaveLength(2);
      expect(animals).toEqual(expected[cantonISO ?? ""]);
      expect(animals?.every((id) => animalRegistry.some((animal) => animal.id === id))).toBe(true);
    }
  });

  it("preserves canton properties and adds its defined animal variants", () => {
    const assigned = assignAnimalsToCantonTerritories(cantonSource);

    expect(assigned.features).toHaveLength(cantonSource.features.length);
    expect(assigned.features[0]?.properties).toMatchObject({
      areaId: "canton-zh",
      areaName: "Canton Zürich",
      cantonISO: "CH-ZH",
      animals: ["ember-fox", "frost-fox"],
    });
    expect(cantonSource.features[0]?.properties).not.toHaveProperty("animals");
  });

  it("rejects unknown cantons and missing properties", () => {
    const missingProperties: GeoJSONAreaCollection<CantonTerritoryProperties> = {
      type: "FeatureCollection",
      features: [{ type: "Feature", properties: null, geometry: null }],
    };
    expect(() => assignAnimalsToCantonTerritories(missingProperties)).toThrow(
      "Cannot assign animals to a territory without properties.",
    );

    const unknownCanton: GeoJSONAreaCollection<CantonTerritoryProperties> = {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: {
          areaId: "canton-xx",
          areaName: "Unknown",
          cantonISO: "CH-XX",
        },
        geometry: null,
      }],
    };
    expect(() => assignAnimalsToCantonTerritories(unknownCanton)).toThrow(
      'No animal assignment is configured for canton "CH-XX".',
    );
  });
});
