import { bearVariants } from "../animals/bear";
import { butterflyVariants } from "../animals/butterfly";
import { catVariants } from "../animals/cat";
import { cowVariants } from "../animals/cow";
import { crowVariants } from "../animals/crow";
import { crystalVariants } from "../animals/crystal";
import { duckVariants } from "../animals/duck";
import { dwarfVariants } from "../animals/dwarf";
import { eagleVariants } from "../animals/eagle";
import { fishVariants } from "../animals/fish";
import { foxVariants } from "../animals/fox";
import { hedgehogVariants } from "../animals/hedgehog";
import { ibexVariants } from "../animals/ibex";
import { lionVariants } from "../animals/lion";
import { lizardVariants } from "../animals/lizard";
import { marmotVariants } from "../animals/marmot";
import { minkVariants } from "../animals/mink";
import { monkeyVariants } from "../animals/monkey";
import { mouseVariants } from "../animals/mouse";
import { pigVariants } from "../animals/pig";
import { wolfVariants } from "../animals/wolf";
import type { AnimalDefinition, AnimalId } from "../animals/types";

export type {
  AnimalDefinition,
  AnimalId,
  AnimalModelProps,
} from "../animals/types";

export const animalRegistry: readonly AnimalDefinition[] = [
  ...foxVariants,
  ...ibexVariants,
  ...wolfVariants,
  ...butterflyVariants,
  ...pigVariants,
  ...bearVariants,
  ...cowVariants,
  ...lionVariants,
  ...lizardVariants,
  ...eagleVariants,
  ...hedgehogVariants,
  ...dwarfVariants,
  ...fishVariants,
  ...duckVariants,
  ...catVariants,
  ...crystalVariants,
  ...marmotVariants,
  ...minkVariants,
  ...monkeyVariants,
  ...mouseVariants,
  ...crowVariants,
];

export const encounterRules = {
  moveOnDistanceMeters: 10,
  cameraTurnThresholdRadians: (30 * Math.PI) / 180,
  cameraTurnResetRadians: (20 * Math.PI) / 180,
  cameraTurnCooldownMs: 15_000,
  cameraTurnChance: 1,
} as const;

export type CameraPanState = {
  latched: boolean;
  lastAttemptAt: number;
};

export function shouldStartEncounterAfterCameraPan(
  turnAngle: number,
  now: number,
  state: CameraPanState,
): boolean {
  if (turnAngle < encounterRules.cameraTurnResetRadians) {
    state.latched = false;
    return false;
  }
  if (
    turnAngle < encounterRules.cameraTurnThresholdRadians ||
    state.latched
  ) {
    return false;
  }

  state.latched = true;
  if (now - state.lastAttemptAt < encounterRules.cameraTurnCooldownMs) {
    return false;
  }

  state.lastAttemptAt = now;
  return Math.random() < encounterRules.cameraTurnChance;
}

export function getAnimalDefinition(animalId: AnimalId): AnimalDefinition {
  const definition = animalRegistry.find((animal) => animal.id === animalId);
  if (!definition) {
    throw new Error(`Animal "${animalId}" is not registered.`);
  }
  return definition;
}

export function isAnimalId(value: unknown): value is AnimalId {
  return (
    typeof value === "string" &&
    animalRegistry.some((animal) => animal.id === value)
  );
}

export function chooseRandomAnimal(
  animals: readonly AnimalId[],
): AnimalDefinition {
  if (animals.length === 0) {
    throw new Error("Cannot select an animal from an empty area.");
  }

  const index = Math.floor(Math.random() * animals.length);
  const animalId = animals[index];
  if (animalId === undefined) {
    throw new Error("Could not select an animal from the area.");
  }
  return getAnimalDefinition(animalId);
}

export function distanceBetweenLocations(
  first: Pick<GeolocationCoordinates, "latitude" | "longitude">,
  second: Pick<GeolocationCoordinates, "latitude" | "longitude">,
): number {
  const earthRadiusMeters = 6_371_000;
  const latitudeDifference =
    ((second.latitude - first.latitude) * Math.PI) / 180;
  const longitudeDifference =
    ((second.longitude - first.longitude) * Math.PI) / 180;
  const firstLatitude = (first.latitude * Math.PI) / 180;
  const secondLatitude = (second.latitude * Math.PI) / 180;
  const rawHaversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDifference / 2) ** 2;
  const haversine = Math.min(1, Math.max(0, rawHaversine));
  return (
    earthRadiusMeters *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}
