import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BufferGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  TubeGeometry,
  Vector3,
} from "three";
import { disposeThreeObject } from "../../src/utils/three";
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

function getModelMeshes(animalId: string) {
  const model = getAnimalDefinition(animalId).createWorldModel();
  const meshes: Mesh[] = [];
  model.traverse((object) => {
    if (object instanceof Mesh) meshes.push(object);
  });
  return { model, meshes };
}

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

  it("builds visible models for every registered animal variant", () => {
    for (const definition of animalRegistry) {
      const model = definition.createWorldModel();
      expect(model.children.length, `${definition.name} should have visible geometry`).toBeGreaterThan(0);
      disposeThreeObject(model);
    }
  });
});

describe("animal model anatomy", () => {
  it("gives foxes four distinct feet and wolves visible eyes and a finished tail", () => {
    const fox = getModelMeshes("ember-fox");
    const foxFeet = fox.meshes.filter(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        Math.abs(mesh.position.y - 0.08) < 0.001 &&
        Math.abs(Math.abs(mesh.position.x) - 0.22) < 0.001 &&
        Math.abs(Math.abs(mesh.position.z) - 0.31) < 0.05,
    );
    expect(foxFeet).toHaveLength(4);
    expect(fox.meshes.some(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        mesh.position.y === 0.58 &&
        mesh.position.z === 0.34 &&
        mesh.scale.x <= 0.2 &&
        mesh.scale.z <= 0.17,
    )).toBe(true);
    expect(fox.meshes.some(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        mesh.position.z === -0.96 &&
        mesh.scale.x <= 0.11 &&
        mesh.scale.z <= 0.13,
    )).toBe(true);
    disposeThreeObject(fox.model);

    const ibex = getModelMeshes("alpine-ibex");
    expect(ibex.meshes.some(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        mesh.position.y === 1.04 &&
        mesh.position.z === 0.47 &&
        mesh.scale.x === 0.075 &&
        mesh.scale.z === 0.095,
    )).toBe(true);
    expect(ibex.meshes.filter(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        mesh.position.y === 1.18 &&
        mesh.position.z === 0.52 &&
        mesh.material instanceof MeshStandardMaterial &&
        mesh.material.color.getHexString() === "201d1b",
    )).toHaveLength(2);
    const ibexHorns = ibex.meshes.filter(
      (mesh) =>
        mesh.geometry.type === "CylinderGeometry" &&
        (mesh.geometry as import("three").CylinderGeometry).parameters.radiusTop <
          (mesh.geometry as import("three").CylinderGeometry).parameters.radiusBottom,
    );
    expect(ibexHorns).toHaveLength(6);
    expect(ibexHorns.filter(
      (mesh) =>
        (mesh.geometry as import("three").CylinderGeometry).parameters.radiusTop < 0.005,
    )).toHaveLength(2);
    expect(ibex.meshes.filter(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        Math.abs(Math.abs(mesh.position.x) - 0.28) < 0.001 &&
        mesh.position.y === 1.3 &&
        Math.abs(mesh.rotation.z) > 0.4,
    )).toHaveLength(2);
    disposeThreeObject(ibex.model);

    const wolf = getModelMeshes("moon-wolf");
    const wolfEyes = wolf.meshes.filter(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        Math.abs(Math.abs(mesh.position.x) - 0.14) < 0.01 &&
        Math.abs(mesh.position.y - 1.19) < 0.01 &&
        Math.abs(mesh.position.z - 0.548) < 0.01 &&
        mesh.material instanceof MeshStandardMaterial &&
        mesh.material.color.getHexString() === "302a27",
    );
    expect(wolfEyes).toHaveLength(2);
    expect(wolf.meshes.some(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        mesh.position.y === 1.04 &&
        mesh.position.z === 0.53 &&
        mesh.scale.z <= 0.2,
    )).toBe(true);
    expect(wolf.meshes.some(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        mesh.position.y === 1.02 &&
        mesh.position.z === 0.69,
    )).toBe(true);
    expect(
      wolf.meshes.some(
        (mesh) =>
          mesh.geometry.type === "SphereGeometry" &&
          mesh.position.x === 0 &&
          mesh.position.y === 0.57 &&
          mesh.position.z === -1.02,
      ),
    ).toBe(true);
    const wolfTailTip = wolf.meshes.find(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        mesh.position.y === 0.57 &&
        mesh.position.z === -1.02,
    );
    expect(wolfTailTip?.scale.x).toBeLessThan(0.08);
    disposeThreeObject(wolf.model);

    const bear = getModelMeshes("chestnut-bear");
    const bearFeet = bear.meshes.filter(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        Math.abs(mesh.position.y - 0.16) < 0.001 &&
        Math.abs(Math.abs(mesh.position.x) - 0.21) < 0.001,
    );
    expect(bearFeet).toHaveLength(2);
    const bearLegs = bear.meshes.filter(
      (mesh) =>
        mesh.geometry instanceof TubeGeometry &&
        mesh.geometry.parameters.path.getPointAt(1).y < 0.25,
    );
    expect(bearLegs).toHaveLength(2);
    for (const leg of bearLegs) {
      if (!(leg.geometry instanceof TubeGeometry)) {
        throw new Error("Expected bear leg to use tube geometry.");
      }
      const end = leg.geometry.parameters.path.getPointAt(1);
      expect(bearFeet.some((foot) => foot.position.distanceTo(end) < 0.12)).toBe(true);
    }
    disposeThreeObject(bear.model);
  });

  it("adds pointed pig ears, nostrils, bear eyes, and lion eyes and ears", () => {
    const pig = getModelMeshes("rosewood-pig");
    expect(pig.meshes.filter(
      (mesh) =>
        mesh.geometry.type === "ConeGeometry" &&
        Math.abs(mesh.position.y - 1.43) < 0.001,
    )).toHaveLength(2);
    expect(pig.meshes.filter(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        Math.abs(mesh.position.y - 1.09) < 0.001 &&
        Math.abs(mesh.position.z - 0.72) < 0.001,
    )).toHaveLength(2);
    expect(pig.meshes.filter(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        Math.abs(mesh.position.y - 0.25) < 0.001 &&
        Math.abs(mesh.scale.y - 0.22) < 0.001 &&
        mesh.material instanceof MeshStandardMaterial &&
        mesh.material.color.getHexString() === "c87882",
    )).toHaveLength(4);
    expect(pig.meshes.some(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        mesh.position.y === 1.08 &&
        mesh.position.z === 0.62 &&
        mesh.scale.z > 0.1,
    )).toBe(true);
    expect(pig.meshes.filter((mesh) => mesh.geometry.type === "TubeGeometry")).toHaveLength(1);
    disposeThreeObject(pig.model);

    for (const id of ["chestnut-bear", "suncrest-lion"]) {
      const { model, meshes } = getModelMeshes(id);
      const darkEyes = meshes.filter(
        (mesh) =>
          mesh.material instanceof MeshStandardMaterial &&
          mesh.material.color.getHexString() === "201d1b",
      );
      expect(darkEyes.length).toBeGreaterThanOrEqual(2);
      if (id === "chestnut-bear") {
        expect(meshes.some(
          (mesh) =>
            mesh.geometry.type === "SphereGeometry" &&
            Math.abs(mesh.position.y - 0.88) < 0.001 &&
            mesh.scale.y > mesh.scale.x,
        )).toBe(true);
      }
      disposeThreeObject(model);
    }

    const lion = getModelMeshes("suncrest-lion");
    expect(lion.meshes.filter(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        Math.abs(Math.abs(mesh.position.x) - 0.32) < 0.001 &&
        Math.abs(mesh.position.y - 1.5) < 0.001,
    )).toHaveLength(2);
    expect(lion.meshes.some(
      (mesh) =>
        mesh.material instanceof MeshStandardMaterial &&
        mesh.material.color.getHexString() === "201d1b" &&
        Math.abs(mesh.position.y - 1.2) < 0.001 &&
        Math.abs(mesh.position.z - 0.63) < 0.001,
    )).toBe(true);
    disposeThreeObject(lion.model);
  });

  it("redesigns the cow with a broad body, four legs, and visible horns", () => {
    const cow = getModelMeshes("edelweiss-cow");
    expect(cow.meshes.filter(
      (mesh) =>
        mesh.geometry.type === "CylinderGeometry" &&
        Math.abs(mesh.position.y - 0.095) < 0.001,
    )).toHaveLength(4);
    expect(cow.meshes.filter(
      (mesh) =>
        mesh.geometry.type === "ConeGeometry" &&
        Math.abs(mesh.position.y - 1.55) < 0.001,
    )).toHaveLength(2);
    expect(cow.meshes.some(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        Math.abs(mesh.position.y - 0.72) < 0.001 &&
        Math.abs(mesh.scale.x - 0.52) < 0.001 &&
        Math.abs(mesh.scale.z - 0.68) < 0.001,
    )).toBe(true);
    disposeThreeObject(cow.model);
  });

  it("builds a jointed low lizard, broad-winged eagle, and spiny hedgehog", () => {
    const lizard = getModelMeshes("emerald-lizard");
    expect(lizard.meshes.filter(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        Math.abs(Math.abs(mesh.position.x) - 0.32) < 0.001 &&
        Math.abs(mesh.position.y - 0.38) < 0.001,
    )).toHaveLength(0);
    expect(lizard.meshes.filter((mesh) => mesh.geometry.type === "TubeGeometry").length).toBeGreaterThanOrEqual(13);
    expect(lizard.meshes.some(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        mesh.position.z === -1.38 &&
        mesh.scale.x < 0.04,
    )).toBe(true);
    const tailSegments = lizard.meshes.filter(
      (mesh) =>
        mesh.geometry instanceof CylinderGeometry &&
        mesh.position.z < -0.75 &&
        mesh.position.z > -1.3,
    );
    expect(tailSegments).toHaveLength(2);
    const firstTailSegment = tailSegments[0];
    const secondTailSegment = tailSegments[1];
    if (
      firstTailSegment === undefined ||
      secondTailSegment === undefined ||
      !(firstTailSegment.geometry instanceof CylinderGeometry) ||
      !(secondTailSegment.geometry instanceof CylinderGeometry)
    ) {
      throw new Error("Expected two tapered lizard tail segments.");
    }
    expect(firstTailSegment.geometry.parameters.radiusBottom).toBeGreaterThan(
      secondTailSegment.geometry.parameters.radiusBottom,
    );
    expect(lizard.meshes.filter(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        Math.abs(Math.abs(mesh.position.x) - 0.17) < 0.001 &&
        Math.abs(mesh.position.y - 0.82) < 0.001 &&
        mesh.position.z >= 0.94,
    )).toHaveLength(2);
    expect(lizard.meshes.some(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        mesh.position.x === 0 &&
        Math.abs(mesh.position.y - 0.69) < 0.001 &&
        Math.abs(mesh.position.z - 0.91) < 0.001,
    )).toBe(false);
    disposeThreeObject(lizard.model);

    const eagle = getModelMeshes("golden-eagle");
    expect(eagle.model.rotation.y).toBe(0);
    expect(eagle.meshes.filter((mesh) => mesh.geometry.type === "TubeGeometry")).toHaveLength(0);
    expect(eagle.meshes.filter((mesh) => mesh.geometry.type === "SphereGeometry")).toHaveLength(11);
    expect(eagle.meshes.filter(
      (mesh) =>
        mesh.geometry.type === "CylinderGeometry" &&
        Math.abs((mesh.geometry as import("three").CylinderGeometry).parameters.radiusTop) < 0.01,
    )).toHaveLength(1);
    expect(eagle.meshes.filter(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        Math.abs(Math.abs(mesh.position.x) - 0.27) < 0.001 &&
        Math.abs(mesh.position.z + 0.02) < 0.001 &&
        Math.abs(mesh.position.y - 0.78) < 0.001 &&
        Math.abs(mesh.scale.y - 0.46) < 0.001,
    )).toHaveLength(2);
    expect(eagle.meshes.filter(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        Math.abs(Math.abs(mesh.position.x) - 0.27) < 0.001 &&
        Math.abs(mesh.rotation.x + 0.28) < 0.001,
    )).toHaveLength(2);
    disposeThreeObject(eagle.model);

    const hedgehog = getModelMeshes("bramble-hedgehog");
    expect(hedgehog.meshes.filter((mesh) => mesh.geometry.type === "ConeGeometry")).toHaveLength(33);
    expect(Math.max(...hedgehog.meshes.filter((mesh) => mesh.geometry.type === "ConeGeometry").map((mesh) => mesh.position.z))).toBeLessThan(0.4);
    disposeThreeObject(hedgehog.model);
  });

  it("builds a humanoid dwarf, redesigned fish, rounded duck bill, and whiskered cat", () => {
    const dwarf = getModelMeshes("mountain-dwarf");
    expect(dwarf.meshes.filter(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        Math.abs(mesh.position.y - 0.13) < 0.001 &&
        Math.abs(Math.abs(mesh.position.x) - 0.15) < 0.001,
    )).toHaveLength(2);
    expect(dwarf.meshes.some(
      (mesh) =>
        mesh.geometry.type === "ConeGeometry" &&
        Math.abs(mesh.position.y - 1.67) < 0.001 &&
        Math.abs(mesh.position.z + 0.08) < 0.001 &&
        mesh.rotation.x < -0.45,
    )).toBe(true);
    const dwarfLegs = dwarf.meshes.filter(
      (mesh) =>
        mesh.geometry instanceof TubeGeometry &&
        mesh.geometry.parameters.path.getPointAt(0).y > 0.5 &&
        mesh.geometry.parameters.path.getPointAt(0).y < 0.65,
    );
    expect(dwarfLegs).toHaveLength(2);
    expect(dwarfLegs.every(
      (mesh) =>
        mesh.geometry instanceof TubeGeometry &&
        mesh.geometry.parameters.path.getPointAt(0).x !== 0 &&
        mesh.geometry.parameters.path.getPointAt(0).x * mesh.geometry.parameters.path.getPointAt(0).x < 0.25 ** 2,
    )).toBe(true);
    expect(dwarf.meshes.some(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        Math.abs(mesh.position.y - 1.11) < 0.001 &&
        Math.abs(mesh.position.z - 0.23) < 0.001 &&
        Math.abs(mesh.scale.x - 0.16) < 0.001 &&
        Math.abs(mesh.scale.y - 0.23) < 0.001,
    )).toBe(true);
    expect(dwarf.meshes.some(
      (mesh) =>
        mesh.geometry.type === "ConeGeometry" &&
        Math.abs(mesh.position.y - 1.13) < 0.001,
    )).toBe(false);
    disposeThreeObject(dwarf.model);

    const fish = getModelMeshes("river-fish");
    expect(fish.meshes.filter((mesh) => mesh.geometry.type === "SphereGeometry").length).toBeGreaterThanOrEqual(10);
    expect(fish.meshes.some((mesh) => mesh.geometry.type === "ConeGeometry")).toBe(false);
    expect(fish.meshes.some(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        mesh.position.x === 0 &&
        Math.abs(mesh.position.y - 0.82) < 0.001 &&
        Math.abs(mesh.position.z - 0.49) < 0.001 &&
        mesh.scale.x < 0.1 &&
        mesh.scale.z < 0.1,
    )).toBe(true);
    expect(fish.meshes.filter((mesh) => mesh.geometry.type === "TubeGeometry")).toHaveLength(0);
    expect(fish.meshes.some(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        Math.abs(mesh.position.z - 0.22) < 0.001 &&
        Math.abs(mesh.position.x) > 0.05 &&
        Math.abs(mesh.position.x) < 0.3 &&
        mesh.position.y > 0.65 &&
        mesh.position.y < 0.85,
    )).toBe(false);
    expect(fish.meshes.some(
      (mesh) =>
        mesh.position.y === 1.04 &&
        Math.abs(mesh.position.x) < 0.001 &&
        mesh.scale.y > 0.1 &&
        mesh.scale.z > mesh.scale.x,
    )).toBe(true);
    disposeThreeObject(fish.model);

    const duck = getModelMeshes("mallard-duck");
    expect(duck.meshes.some(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        mesh.position.y === 1.06 &&
        mesh.position.z === 0.51 &&
        mesh.scale.y < 0.1,
    )).toBe(true);
    expect(duck.meshes.filter(
      (mesh) =>
        mesh.geometry.type === "CylinderGeometry" &&
        Math.abs(mesh.position.y - 0.22) < 0.001 &&
        Math.abs((mesh.geometry as import("three").CylinderGeometry).parameters.height - 0.2) < 0.001,
    )).toHaveLength(2);
    disposeThreeObject(duck.model);

    const cat = getModelMeshes("midnight-cat");
    expect(cat.meshes.filter((mesh) => mesh.geometry.type === "TubeGeometry")).toHaveLength(7);
    expect(cat.meshes.some(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        Math.abs(mesh.position.y - 0.61) < 0.001 &&
        Math.abs(mesh.position.z - 0.34) < 0.001 &&
        Math.abs(mesh.scale.z - 0.14) < 0.001,
    )).toBe(true);
    expect(cat.meshes.some(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        Math.abs(mesh.position.x - 0.24) < 0.001 &&
        Math.abs(mesh.position.y - 1.14) < 0.001 &&
        Math.abs(mesh.position.z + 0.66) < 0.001 &&
        mesh.scale.x < 0.04 &&
        mesh.scale.y < 0.04,
    )).toBe(true);
    expect(cat.meshes.some(
      (mesh) =>
        mesh.geometry.type === "ConeGeometry" &&
        Math.abs(mesh.position.y - 1.07) < 0.001 &&
        Math.abs(mesh.position.z - 0.54) < 0.001,
    )).toBe(true);
    disposeThreeObject(cat.model);
  });

  it("builds quartz prism clusters, detailed marmot and monkey faces, short mouse legs, and a tail-free crow", () => {
    const crystal = getModelMeshes("amethyst-crystal");
    const crystalGroups = crystal.model.children.filter(
      (child): child is Group => child instanceof Group,
    );
    expect(crystalGroups).toHaveLength(5);
    const crystalMeshes = crystalGroups.map((cluster) => cluster.children[0]);
    expect(crystalMeshes.every(
      (mesh) =>
        mesh instanceof Mesh &&
        mesh.geometry instanceof BufferGeometry &&
        mesh.geometry.getAttribute("position").count === 72,
    )).toBe(true);
    expect(crystalGroups.every((cluster) => cluster.children.length === 1)).toBe(true);
    const crystalHeights = crystalMeshes.map((mesh) => {
      if (!(mesh instanceof Mesh) || !(mesh.geometry instanceof BufferGeometry)) {
        throw new Error("Expected custom geometry for each crystal.");
      }
      const positions = mesh.geometry.getAttribute("position");
      let minimumY = Infinity;
      let maximumY = -Infinity;
      for (let index = 0; index < positions.count; index += 1) {
        const y = positions.getY(index);
        minimumY = Math.min(minimumY, y);
        maximumY = Math.max(maximumY, y);
      }
      return maximumY - minimumY;
    });
    expect(new Set(crystalHeights).size).toBeGreaterThan(1);
    expect(crystalGroups.every((cluster) => {
      const direction = new Vector3(0, 1, 0).applyEuler(cluster.rotation);
      return cluster.position.x * direction.x + cluster.position.z * direction.z > 0;
    })).toBe(true);
    const crystalBases = crystalGroups
      .map((cluster) => {
        const shaft = cluster.children.find(
          (child): child is Mesh =>
            child instanceof Mesh &&
            child.geometry instanceof BufferGeometry,
        );
        if (!shaft || !(shaft.geometry instanceof BufferGeometry)) {
          throw new Error("Each crystal should use custom faceted geometry.");
        }
        return {
          position: cluster.position,
          radius: shaft.geometry.boundingSphere?.radius ?? 0,
        };
      })
      .sort((first, second) => first.position.x - second.position.x);
    expect(crystalBases.slice(1).every((base, index) => {
      const previous = crystalBases[index];
      return previous !== undefined &&
        Math.hypot(
          base.position.x - previous.position.x,
          base.position.z - previous.position.z,
        ) < 0.16;
    })).toBe(true);
    disposeThreeObject(crystal.model);

    for (const id of ["alpine-marmot", "canopy-monkey", "river-mink"]) {
      const { model, meshes } = getModelMeshes(id);
      expect(meshes.filter((mesh) => mesh.geometry.type === "TubeGeometry").length).toBeGreaterThan(2);
      if (id === "river-mink") {
        const frontLeg = meshes.find(
          (mesh) =>
            mesh.geometry instanceof TubeGeometry &&
            mesh.geometry.parameters.path.getPointAt(0).z > 0.2 &&
            Math.abs(mesh.geometry.parameters.radius - 0.055) < 0.001,
        );
        const hindLegs = meshes.filter(
          (mesh) =>
            mesh.geometry instanceof TubeGeometry &&
            mesh.geometry.parameters.path.getPointAt(0).z < -0.3 &&
            mesh.geometry.parameters.path.getPointAt(1).y < 0.3,
        );
        expect(frontLeg).toBeDefined();
        expect(hindLegs).toHaveLength(2);
        expect(hindLegs.every(
          (mesh) =>
            mesh.geometry instanceof TubeGeometry &&
            Math.abs(mesh.geometry.parameters.radius - 0.055) < 0.001,
        )).toBe(true);
      }
      disposeThreeObject(model);
    }

    const monkey = getModelMeshes("canopy-monkey");
    expect(monkey.meshes.some(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        mesh.position.x === 0.2 &&
        mesh.position.y === 0.78 &&
        mesh.position.z === -0.7 &&
        mesh.scale.x < 0.04 &&
        mesh.scale.y < 0.04,
    )).toBe(true);
    disposeThreeObject(monkey.model);

    const mouse = getModelMeshes("field-mouse");
    expect(mouse.meshes.filter(
      (mesh) =>
        mesh.geometry.type === "SphereGeometry" &&
        Math.abs(mesh.position.y - 0.2) < 0.001,
    )).toHaveLength(2);
    expect(mouse.meshes.filter((mesh) => mesh.geometry.type === "TubeGeometry").length).toBeGreaterThanOrEqual(5);
    expect(mouse.meshes.filter(
      (mesh) =>
        mesh.geometry.type === "TubeGeometry" &&
        mesh.material instanceof MeshStandardMaterial &&
        ["403b3b", "46505d"].includes(mesh.material.color.getHexString()),
    )).toHaveLength(0);
    disposeThreeObject(mouse.model);

    const crow = getModelMeshes("raven-crow");
    expect(crow.meshes.filter((mesh) => mesh.geometry.type === "TubeGeometry")).toHaveLength(0);
    disposeThreeObject(crow.model);
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
