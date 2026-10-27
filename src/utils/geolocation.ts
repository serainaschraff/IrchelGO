export type GeoJSONPosition = readonly [
  longitude: number,
  latitude: number,
  ...additionalCoordinates: number[],
];

export type GeoJSONPolygonGeometry = {
  type: "Polygon";
  coordinates: readonly (readonly GeoJSONPosition[])[];
};

export type GeoJSONMultiPolygonGeometry = {
  type: "MultiPolygon";
  coordinates: readonly (readonly (readonly GeoJSONPosition[])[])[];
};

export type GeoJSONAreaFeature<
  Properties extends Record<string, unknown> = Record<string, unknown>,
> = {
  type: "Feature";
  properties: Properties | null;
  geometry: GeoJSONPolygonGeometry | GeoJSONMultiPolygonGeometry | null;
};

export type GeoJSONAreaCollection<
  Properties extends Record<string, unknown> = Record<string, unknown>,
> = {
  type: "FeatureCollection";
  features: readonly GeoJSONAreaFeature<Properties>[];
};

export type GeographicLocation = Pick<
  GeolocationCoordinates,
  "latitude" | "longitude"
>;

export function getGeolocation() {
  return navigator.geolocation;
}

export function isGeoJSONAreaCollection<
  Properties extends Record<string, unknown>,
>(
  value: unknown,
  isProperties: (value: unknown) => value is Properties | null,
): value is GeoJSONAreaCollection<Properties> {
  if (
    typeof value !== "object" ||
    value === null ||
    !("type" in value) ||
    value.type !== "FeatureCollection" ||
    !("features" in value) ||
    !Array.isArray(value.features)
  ) {
    return false;
  }

  return value.features.every((feature) =>
    isGeoJSONAreaFeature(feature, isProperties),
  );
}

function isGeoJSONAreaFeature<Properties extends Record<string, unknown>>(
  value: unknown,
  isProperties: (value: unknown) => value is Properties | null,
): value is GeoJSONAreaFeature<Properties> {
  if (
    typeof value !== "object" ||
    value === null ||
    !("type" in value) ||
    value.type !== "Feature" ||
    !("properties" in value) ||
    !("geometry" in value)
  ) {
    return false;
  }

  const { geometry, properties } = value;
  if (!isProperties(properties)) return false;

  if (geometry === null) return true;
  if (typeof geometry !== "object" || !("type" in geometry) || !("coordinates" in geometry)) {
    return false;
  }

  if (geometry.type === "Polygon") {
    return isPolygonCoordinates(geometry.coordinates);
  }
  if (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.every(isPolygonCoordinates);
  }
  return false;
}

function isPolygonCoordinates(
  value: unknown,
): value is readonly (readonly GeoJSONPosition[])[] {
  return (
    Array.isArray(value) &&
    value.every(
      (ring) =>
        Array.isArray(ring) &&
        ring.length >= 4 &&
        ring.every(
          (position) =>
            Array.isArray(position) &&
            position.length >= 2 &&
            typeof position[0] === "number" &&
            Number.isFinite(position[0]) &&
            typeof position[1] === "number" &&
            Number.isFinite(position[1]),
        ),
    )
  );
}

/** Tests a GPS location against a GeoJSON Polygon or MultiPolygon feature. */
export function isLocationInGeoJSONFeature(
  feature: GeoJSONAreaFeature,
  location: GeographicLocation,
): boolean {
  const { geometry } = feature;
  if (
    !geometry ||
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude)
  ) {
    return false;
  }

  const point: GeoJSONPosition = [location.longitude, location.latitude];

  if (geometry.type === "Polygon") {
    return isPointInPolygon(point, geometry.coordinates);
  }

  return geometry.coordinates.some((polygon) =>
    isPointInPolygon(point, polygon),
  );
}

/** Returns the first matching feature in collection order, if any. */
export function findGeoJSONFeatureAtLocation<
  Properties extends Record<string, unknown>,
>(
  collection: GeoJSONAreaCollection<Properties>,
  location: GeographicLocation,
): GeoJSONAreaFeature<Properties> | undefined {
  return collection.features.find((feature) =>
    isLocationInGeoJSONFeature(feature, location),
  );
}

function isPointInPolygon(
  point: GeoJSONPosition,
  rings: readonly (readonly GeoJSONPosition[])[],
): boolean {
  const [outerRing, ...holes] = rings;
  if (!outerRing || pointInRing(point, outerRing) === "outside") return false;

  // Polygon boundaries count as inside; points strictly inside holes do not.
  return !holes.some((hole) => pointInRing(point, hole) === "inside");
}

function pointInRing(
  [longitude, latitude]: GeoJSONPosition,
  ring: readonly GeoJSONPosition[],
): "inside" | "outside" | "boundary" {
  if (ring.length < 4) return "outside";

  let inside = false;
  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index++
  ) {
    const currentPosition = ring[index];
    const previousPosition = ring[previous];
    if (!currentPosition || !previousPosition) return "outside";

    const [currentLongitude, currentLatitude] = currentPosition;
    const [previousLongitude, previousLatitude] = previousPosition;

    if (
      !Number.isFinite(currentLongitude) ||
      !Number.isFinite(currentLatitude) ||
      !Number.isFinite(previousLongitude) ||
      !Number.isFinite(previousLatitude)
    ) {
      return "outside";
    }

    if (
      isPointOnSegment(
        longitude,
        latitude,
        currentLongitude,
        currentLatitude,
        previousLongitude,
        previousLatitude,
      )
    ) {
      return "boundary";
    }

    const crossesLatitude =
      (currentLatitude > latitude) !== (previousLatitude > latitude);
    if (
      crossesLatitude &&
      longitude <
        ((previousLongitude - currentLongitude) *
          (latitude - currentLatitude)) /
          (previousLatitude - currentLatitude) +
          currentLongitude
    ) {
      inside = !inside;
    }
  }

  return inside ? "inside" : "outside";
}

function isPointOnSegment(
  pointLongitude: number,
  pointLatitude: number,
  startLongitude: number,
  startLatitude: number,
  endLongitude: number,
  endLatitude: number,
): boolean {
  const cross =
    (pointLatitude - startLatitude) * (endLongitude - startLongitude) -
    (pointLongitude - startLongitude) * (endLatitude - startLatitude);
  const tolerance =
    Number.EPSILON *
    16 *
    Math.max(
      1,
      Math.abs(pointLongitude),
      Math.abs(pointLatitude),
      Math.abs(startLongitude),
      Math.abs(startLatitude),
      Math.abs(endLongitude),
      Math.abs(endLatitude),
    );

  if (Math.abs(cross) > tolerance) return false;

  return (
    pointLongitude >= Math.min(startLongitude, endLongitude) - tolerance &&
    pointLongitude <= Math.max(startLongitude, endLongitude) + tolerance &&
    pointLatitude >= Math.min(startLatitude, endLatitude) - tolerance &&
    pointLatitude <= Math.max(startLatitude, endLatitude) + tolerance
  );
}
