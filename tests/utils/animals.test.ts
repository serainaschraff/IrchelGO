import { afterEach, describe, expect, it, vi } from "vitest";
import {
  animalRegistry,
  chooseRandomAnimal,
  distanceBetweenLocations,
  encounterRules,
  getAnimalDefinition,
  isAnimalId,
  shouldStartEncounterAfterCameraPan,
  type AnimalId,
  type CameraPanState,
} from "../../src/utils/animals";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("animal registry", () => {
  it("contains unique, resolvable animal IDs", () => {
    const ids = animalRegistry.map((animal) => animal.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(isAnimalId(id)).toBe(true);
      expect(getAnimalDefinition(id).id).toBe(id);
    }
  });

  it("rejects unknown IDs and throws when asked to resolve one", () => {
    expect(isAnimalId("unregistered-animal")).toBe(false);
    expect(() => getAnimalDefinition("unregistered-animal" as AnimalId)).toThrow(
      'Animal "unregistered-animal" is not registered.',
    );
  });
});

describe("chooseRandomAnimal", () => {
  it("selects the animal at the generated random index", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.75);
    const choices = animalRegistry.slice(0, 4).map((animal) => animal.id);

    expect(chooseRandomAnimal(choices).id).toBe(choices[3]);
  });

  it("throws for an empty selection pool", () => {
    expect(() => chooseRandomAnimal([])).toThrow(
      "Cannot select an animal from an empty area.",
    );
  });
});

describe("camera-pan encounter rules", () => {
  it("waits below the turn threshold and triggers once after cooldown", () => {
    const state: CameraPanState = { latched: false, lastAttemptAt: 0 };

    expect(
      shouldStartEncounterAfterCameraPan(
        encounterRules.cameraTurnThresholdRadians - 0.01,
        20_000,
        state,
      ),
    ).toBe(false);
    expect(
      shouldStartEncounterAfterCameraPan(
        encounterRules.cameraTurnThresholdRadians,
        20_000,
        state,
      ),
    ).toBe(true);
    expect(state.lastAttemptAt).toBe(20_000);
    expect(
      shouldStartEncounterAfterCameraPan(
        encounterRules.cameraTurnThresholdRadians,
        40_000,
        state,
      ),
    ).toBe(false);
  });

  it("resets the latch only after the view returns below the reset angle", () => {
    const state: CameraPanState = { latched: true, lastAttemptAt: 0 };

    expect(
      shouldStartEncounterAfterCameraPan(
        encounterRules.cameraTurnResetRadians - 0.01,
        20_000,
        state,
      ),
    ).toBe(false);
    expect(state.latched).toBe(false);
  });

  it("respects the cooldown after a qualifying turn", () => {
    const state: CameraPanState = {
      latched: false,
      lastAttemptAt: 10_000,
    };

    expect(
      shouldStartEncounterAfterCameraPan(
        encounterRules.cameraTurnThresholdRadians,
        10_000 + encounterRules.cameraTurnCooldownMs - 1,
        state,
      ),
    ).toBe(false);
    expect(state.latched).toBe(true);
  });
});

describe("distanceBetweenLocations", () => {
  it("returns zero for the same coordinates", () => {
    expect(
      distanceBetweenLocations(
        { latitude: 47.4, longitude: 8.5 },
        { latitude: 47.4, longitude: 8.5 },
      ),
    ).toBe(0);
  });

  it("calculates a short north-south distance in meters", () => {
    const distance = distanceBetweenLocations(
      { latitude: 0, longitude: 0 },
      { latitude: 0.001, longitude: 0 },
    );

    expect(distance).toBeGreaterThan(111);
    expect(distance).toBeLessThan(112);
  });
});
