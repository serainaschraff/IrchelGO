import { useEffect, useMemo, useRef } from "react";
import {
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import type { AnimalDefinition, AnimalModelProps } from "./types";
import { disposeThreeObject } from "../utils/three";

export type CreatureSpecies =
  | "ibex"
  | "wolf"
  | "butterfly"
  | "pig"
  | "bear"
  | "cow"
  | "lion"
  | "lizard"
  | "eagle"
  | "hedgehog"
  | "dwarf";

export type CreaturePalette = {
  body: string;
  belly: string;
  detail: string;
  accent: string;
};

function addSphere(
  parent: Group,
  color: string,
  position: [number, number, number],
  scale: [number, number, number],
  roughness = 0.82,
) {
  const mesh = new Mesh(
    new SphereGeometry(1, 16, 12),
    new MeshStandardMaterial({ color, roughness }),
  );
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCone(
  parent: Group,
  color: string,
  position: [number, number, number],
  radius: number,
  height: number,
  rotation: [number, number, number] = [0, 0, 0],
) {
  const mesh = new Mesh(
    new ConeGeometry(radius, height, 7),
    new MeshStandardMaterial({ color, roughness: 0.8 }),
  );
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCylinder(
  parent: Group,
  color: string,
  position: [number, number, number],
  radiusTop: number,
  radiusBottom: number,
  height: number,
  rotation: [number, number, number] = [0, 0, 0],
) {
  const mesh = new Mesh(
    new CylinderGeometry(radiusTop, radiusBottom, height, 10),
    new MeshStandardMaterial({ color, roughness: 0.78 }),
  );
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function addTube(
  parent: Group,
  color: string,
  points: [number, number, number][],
  radius: number,
) {
  const curve = new CatmullRomCurve3(
    points.map(([x, y, z]) => new Vector3(x, y, z)),
  );
  const mesh = new Mesh(
    new TubeGeometry(curve, 14, radius, 6, false),
    new MeshStandardMaterial({ color, roughness: 0.76 }),
  );
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function addEyes(parent: Group, y: number, z: number, spacing = 0.12) {
  for (const side of [-1, 1]) {
    addSphere(parent, "#201d1b", [side * spacing, y, z], [0.026, 0.035, 0.022], 0.3);
    addSphere(parent, "#ffffff", [side * spacing - 0.007, y + 0.012, z + 0.016], [0.008, 0.01, 0.006], 0.2);
  }
}

function addLegs(
  parent: Group,
  color: string,
  width: number,
  length: number,
  zFront = 0.27,
  zBack = -0.3,
) {
  for (const x of [-width, width]) {
    for (const z of [zFront, zBack]) {
      addSphere(parent, color, [x, 0.2, z], [0.085, 0.23, 0.09]);
    }
  }
}

function addCreature(
  group: Group,
  species: CreatureSpecies,
  palette: CreaturePalette,
) {
  const { body, belly, detail, accent } = palette;

  if (species === "butterfly") {
    addCylinder(group, detail, [0, 0.86, 0.1], 0.045, 0.055, 0.62);
    for (const side of [-1, 1]) {
      addSphere(group, body, [side * 0.25, 1.05, 0.08], [0.29, 0.27, 0.07]);
      addSphere(group, accent, [side * 0.23, 0.67, 0.08], [0.22, 0.19, 0.06]);
      addSphere(group, detail, [side * 0.3, 1.07, 0.15], [0.07, 0.07, 0.025]);
      addTube(group, detail, [[side * 0.04, 1.17, 0.12], [side * 0.1, 1.38, 0.14], [side * 0.2, 1.43, 0.12]], 0.012);
    }
    return;
  }

  if (species === "dwarf") {
    addCylinder(group, body, [0, 0.65, 0], 0.34, 0.24, 0.7);
    addSphere(group, belly, [0, 1.13, 0.04], [0.23, 0.25, 0.22]);
    addSphere(group, detail, [0, 0.95, 0.22], [0.2, 0.25, 0.12]);
    addCone(group, accent, [0, 1.48, 0.02], 0.27, 0.48);
    addSphere(group, body, [0, 1.28, 0.13], [0.28, 0.08, 0.24]);
    addSphere(group, belly, [0, 1.02, 0.22], [0.14, 0.15, 0.13]);
    addEyes(group, 1.17, 0.235, 0.09);
    addLegs(group, detail, 0.19, 0.3, 0.12, -0.12);
    return;
  }

  const bodyScale: Record<Exclude<CreatureSpecies, "butterfly" | "dwarf">, [number, number, number]> = {
    ibex: [0.35, 0.38, 0.5],
    wolf: [0.3, 0.34, 0.58],
    pig: [0.38, 0.34, 0.48],
    bear: [0.4, 0.46, 0.42],
    cow: [0.39, 0.4, 0.55],
    lion: [0.36, 0.38, 0.48],
    lizard: [0.27, 0.22, 0.62],
    eagle: [0.3, 0.36, 0.38],
    hedgehog: [0.38, 0.34, 0.46],
  };
  const bodyY = species === "lizard" ? 0.48 : 0.62;
  addSphere(group, body, [0, bodyY, 0], bodyScale[species]);
  addSphere(group, belly, [0, bodyY - 0.03, 0.31], [0.23, 0.27, 0.24]);

  if (species === "eagle") {
    addSphere(group, body, [0, 1.08, 0.24], [0.25, 0.29, 0.25]);
    addCone(group, accent, [0, 1.04, 0.51], 0.12, 0.27, [Math.PI / 2, 0, 0]);
    for (const side of [-1, 1]) {
      const wing = addSphere(group, body, [side * 0.43, 0.82, -0.02], [0.42, 0.1, 0.24]);
      wing.rotation.z = side * 0.18;
      addCylinder(group, accent, [side * 0.17, 0.17, 0.04], 0.035, 0.045, 0.18);
    }
    addEyes(group, 1.16, 0.45, 0.1);
    return;
  }

  if (species === "lizard") {
    addSphere(group, belly, [0, 0.47, 0.43], [0.2, 0.13, 0.34]);
    addSphere(group, body, [0, 0.56, 0.52], [0.22, 0.2, 0.25]);
    addSphere(group, accent, [0, 0.52, -0.55], [0.16, 0.14, 0.55]);
    for (const side of [-1, 1]) {
      addSphere(group, body, [side * 0.24, 0.38, 0.25], [0.15, 0.1, 0.22]);
      addSphere(group, body, [side * 0.21, 0.38, -0.28], [0.14, 0.1, 0.18]);
    }
    addEyes(group, 0.62, 0.71, 0.13);
    return;
  }

  addSphere(group, body, [0, 1.12, 0.28], [0.29, 0.28, 0.27]);

  switch (species) {
    case "ibex":
      addSphere(group, belly, [0, 1.03, 0.51], [0.16, 0.14, 0.24]);
      for (const side of [-1, 1]) {
        addTube(group, accent, [[side * 0.16, 1.31, 0.22], [side * 0.24, 1.57, 0.16], [side * 0.21, 1.78, 0.04], [side * 0.11, 1.7, -0.03]], 0.045);
        addSphere(group, body, [side * 0.29, 1.19, 0.25], [0.13, 0.06, 0.18]);
      }
      addLegs(group, detail, 0.23, 0.33);
      break;
    case "wolf":
      addCone(group, body, [-0.17, 1.43, 0.18], 0.13, 0.34, [0, 0, 0.12]);
      addCone(group, body, [0.17, 1.43, 0.18], 0.13, 0.34, [0, 0, -0.12]);
      addSphere(group, accent, [0, 1.04, 0.53], [0.16, 0.13, 0.29]);
      addSphere(group, detail, [0, 1.02, 0.79], [0.07, 0.06, 0.07]);
      addTube(group, body, [[0, 0.7, -0.35], [0, 0.62, -0.72], [0, 0.8, -0.98]], 0.11);
      addLegs(group, body, 0.22, 0.36);
      break;
    case "pig":
      addSphere(group, accent, [0, 1.07, 0.54], [0.2, 0.15, 0.14]);
      addSphere(group, detail, [0, 1.08, 0.67], [0.14, 0.105, 0.055]);
      for (const side of [-1, 1]) {
        const ear = addSphere(group, body, [side * 0.25, 1.37, 0.18], [0.14, 0.2, 0.08]);
        ear.rotation.z = side * 0.45;
      }
      addEyes(group, 1.2, 0.5);
      addTube(group, body, [[0.08, 0.72, -0.4], [0.2, 0.86, -0.58], [0.1, 0.98, -0.62]], 0.035);
      addLegs(group, detail, 0.24, 0.31);
      break;
    case "bear":
      for (const side of [-1, 1]) {
        addSphere(group, body, [side * 0.22, 1.39, 0.2], [0.13, 0.13, 0.1]);
        addSphere(group, accent, [side * 0.22, 1.4, 0.28], [0.065, 0.065, 0.04]);
      }
      addSphere(group, belly, [0, 1.04, 0.52], [0.19, 0.15, 0.2]);
      addSphere(group, detail, [0, 1.12, 0.7], [0.065, 0.055, 0.05]);
      addLegs(group, body, 0.26, 0.4);
      break;
    case "cow":
      addCone(group, accent, [-0.2, 1.4, 0.18], 0.07, 0.23, [0, 0, 0.5]);
      addCone(group, accent, [0.2, 1.4, 0.18], 0.07, 0.23, [0, 0, -0.5]);
      addSphere(group, detail, [-0.22, 0.72, 0.19], [0.13, 0.17, 0.04]);
      addSphere(group, detail, [0.22, 0.55, -0.08], [0.15, 0.14, 0.04]);
      addSphere(group, belly, [0, 1.03, 0.54], [0.19, 0.15, 0.19]);
      addSphere(group, accent, [0, 0.28, -0.36], [0.15, 0.15, 0.17]);
      addTube(group, body, [[0.18, 0.9, -0.38], [0.28, 0.68, -0.55], [0.24, 0.58, -0.57]], 0.025);
      addLegs(group, body, 0.25, 0.37);
      break;
    case "lion":
      addSphere(group, accent, [0, 1.13, 0.24], [0.4, 0.4, 0.33]);
      addSphere(group, belly, [0, 1.08, 0.51], [0.21, 0.23, 0.2]);
      addSphere(group, detail, [0, 1.04, 0.69], [0.08, 0.06, 0.055]);
      addTube(group, body, [[0.1, 0.7, -0.4], [0.24, 0.67, -0.64], [0.28, 0.81, -0.72]], 0.035);
      addSphere(group, accent, [0.29, 0.83, -0.74], [0.08, 0.11, 0.08]);
      addLegs(group, body, 0.24, 0.37);
      break;
    case "hedgehog":
      addSphere(group, belly, [0, 0.98, 0.51], [0.16, 0.13, 0.24]);
      for (let index = 0; index < 9; index++) {
        const x = ((index % 3) - 1) * 0.19;
        const z = 0.23 - Math.floor(index / 3) * 0.2;
        addCone(group, accent, [x, 1.25 + (index % 2) * 0.05, z], 0.095, 0.26, [0.28, 0, -x * 0.8]);
      }
      addSphere(group, detail, [0, 1.06, 0.74], [0.045, 0.04, 0.04]);
      addLegs(group, detail, 0.23, 0.26);
      break;
  }

  addEyes(group, 1.17, species === "ibex" ? 0.57 : 0.48);
}

export function createCreatureModel(
  species: CreatureSpecies,
  palette: CreaturePalette,
) {
  const creature = new Group();
  creature.scale.setScalar(0.32);
  addCreature(creature, species, palette);
  return creature;
}

function CreatureModel({
  species,
  palette,
  position,
  rotation,
}: AnimalModelProps & { species: CreatureSpecies; palette: CreaturePalette }) {
  const model = useMemo(
    () => createCreatureModel(species, palette),
    [species, palette],
  );
  const disposalTimeout = useRef<number | null>(null);

  useEffect(() => {
    if (disposalTimeout.current !== null) {
      window.clearTimeout(disposalTimeout.current);
      disposalTimeout.current = null;
    }
    return () => {
      disposalTimeout.current = window.setTimeout(() => {
        disposeThreeObject(model);
        disposalTimeout.current = null;
      });
    };
  }, [model]);

  return (
    <group position={position} rotation={rotation}>
      <ambientLight intensity={1.5} />
      <directionalLight position={[3, 5, 4]} intensity={2.2} />
      <primitive object={model} />
    </group>
  );
}

export function createCreatureDefinition(
  id: string,
  name: string,
  species: CreatureSpecies,
  palette: CreaturePalette,
): AnimalDefinition {
  return {
    id,
    name,
    WebXRModel: (props: AnimalModelProps) => (
      <CreatureModel {...props} species={species} palette={palette} />
    ),
    createWorldModel: () => createCreatureModel(species, palette),
  };
}
