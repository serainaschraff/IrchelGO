import { useEffect, useMemo, useRef } from "react";
import {
  BufferGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Float32BufferAttribute,
  Mesh,
  MeshStandardMaterial,
  OctahedronGeometry,
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
  | "dwarf"
  | "fox"
  | "fish"
  | "duck"
  | "cat"
  | "crystal"
  | "marmot"
  | "monkey"
  | "mouse"
  | "crow"
  | "mink";

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

function addTaperedSegment(
  parent: Group,
  color: string,
  start: [number, number, number],
  end: [number, number, number],
  startRadius: number,
  endRadius: number,
) {
  const startPoint = new Vector3(...start);
  const endPoint = new Vector3(...end);
  const direction = endPoint.clone().sub(startPoint);
  const mesh = new Mesh(
    new CylinderGeometry(endRadius, startRadius, direction.length(), 8),
    new MeshStandardMaterial({ color, roughness: 0.8 }),
  );
  mesh.position.copy(startPoint.add(endPoint).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize());
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

function createHexagonalCrystalGeometry(radius: number, height: number, tipHeight: number) {
  const positions: number[] = [];
  const ring = Array.from({ length: 6 }, (_, index) => {
    const angle = (index / 6) * Math.PI * 2;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius] as const;
  });
  const addTriangle = (
    first: [number, number, number],
    second: [number, number, number],
    third: [number, number, number],
  ) => {
    positions.push(...first, ...second, ...third);
  };

  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    if (!current || !next) continue;

    const bottomCurrent: [number, number, number] = [current[0], 0, current[1]];
    const bottomNext: [number, number, number] = [next[0], 0, next[1]];
    const topCurrent: [number, number, number] = [current[0], height, current[1]];
    const topNext: [number, number, number] = [next[0], height, next[1]];
    const apex: [number, number, number] = [0, height + tipHeight, 0];

    addTriangle([0, 0, 0], bottomNext, bottomCurrent);
    addTriangle(bottomCurrent, bottomNext, topNext);
    addTriangle(bottomCurrent, topNext, topCurrent);
    addTriangle(topCurrent, topNext, apex);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
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

function addMouth(
  parent: Group,
  color: string,
  center: [number, number, number],
  width: number,
) {
  const [x, y, z] = center;
  addTube(
    parent,
    color,
    [[x - width, y + 0.035, z], [x, y - 0.015, z + 0.015], [x + width, y + 0.035, z]],
    0.012,
  );
}

function addCreature(
  group: Group,
  species: CreatureSpecies,
  palette: CreaturePalette,
) {
  const { body, belly, detail, accent } = palette;

  if (species === "bear") {
    addSphere(group, body, [0, 0.88, 0], [0.39, 0.58, 0.34]);
    addSphere(group, belly, [0, 0.9, 0.29], [0.23, 0.4, 0.08]);
    addSphere(group, body, [0, 1.53, 0.08], [0.3, 0.31, 0.28]);
    for (const side of [-1, 1]) {
      addSphere(group, body, [side * 0.23, 1.78, 0.08], [0.12, 0.14, 0.09]);
      addSphere(group, belly, [side * 0.23, 1.78, 0.14], [0.065, 0.08, 0.04]);
      addTube(group, body, [[side * 0.28, 1.2, 0.03], [side * 0.42, 0.95, 0.1], [side * 0.43, 0.72, 0.22]], 0.11);
      addSphere(group, belly, [side * 0.43, 0.7, 0.25], [0.11, 0.1, 0.12]);
      addTube(group, body, [[side * 0.18, 0.54, 0], [side * 0.21, 0.36, 0.08], [side * 0.21, 0.2, 0.17]], 0.14);
      addSphere(group, detail, [side * 0.21, 0.16, 0.2], [0.16, 0.1, 0.22]);
    }
    addSphere(group, belly, [0, 1.48, 0.3], [0.16, 0.12, 0.12]);
    addSphere(group, detail, [0, 1.5, 0.41], [0.06, 0.05, 0.04]);
    addEyes(group, 1.58, 0.32, 0.12);
    return;
  }

  if (species === "cow") {
    addSphere(group, body, [0, 0.72, 0], [0.52, 0.4, 0.68]);
    addSphere(group, belly, [0, 0.7, 0.48], [0.34, 0.31, 0.28]);
    addSphere(group, body, [0, 1.18, 0.46], [0.32, 0.36, 0.34]);
    addSphere(group, belly, [0, 1.02, 0.75], [0.23, 0.18, 0.2]);
    addSphere(group, accent, [0, 1.04, 0.91], [0.17, 0.12, 0.08]);
    addSphere(group, detail, [-0.07, 1.05, 0.98], [0.025, 0.03, 0.014]);
    addSphere(group, detail, [0.07, 1.05, 0.98], [0.025, 0.03, 0.014]);
    addSphere(group, "#241d1a", [-0.13, 1.27, 0.75], [0.035, 0.045, 0.025], 0.3);
    addSphere(group, "#241d1a", [0.13, 1.27, 0.75], [0.035, 0.045, 0.025], 0.3);
    for (const side of [-1, 1]) {
      addSphere(group, accent, [side * 0.35, 1.28, 0.42], [0.19, 0.1, 0.13]);
      addCone(group, detail, [side * 0.17, 1.55, 0.42], 0.055, 0.22, [0, 0, side * 0.3]);
      const legX = side * 0.3;
      for (const legZ of [-0.43, 0.43]) {
        addSphere(group, body, [legX, 0.3, legZ], [0.105, 0.29, 0.11]);
        addCylinder(group, detail, [legX, 0.095, legZ + 0.015], 0.095, 0.11, 0.15);
      }
    }
    addTube(group, body, [[0, 0.68, -0.56], [0.03, 0.45, -0.68], [0.03, 0.2, -0.77], [0.03, 0.12, -0.84]], 0.025);
    addSphere(group, accent, [0.03, 0.12, -0.84], [0.07, 0.035, 0.07]);
    return;
  }

  if (species === "lizard") {
    addSphere(group, body, [0, 0.58, -0.02], [0.25, 0.2, 0.64]);
    addSphere(group, belly, [0, 0.47, 0.08], [0.2, 0.09, 0.44]);
    addTube(group, body, [[0, 0.61, 0.28], [0, 0.68, 0.49], [0, 0.73, 0.68]], 0.13);
    addSphere(group, body, [0, 0.76, 0.75], [0.29, 0.14, 0.27]);
    for (const side of [-1, 1]) {
      addSphere(group, "#111b16", [side * 0.17, 0.82, 0.94], [0.065, 0.075, 0.045], 0.28);
      addSphere(group, detail, [side * 0.17, 0.83, 0.976], [0.025, 0.028, 0.018], 0.25);
    }
    const tailBase: [number, number, number] = [0, 0.57, -0.54];
    const tailMiddle: [number, number, number] = [0, 0.48, -0.84];
    const tailNarrow: [number, number, number] = [0, 0.43, -1.12];
    const tailTip: [number, number, number] = [0, 0.5, -1.36];
    addTaperedSegment(group, body, tailBase, tailMiddle, 0.12, 0.085);
    addTaperedSegment(group, body, tailMiddle, tailNarrow, 0.085, 0.05);
    addTaperedSegment(group, body, tailNarrow, tailTip, 0.05, 0.018);
    addSphere(group, accent, [0, 0.5, -1.38], [0.025, 0.025, 0.035]);

    for (const side of [-1, 1]) {
      for (const legZ of [-0.36, 0.34]) {
        const shoulder = [side * 0.18, 0.55, legZ] as [number, number, number];
        const elbow = [side * 0.32, 0.38, legZ + (legZ > 0 ? 0.1 : -0.12)] as [number, number, number];
        const wrist = [side * 0.38, 0.16, elbow[2] + (legZ > 0 ? 0.12 : -0.1)] as [number, number, number];
        addTube(group, body, [shoulder, elbow, wrist], 0.065);
        for (let toe = -1; toe <= 1; toe += 1) {
          addTube(
            group,
            detail,
            [wrist, [wrist[0] + side * 0.08, 0.12, wrist[2] + toe * 0.055]],
            0.018,
          );
        }
      }
    }
    return;
  }

  if (species === "eagle") {
    addSphere(group, body, [0, 0.9, 0], [0.35, 0.48, 0.34]);
    addSphere(group, belly, [0, 0.91, 0.27], [0.25, 0.35, 0.12]);
    addSphere(group, accent, [0, 1.52, 0.12], [0.24, 0.28, 0.23]);
    addTaperedSegment(group, detail, [0, 1.49, 0.29], [0, 1.38, 0.48], 0.075, 0.003);
    addEyes(group, 1.55, 0.31, 0.1);
    for (const side of [-1, 1]) {
      const wing = addSphere(group, body, [side * 0.27, 0.78, -0.02], [0.16, 0.46, 0.27]);
      wing.rotation.z = side * -0.12;
      wing.rotation.x = -0.28;
      addSphere(group, accent, [side * 0.17, 0.37, -0.2], [0.075, 0.18, 0.07]);
    }
    return;
  }

  if (species === "hedgehog") {
    addSphere(group, body, [0, 0.62, -0.05], [0.4, 0.34, 0.55]);
    addSphere(group, belly, [0, 0.48, 0.12], [0.3, 0.18, 0.36]);
    addSphere(group, body, [0, 0.8, 0.34], [0.28, 0.24, 0.3]);
    addSphere(group, belly, [0, 0.7, 0.57], [0.2, 0.13, 0.24]);
    addSphere(group, detail, [0, 0.77, 0.77], [0.055, 0.045, 0.04]);
    addSphere(group, "#251d19", [-0.17, 0.87, 0.52], [0.035, 0.042, 0.025], 0.3);
    addSphere(group, "#251d19", [0.17, 0.87, 0.52], [0.035, 0.042, 0.025], 0.3);
    for (let row = 0; row < 5; row += 1) {
      const z = -0.52 + row * 0.19;
      for (let column = -2; column <= 2; column += 1) {
        const x = column * 0.14;
        const bodySurface = Math.sqrt(Math.max(0.08, 1 - (x / 0.4) ** 2 - ((z + 0.05) / 0.55) ** 2));
        const headSurface = Math.sqrt(Math.max(0.08, 1 - (x / 0.28) ** 2 - ((z - 0.34) / 0.3) ** 2));
        const y = z > 0.18
          ? 0.8 + 0.24 * headSurface
          : 0.62 + 0.34 * bodySurface;
        addCone(group, accent, [x, y + 0.09, z], 0.045, 0.23, [-0.55, 0, -x * 0.7]);
      }
    }
    for (const side of [-1, 1]) {
      for (let row = 0; row < 4; row += 1) {
        const z = -0.42 + row * 0.2;
        const y = 0.72 + row * 0.02;
        addCone(group, accent, [side * 0.35, y, z], 0.04, 0.21, [-0.55, 0, -side * 0.72]);
      }
    }
    for (const side of [-1, 1]) {
      addSphere(group, detail, [side * 0.23, 0.29, 0.24], [0.09, 0.12, 0.1]);
      addSphere(group, detail, [side * 0.23, 0.29, -0.28], [0.09, 0.12, 0.1]);
    }
    return;
  }

  if (species === "dwarf") {
    addSphere(group, body, [0, 0.87, 0], [0.25, 0.38, 0.22]);
    addSphere(group, belly, [0, 1.38, 0.05], [0.22, 0.25, 0.22]);
    addSphere(group, detail, [0, 1.11, 0.23], [0.16, 0.23, 0.1]);
    addCone(group, accent, [0, 1.67, -0.08], 0.25, 0.48, [-0.5, 0, 0]);
    addSphere(group, "#211a18", [-0.09, 1.43, 0.24], [0.025, 0.03, 0.02], 0.25);
    addSphere(group, "#211a18", [0.09, 1.43, 0.24], [0.025, 0.03, 0.02], 0.25);
    addSphere(group, belly, [0, 1.4, 0.28], [0.025, 0.03, 0.02]);
    const belt = new Mesh(
      new TorusGeometry(0.21, 0.035, 8, 24),
      new MeshStandardMaterial({ color: accent, roughness: 0.78 }),
    );
    belt.rotation.x = Math.PI / 2;
    belt.position.set(0, 0.74, 0);
    group.add(belt);
    addSphere(group, detail, [0, 0.74, 0.21], [0.06, 0.055, 0.025]);
    for (const side of [-1, 1]) {
      addTube(group, body, [[side * 0.18, 1.12, 0.02], [side * 0.31, 0.93, 0.07], [side * 0.39, 0.76, 0.12]], 0.075);
      addSphere(group, belly, [side * 0.4, 0.75, 0.14], [0.08, 0.07, 0.09]);
      addTube(group, body, [[side * 0.1, 0.58, 0], [side * 0.13, 0.39, 0.03], [side * 0.15, 0.2, 0.08]], 0.09);
      addSphere(group, detail, [side * 0.15, 0.13, 0.12], [0.13, 0.08, 0.22]);
    }
    return;
  }

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

  if (species === "crystal") {
    const crystals = [
      [-0.11, 0.02, 0.76, 0.12, 0.48],
      [-0.055, 0.04, 0.91, 0.1, 0.62],
      [0, 0.06, 1.0, 0.14, 0.2],
      [0.055, 0.04, 0.84, 0.11, 0.53],
      [0.11, 0.02, 0.69, 0.09, 0.68],
    ] as const;
    for (const [x, z, height, radius, outwardTilt] of crystals) {
      const baseY = 0.08;
      const tipHeight = radius * 1.25;
      const crystal = new Group();
      const mesh = new Mesh(
        createHexagonalCrystalGeometry(radius, height, tipHeight),
        new MeshStandardMaterial({
          color: body,
          emissive: body,
          emissiveIntensity: 0.08,
          roughness: 0.3,
          metalness: 0.12,
          flatShading: true,
          transparent: true,
          opacity: 0.92,
        }),
      );
      crystal.add(mesh);
      crystal.position.set(x, baseY, z);
      const radialLength = Math.hypot(x, z);
      crystal.rotation.set(
        (z / radialLength) * outwardTilt,
        0,
        (-x / radialLength) * outwardTilt,
      );
      group.add(crystal);
    }
    return;
  }

  if (species === "fish") {
    addSphere(group, body, [0, 0.82, 0], [0.32, 0.3, 0.5]);
    addSphere(group, belly, [0, 0.74, 0.12], [0.24, 0.19, 0.3]);
    addSphere(group, accent, [0, 0.82, -0.5], [0.045, 0.22, 0.24]);
    for (const side of [-1, 1]) {
      const pectoral = addSphere(group, accent, [side * 0.27, 0.76, -0.03], [0.2, 0.07, 0.11]);
      pectoral.rotation.z = side * -0.55;
      addSphere(group, "#ffffff", [side * 0.23, 0.91, 0.31], [0.065, 0.07, 0.035], 0.2);
      addSphere(group, "#171b1c", [side * 0.23, 0.91, 0.34], [0.03, 0.038, 0.02], 0.2);
    }
    addSphere(group, accent, [0, 0.82, 0.49], [0.085, 0.065, 0.07]);
    const dorsalFin = addSphere(group, accent, [0, 1.04, -0.04], [0.11, 0.16, 0.27]);
    dorsalFin.rotation.z = 0;
    return;
  }

  if (species === "duck") {
    addSphere(group, body, [0, 0.65, 0], [0.42, 0.34, 0.56]);
    addSphere(group, belly, [0, 0.72, 0.32], [0.29, 0.27, 0.3]);
    addSphere(group, body, [0, 1.12, 0.25], [0.24, 0.27, 0.24]);
    addSphere(group, accent, [0, 1.06, 0.51], [0.17, 0.065, 0.17]);
    addSphere(group, accent, [0, 1.0, 0.52], [0.12, 0.035, 0.13]);
    for (const side of [-1, 1]) {
      const wing = addSphere(group, accent, [side * 0.32, 0.72, -0.04], [0.18, 0.12, 0.32]);
      wing.rotation.y = side * 0.2;
      addCylinder(group, detail, [side * 0.13, 0.22, 0.12], 0.025, 0.03, 0.2);
    }
    addEyes(group, 1.17, 0.45, 0.14);
    return;
  }

  if (species === "cat") {
    addSphere(group, body, [0, 0.65, 0], [0.34, 0.38, 0.48]);
    addSphere(group, belly, [0, 0.61, 0.34], [0.2, 0.23, 0.14]);
    addSphere(group, body, [0, 1.15, 0.27], [0.3, 0.29, 0.27]);
    addCone(group, body, [-0.19, 1.49, 0.23], 0.13, 0.38, [0, 0, 0.1]);
    addCone(group, body, [0.19, 1.49, 0.23], 0.13, 0.38, [0, 0, -0.1]);
    for (const side of [-1, 1]) {
      addTube(group, belly, [[side * 0.08, 1.06, 0.5], [side * 0.25, 1.1, 0.51]], 0.01);
      addTube(group, belly, [[side * 0.08, 1.03, 0.5], [side * 0.26, 1.02, 0.52]], 0.01);
      addTube(group, belly, [[side * 0.08, 1.0, 0.49], [side * 0.23, 0.95, 0.51]], 0.01);
    }
    addCone(group, accent, [0, 1.07, 0.54], 0.04, 0.045, [Math.PI / 2, 0, 0]);
    addTube(group, accent, [[0, 0.77, -0.38], [0.14, 0.95, -0.65], [0.24, 1.14, -0.66]], 0.045);
    addSphere(group, accent, [0.24, 1.14, -0.66], [0.03, 0.03, 0.035]);
    addLegs(group, body, 0.2, 0.34);
    addEyes(group, 1.2, 0.51, 0.12);
    return;
  }

  if (species === "marmot") {
    addSphere(group, body, [0, 0.76, -0.02], [0.39, 0.49, 0.4]);
    addSphere(group, belly, [0, 0.77, 0.31], [0.25, 0.34, 0.1]);
    addSphere(group, body, [0, 1.28, 0.18], [0.29, 0.27, 0.26]);
    addSphere(group, belly, [0, 1.16, 0.39], [0.15, 0.11, 0.1]);
    addSphere(group, detail, [0, 1.15, 0.48], [0.045, 0.035, 0.03]);
    for (const side of [-1, 1]) {
      addSphere(group, body, [side * 0.2, 1.49, 0.12], [0.09, 0.1, 0.08]);
      addSphere(group, belly, [side * 0.2, 1.49, 0.17], [0.045, 0.05, 0.03]);
      addSphere(group, "#201a17", [side * 0.13, 1.33, 0.41], [0.04, 0.045, 0.03], 0.25);
      addSphere(group, belly, [side * 0.12, 1.31, 0.44], [0.014, 0.016, 0.01], 0.25);
      addTube(group, body, [[side * 0.2, 1.0, 0.1], [side * 0.25, 0.79, 0.29], [side * 0.15, 0.62, 0.37]], 0.085);
      addSphere(group, belly, [side * 0.15, 0.61, 0.4], [0.1, 0.055, 0.13]);
      addTube(group, body, [[side * 0.23, 0.52, -0.04], [side * 0.29, 0.25, 0.06], [side * 0.25, 0.16, 0.22]], 0.13);
      addSphere(group, detail, [side * 0.25, 0.14, 0.25], [0.15, 0.08, 0.2]);
    }
    addTube(group, body, [[0, 0.57, -0.31], [0, 0.39, -0.53], [0.08, 0.3, -0.62]], 0.07);
    addEyes(group, 1.34, 0.44, 0.13);
    return;
  }

  if (species === "mink") {
    addSphere(group, body, [0, 0.57, -0.02], [0.3, 0.27, 0.61]);
    addSphere(group, belly, [0, 0.49, 0.22], [0.2, 0.13, 0.3]);
    addTube(group, body, [[0, 0.58, 0.38], [0, 0.66, 0.57], [0, 0.72, 0.73]], 0.14);
    addSphere(group, body, [0, 0.75, 0.74], [0.24, 0.17, 0.25]);
    addSphere(group, belly, [0, 0.67, 0.94], [0.14, 0.075, 0.12]);
    addSphere(group, detail, [0, 0.68, 1.04], [0.045, 0.035, 0.04]);
    for (const side of [-1, 1]) {
      addSphere(group, body, [side * 0.19, 0.87, 0.75], [0.07, 0.08, 0.045]);
      addSphere(group, "#171412", [side * 0.14, 0.79, 0.91], [0.028, 0.032, 0.022], 0.25);
      addTube(group, body, [[side * 0.17, 0.53, 0.23], [side * 0.25, 0.36, 0.32], [side * 0.2, 0.18, 0.4]], 0.055);
      addSphere(group, belly, [side * 0.2, 0.15, 0.43], [0.08, 0.05, 0.11]);
      addSphere(group, body, [side * 0.22, 0.46, -0.25], [0.14, 0.18, 0.2]);
      addTube(group, body, [[side * 0.22, 0.5, -0.34], [side * 0.28, 0.38, -0.15], [side * 0.23, 0.23, -0.27], [side * 0.2, 0.16, -0.35]], 0.055);
      addSphere(group, belly, [side * 0.2, 0.14, -0.36], [0.08, 0.05, 0.11]);
    }
    addTube(group, body, [[0, 0.5, -0.5], [0, 0.4, -0.78], [0, 0.34, -1.02], [0, 0.42, -1.18]], 0.07);
    addSphere(group, accent, [0, 0.42, -1.19], [0.06, 0.06, 0.08]);
    addEyes(group, 0.8, 0.94, 0.12);
    return;
    return;
  }

  if (species === "mouse") {
    addSphere(group, body, [0, 0.55, 0], [0.28, 0.29, 0.41]);
    addSphere(group, belly, [0, 0.52, 0.24], [0.15, 0.12, 0.13]);
    addSphere(group, body, [0, 0.93, 0.25], [0.23, 0.22, 0.23]);
    addSphere(group, accent, [-0.2, 1.1, 0.2], [0.13, 0.15, 0.055]);
    addSphere(group, accent, [0.2, 1.1, 0.2], [0.13, 0.15, 0.055]);
    addSphere(group, belly, [-0.2, 1.1, 0.24], [0.075, 0.095, 0.025]);
    addSphere(group, belly, [0.2, 1.1, 0.24], [0.075, 0.095, 0.025]);
    addSphere(group, "#171515", [-0.1, 0.99, 0.43], [0.03, 0.035, 0.025], 0.25);
    addSphere(group, "#171515", [0.1, 0.99, 0.43], [0.03, 0.035, 0.025], 0.25);
    addSphere(group, accent, [0, 0.88, 0.5], [0.045, 0.035, 0.04]);
    for (const side of [-1, 1]) {
      addTube(group, belly, [[side * 0.04, 0.86, 0.51], [side * 0.32, 0.91, 0.54]], 0.009);
      addTube(group, belly, [[side * 0.04, 0.83, 0.52], [side * 0.32, 0.82, 0.54]], 0.009);
      addTube(group, body, [[side * 0.13, 0.62, 0.05], [side * 0.16, 0.41, 0.16], [side * 0.16, 0.24, 0.21]], 0.05);
      addSphere(group, detail, [side * 0.16, 0.2, 0.24], [0.085, 0.05, 0.12]);
      addTube(group, body, [[side * 0.14, 0.5, -0.15], [side * 0.17, 0.34, -0.13], [side * 0.18, 0.2, -0.08]], 0.055);
      addSphere(group, detail, [side * 0.18, 0.16, -0.05], [0.09, 0.05, 0.13]);
    }
    addTube(group, accent, [[0.08, 0.43, -0.28], [0.17, 0.34, -0.52], [0.1, 0.3, -0.65]], 0.018);
    return;
  }

  if (species === "monkey") {
    addSphere(group, body, [0, 0.68, 0], [0.34, 0.43, 0.36]);
    addSphere(group, belly, [0, 0.7, 0.31], [0.23, 0.3, 0.12]);
    addSphere(group, body, [0, 1.21, 0.18], [0.28, 0.29, 0.25]);
    addSphere(group, belly, [0, 1.11, 0.39], [0.19, 0.15, 0.1]);
    addSphere(group, detail, [0, 1.19, 0.43], [0.035, 0.025, 0.025]);
    addSphere(group, "#171412", [-0.08, 1.27, 0.39], [0.027, 0.03, 0.02], 0.25);
    addSphere(group, "#171412", [0.08, 1.27, 0.39], [0.027, 0.03, 0.02], 0.25);
    addMouth(group, detail, [0, 1.07, 0.49], 0.075);
    for (const side of [-1, 1]) {
      addSphere(group, accent, [side * 0.29, 1.2, 0.17], [0.1, 0.12, 0.07]);
      addTube(group, body, [[side * 0.22, 0.88, 0.02], [side * 0.34, 0.55, 0.16], [side * 0.26, 0.3, 0.3]], 0.075);
      addTube(group, body, [[side * 0.18, 0.44, 0], [side * 0.24, 0.23, 0.21]], 0.075);
      addSphere(group, belly, [side * 0.26, 0.27, 0.33], [0.1, 0.08, 0.13]);
      addSphere(group, belly, [side * 0.24, 0.15, 0.26], [0.14, 0.07, 0.18]);
      for (let digit = -1; digit <= 1; digit += 1) {
        addTube(group, belly, [[side * 0.26 + digit * 0.045, 0.14, 0.31], [side * 0.26 + digit * 0.06, 0.11, 0.4]], 0.018);
        addTube(group, belly, [[side * 0.26 + digit * 0.045, 0.28, 0.36], [side * 0.26 + digit * 0.06, 0.25, 0.44]], 0.018);
      }
    }
    addTube(group, accent, [[0, 0.58, -0.31], [0.28, 0.42, -0.58], [0.35, 0.67, -0.73], [0.2, 0.78, -0.7]], 0.035);
    addSphere(group, accent, [0.2, 0.78, -0.7], [0.03, 0.03, 0.03]);
    addEyes(group, 1.25, 0.4, 0.1);
    return;
  }

  if (species === "crow") {
    addSphere(group, body, [0, 0.76, 0], [0.34, 0.31, 0.48]);
    addSphere(group, body, [0, 1.1, 0.25], [0.24, 0.24, 0.24]);
    addCone(group, accent, [0, 1.05, 0.52], 0.075, 0.28, [Math.PI / 2, 0, 0]);
    for (const side of [-1, 1]) {
      const wing = addSphere(group, accent, [side * 0.35, 0.82, -0.02], [0.31, 0.09, 0.27]);
      wing.rotation.z = side * 0.16;
      addCylinder(group, detail, [side * 0.1, 0.35, 0.02], 0.025, 0.03, 0.22);
    }
    addEyes(group, 1.14, 0.44, 0.1);
    return;
  }

  if (species === "fox") {
    addSphere(group, body, [0, 0.62, 0], [0.34, 0.4, 0.55]);
    addSphere(group, belly, [0, 0.58, 0.34], [0.2, 0.26, 0.17]);
    addSphere(group, body, [0, 1.16, 0.31], [0.31, 0.29, 0.3]);
    addSphere(group, belly, [0, 1.04, 0.55], [0.19, 0.13, 0.23]);
    addSphere(group, detail, [0, 1.06, 0.76], [0.055, 0.04, 0.035]);
    for (const side of [-1, 1]) {
      addCone(group, body, [side * 0.19, 1.42, 0.25], 0.15, 0.38, [0, 0, side * -0.12]);
      for (const legZ of [-0.31, 0.31]) {
        addSphere(group, body, [side * 0.22, 0.29, legZ], [0.09, 0.25, 0.1]);
        addSphere(group, detail, [side * 0.22, 0.08, legZ + 0.045], [0.1, 0.08, 0.13]);
      }
    }
    addSphere(group, body, [0, 0.7, -0.57], [0.22, 0.23, 0.51]);
    addSphere(group, belly, [0, 0.82, -0.96], [0.11, 0.11, 0.13]);
    addEyes(group, 1.2, 0.57, 0.125);
    return;
  }

  const bodyScale: Record<Exclude<CreatureSpecies, "butterfly" | "dwarf" | "crystal" | "fish" | "duck" | "cat" | "marmot" | "mink" | "monkey" | "mouse" | "crow" | "fox" | "cow" | "lizard" | "eagle" | "hedgehog" | "bear">, [number, number, number]> = {
    ibex: [0.35, 0.38, 0.5],
    wolf: [0.3, 0.34, 0.58],
    pig: [0.38, 0.34, 0.48],
    lion: [0.36, 0.38, 0.48],
  };
  addSphere(group, body, [0, 0.62, 0], bodyScale[species]);
  addSphere(group, belly, [0, 0.59, 0.31], [0.23, 0.27, 0.24]);

  addSphere(group, body, [0, 1.12, 0.28], [0.29, 0.28, 0.27]);

  switch (species) {
    case "ibex":
      addSphere(group, belly, [0, 1.04, 0.47], [0.075, 0.06, 0.095]);
      for (const side of [-1, 1]) {
        const hornBase: [number, number, number] = [side * 0.16, 1.31, 0.22];
        const hornLowerCurve: [number, number, number] = [side * 0.24, 1.49, 0.18];
        const hornUpperCurve: [number, number, number] = [side * 0.23, 1.68, 0.1];
        const hornTip: [number, number, number] = [side * 0.15, 1.78, 0.03];
        addTaperedSegment(group, accent, hornBase, hornLowerCurve, 0.065, 0.048);
        addTaperedSegment(group, accent, hornLowerCurve, hornUpperCurve, 0.048, 0.028);
        addTaperedSegment(group, accent, hornUpperCurve, hornTip, 0.028, 0.002);
        const ear = addSphere(group, body, [side * 0.28, 1.3, 0.2], [0.055, 0.14, 0.045]);
        ear.rotation.z = -side * 0.48;
      }
      addLegs(group, detail, 0.23, 0.33);
      break;
    case "wolf":
      addCone(group, body, [-0.17, 1.43, 0.18], 0.13, 0.34, [0, 0, 0.12]);
      addCone(group, body, [0.17, 1.43, 0.18], 0.13, 0.34, [0, 0, -0.12]);
      addSphere(group, accent, [0, 1.04, 0.53], [0.16, 0.13, 0.19]);
      addSphere(group, detail, [0, 1.02, 0.69], [0.07, 0.06, 0.07]);
      for (const side of [-1, 1]) {
        addSphere(group, accent, [side * 0.14, 1.19, 0.51], [0.075, 0.07, 0.045]);
        addSphere(group, "#302a27", [side * 0.14, 1.19, 0.548], [0.045, 0.045, 0.022], 0.3);
        addSphere(group, "#171412", [side * 0.14, 1.19, 0.567], [0.018, 0.033, 0.012], 0.25);
        addSphere(group, "#ffffff", [side * 0.13, 1.205, 0.578], [0.009, 0.01, 0.006], 0.2);
      }
      addTube(group, body, [[0, 0.7, -0.35], [0, 0.56, -0.62], [0, 0.48, -0.84], [0, 0.57, -1.02]], 0.09);
      addSphere(group, accent, [0, 0.57, -1.02], [0.065, 0.06, 0.085]);
      addLegs(group, body, 0.22, 0.36);
      break;
    case "pig":
      addSphere(group, body, [0, 1.08, 0.62], [0.15, 0.11, 0.11]);
      addSphere(group, "#251d19", [-0.055, 1.09, 0.72], [0.025, 0.035, 0.018]);
      addSphere(group, "#251d19", [0.055, 1.09, 0.72], [0.025, 0.035, 0.018]);
      for (const side of [-1, 1]) {
        addCone(group, body, [side * 0.22, 1.43, 0.2], 0.13, 0.34, [0, 0, side * -0.28]);
      }
      addEyes(group, 1.2, 0.5);
      addTube(group, body, [[0.08, 0.72, -0.4], [0.2, 0.84, -0.54], [0.15, 0.96, -0.62], [-0.02, 0.96, -0.63], [-0.1, 0.84, -0.56], [-0.02, 0.77, -0.5], [0.06, 0.84, -0.54]], 0.028);
      for (const side of [-1, 1]) {
        for (const legZ of [-0.25, 0.25]) {
          addSphere(group, body, [side * 0.23, 0.25, legZ], [0.075, 0.22, 0.075]);
        }
      }
      break;
    case "lion":
      addSphere(group, body, [-0.32, 1.5, 0.19], [0.11, 0.13, 0.08]);
      addSphere(group, body, [0.32, 1.5, 0.19], [0.11, 0.13, 0.08]);
      addSphere(group, accent, [-0.32, 1.49, 0.25], [0.055, 0.075, 0.035]);
      addSphere(group, accent, [0.32, 1.49, 0.25], [0.055, 0.075, 0.035]);
      addSphere(group, accent, [0, 1.13, 0.24], [0.4, 0.4, 0.33]);
      addSphere(group, belly, [0, 1.08, 0.51], [0.21, 0.23, 0.2]);
      addSphere(group, detail, [0, 1.04, 0.69], [0.08, 0.06, 0.055]);
      addTube(group, body, [[0.1, 0.7, -0.4], [0.24, 0.67, -0.64], [0.28, 0.81, -0.72]], 0.035);
      addSphere(group, accent, [0.29, 0.83, -0.74], [0.08, 0.11, 0.08]);
      addLegs(group, body, 0.24, 0.37);
      break;
  }

  if (species === "ibex") {
    addEyes(group, 1.18, 0.52, 0.14);
  } else if (species === "lion") {
    addEyes(group, 1.2, 0.63, 0.14);
  }
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
