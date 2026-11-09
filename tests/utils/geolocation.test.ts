import { describe, expect, it } from "vitest";
import {
  findGeoJSONFeatureAtLocation,
  isGeoJSONAreaCollection,
  isLocationInGeoJSONFeature,
  type GeoJSONMultiPolygonGeometry,
  type GeoJSONAreaFeature,
  type GeoJSONPolygonGeometry,
} from "../../src/utils/geolocation";

type TestProperties = { areaId: string };

const square: GeoJSONPolygonGeometry = {
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ],
  ],
};

function feature(
  geometry: GeoJSONPolygonGeometry,
  areaId = "test-area",
): GeoJSONAreaFeature<TestProperties> {
  return { type: "Feature", properties: { areaId }, geometry };
}

function isTestProperties(value: unknown): value is TestProperties | null {
  return (
    value === null ||
    (typeof value === "object" &&
      "areaId" in value &&
      typeof value.areaId === "string")
  );
}

describe("isGeoJSONAreaCollection", () => {
  it("accepts a valid feature collection", () => {
    expect(
      isGeoJSONAreaCollection(
        {
          type: "FeatureCollection",
          features: [feature(square)],
        },
        isTestProperties,
      ),
    ).toBe(true);
  });

  it("rejects malformed types, properties, and polygon coordinates", () => {
    const isCollection = (value: unknown) =>
      isGeoJSONAreaCollection(value, isTestProperties);

    expect(isCollection({ type: "FeatureCollection", features: {} })).toBe(false);
    expect(
      isCollection({
        type: "FeatureCollection",
        features: [{ type: "Feature", properties: {}, geometry: null }],
      }),
    ).toBe(false);
    expect(
      isCollection({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { areaId: "broken" },
            geometry: { type: "Polygon", coordinates: [[["bad", 0]]] },
          },
        ],
      }),
    ).toBe(false);
  });
});

describe("isLocationInGeoJSONFeature", () => {
  const polygon = feature(square);

  it("matches points inside and on the polygon boundary", () => {
    expect(
      isLocationInGeoJSONFeature(polygon, { latitude: 5, longitude: 5 }),
    ).toBe(true);
    expect(
      isLocationInGeoJSONFeature(polygon, { latitude: 5, longitude: 0 }),
    ).toBe(true);
  });

  it("rejects points outside, invalid coordinates, and missing geometry", () => {
    expect(
      isLocationInGeoJSONFeature(polygon, { latitude: 15, longitude: 5 }),
    ).toBe(false);
    expect(
      isLocationInGeoJSONFeature(polygon, {
        latitude: Number.NaN,
        longitude: 5,
      }),
    ).toBe(false);
    expect(
      isLocationInGeoJSONFeature(
        { type: "Feature", properties: { areaId: "empty" }, geometry: null },
        { latitude: 5, longitude: 5 },
      ),
    ).toBe(false);
  });

  it("treats a point strictly inside a hole as outside", () => {
    const polygonWithHole: GeoJSONPolygonGeometry = {
      type: "Polygon",
      coordinates: [
        square.coordinates[0]!,
        [
          [3, 3],
          [7, 3],
          [7, 7],
          [3, 7],
          [3, 3],
        ],
      ],
    };

    expect(
      isLocationInGeoJSONFeature(feature(polygonWithHole), {
        latitude: 5,
        longitude: 5,
      }),
    ).toBe(false);
    expect(
      isLocationInGeoJSONFeature(feature(polygonWithHole), {
        latitude: 2,
        longitude: 2,
      }),
    ).toBe(true);
  });

  it("matches any polygon in a multipolygon", () => {
    const multiPolygon: GeoJSONMultiPolygonGeometry = {
      type: "MultiPolygon",
      coordinates: [
        square.coordinates,
        [
          [
            [20, 20] as const,
            [30, 20] as const,
            [30, 30] as const,
            [20, 30] as const,
            [20, 20] as const,
          ],
        ],
      ],
    };

    expect(
      isLocationInGeoJSONFeature(
        { type: "Feature", properties: { areaId: "multi" }, geometry: multiPolygon },
        { latitude: 25, longitude: 25 },
      ),
    ).toBe(true);
  });
});

describe("findGeoJSONFeatureAtLocation", () => {
  it("returns the first matching feature in collection order", () => {
    const first = feature(square, "first");
    const second = feature(square, "second");
    const collection = {
      type: "FeatureCollection" as const,
      features: [first, second],
    };

    expect(
      findGeoJSONFeatureAtLocation(collection, {
        latitude: 5,
        longitude: 5,
      }),
    ).toBe(first);
  });
});
