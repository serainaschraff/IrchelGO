import type {
  GeoJSONAreaCollection,
  GeoJSONAreaFeature,
} from "./geolocation";
import { animalRegistry, type AnimalId } from "./animals";

export type TerritoryProperties = {
  fid: number;
  area: string;
  [key: string]: unknown;
};

export type CantonTerritoryProperties = {
  areaId: string;
  areaName: string;
  cantonISO: string;
  [key: string]: unknown;
};

export type AnimalAreaProperties = {
  areaId: string;
  areaName: string;
  animals: AnimalId[];
  cantonISO?: string;
  fid?: number;
  area?: string;
  [key: string]: unknown;
};

const irchelAnimalAssignments: Readonly<Record<string, readonly AnimalId[]>> = {
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

const cantonAnimalAssignments: Readonly<Record<string, readonly [AnimalId, AnimalId]>> = {
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

export function isTerritoryProperties(
  value: unknown,
): value is TerritoryProperties | null {
  return (
    typeof value === "object" &&
    value !== null &&
    "fid" in value &&
    typeof value.fid === "number" &&
    Number.isFinite(value.fid) &&
    "area" in value &&
    typeof value.area === "string" &&
    value.area.length > 0
  );
}

export function isCantonTerritoryProperties(
  value: unknown,
): value is CantonTerritoryProperties | null {
  return (
    typeof value === "object" &&
    value !== null &&
    "areaId" in value &&
    typeof value.areaId === "string" &&
    "areaName" in value &&
    typeof value.areaName === "string" &&
    "cantonISO" in value &&
    typeof value.cantonISO === "string"
  );
}

export function assignIrchelAnimalsToTerritories(
  collection: GeoJSONAreaCollection<TerritoryProperties>,
): GeoJSONAreaCollection<AnimalAreaProperties> {
  const features: GeoJSONAreaFeature<AnimalAreaProperties>[] = collection.features.map(
    (feature) => {
      const properties = feature.properties;
      if (properties === null) {
        throw new Error("Cannot assign animals to a territory without properties.");
      }

      const animals = irchelAnimalAssignments[properties.area];
      if (!animals) {
        throw new Error(`No animal assignment is configured for Irchel area "${properties.area}".`);
      }

      for (const animalId of animals) {
        if (!animalRegistry.some((animal) => animal.id === animalId)) {
          throw new Error(`Irchel area "${properties.area}" references an unregistered animal.`);
        }
      }

      const readableArea = properties.area.replaceAll("-", " ");
      return {
        ...feature,
        properties: {
          ...properties,
          areaId: `irchel-${properties.fid}`,
          areaName: `${readableArea} territory ${properties.fid}`,
          animals: [...animals],
        },
      };
    },
  );

  return { ...collection, features };
}

export function assignAnimalsToCantonTerritories(
  collection: GeoJSONAreaCollection<CantonTerritoryProperties>,
): GeoJSONAreaCollection<AnimalAreaProperties> {
  const features: GeoJSONAreaFeature<AnimalAreaProperties>[] = collection.features.map(
    (feature) => {
      const properties = feature.properties;
      if (properties === null) {
        throw new Error("Cannot assign animals to a territory without properties.");
      }

      const animals = cantonAnimalAssignments[properties.cantonISO];
      if (!animals) {
        throw new Error(
          `No animal assignment is configured for canton "${properties.cantonISO}".`,
        );
      }

      for (const animalId of animals) {
        if (!animalRegistry.some((animal) => animal.id === animalId)) {
          throw new Error(`Canton "${properties.cantonISO}" references an unregistered animal.`);
        }
      }

      return {
        ...feature,
        properties: {
          ...properties,
          animals: [...animals],
        },
      };
    },
  );

  return { ...collection, features };
}
