import { useEffect, useMemo } from "react";
import {
  ConeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  SphereGeometry,
  TorusGeometry,
} from "three";
import type { AnimalDefinition, AnimalModelProps } from "./types";

const fur = "#c96d32";
const cream = "#f5e5ca";
const cocoa = "#392b2b";
const earPink = "#db8190";
const gold = "#ffc04c";
const magicTeal = "#46d5cf";

function createMysticalFoxModel() {
  const fox = new Group();
  fox.scale.setScalar(0.3);

  function addSphere(
    parent: Group,
    color: string,
    position: [number, number, number],
    scale: [number, number, number],
  ) {
    const mesh = new Mesh(
      new SphereGeometry(1, 18, 12),
      new MeshStandardMaterial({ color, roughness: 0.85 }),
    );
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  addSphere(fox, fur, [0, 0.62, 0], [0.34, 0.4, 0.55]);
  addSphere(fox, cream, [0, 0.55, 0.38], [0.24, 0.34, 0.24]);
  addSphere(fox, fur, [0, 1.16, 0.31], [0.31, 0.29, 0.3]);
  addSphere(fox, cream, [0, 1.04, 0.55], [0.19, 0.13, 0.23]);
  addSphere(fox, cocoa, [0, 1.065, 0.765], [0.055, 0.04, 0.035]);

  for (const side of [-1, 1]) {
    const ear = new Group();
    ear.position.set(side * 0.19, 1.39, 0.25);
    ear.rotation.z = side * -0.12;
    const outerEar = new Mesh(
      new ConeGeometry(0.15, 0.38, 5),
      new MeshStandardMaterial({ color: fur, roughness: 0.84 }),
    );
    outerEar.castShadow = true;
    ear.add(outerEar);
    const innerEar = new Mesh(
      new ConeGeometry(0.15, 0.31, 5),
      new MeshStandardMaterial({ color: earPink, roughness: 0.9 }),
    );
    innerEar.position.set(0, -0.015, 0.105);
    innerEar.scale.set(0.52, 0.72, 0.35);
    ear.add(innerEar);
    fox.add(ear);

    const eye = new Group();
    eye.position.set(side * 0.125, 1.2, 0.568);
    const eyeMesh = new Mesh(
      new SphereGeometry(1, 14, 10),
      new MeshStandardMaterial({ color: cocoa, roughness: 0.28 }),
    );
    eyeMesh.scale.set(0.045, 0.055, 0.025);
    eye.add(eyeMesh);
    const glint = new Mesh(
      new SphereGeometry(1, 10, 8),
      new MeshBasicMaterial({ color: "white" }),
    );
    glint.position.set(-side * 0.012, 0.022, 0.02);
    glint.scale.setScalar(0.014);
    eye.add(glint);
    fox.add(eye);

    for (const z of [0.28, -0.3]) {
      const x = side * (z > 0 ? 0.22 : 0.23);
      addSphere(fox, fur, [x, 0.28, z], [0.095, 0.26, 0.105]);
      addSphere(fox, cocoa, [x, 0.08, z], [0.105, 0.085, 0.13]);
    }
  }

  const tail = addSphere(fox, fur, [0, 0.7, -0.49], [0.22, 0.23, 0.51]);
  tail.rotation.x = 0.32;
  const tailTip = addSphere(fox, cream, [0, 0.84, -0.9], [0.18, 0.18, 0.22]);
  tailTip.rotation.x = 0.32;

  const collar = new Mesh(
    new TorusGeometry(0.19, 0.045, 8, 24),
    new MeshStandardMaterial({ color: gold, metalness: 0.55, roughness: 0.34 }),
  );
  collar.position.set(0, 0.84, 0.32);
  collar.rotation.x = Math.PI / 2;
  fox.add(collar);

  const gem = new Mesh(
    new OctahedronGeometry(1, 0),
    new MeshStandardMaterial({
      color: magicTeal,
      emissive: magicTeal,
      emissiveIntensity: 0.65,
      roughness: 0.25,
    }),
  );
  gem.position.set(0, 0.73, 0.53);
  gem.scale.set(0.075, 0.09, 0.045);
  fox.add(gem);

  const leftSparkle = new Mesh(
    new OctahedronGeometry(1, 0),
    new MeshStandardMaterial({
      color: gold,
      emissive: gold,
      emissiveIntensity: 0.45,
      metalness: 0.45,
    }),
  );
  leftSparkle.position.set(-0.45, 1.43, 0.08);
  leftSparkle.rotation.z = Math.PI / 4;
  leftSparkle.scale.setScalar(0.055);
  fox.add(leftSparkle);

  const rightSparkle = new Mesh(
    new OctahedronGeometry(1, 0),
    new MeshStandardMaterial({
      color: magicTeal,
      emissive: magicTeal,
      emissiveIntensity: 0.8,
    }),
  );
  rightSparkle.position.set(0.43, 1.56, 0.18);
  rightSparkle.rotation.z = Math.PI / 4;
  rightSparkle.scale.setScalar(0.04);
  fox.add(rightSparkle);

  return fox;
}

function MysticalFoxModel({ position, rotation }: AnimalModelProps) {
  const model = useMemo(createMysticalFoxModel, []);
  useEffect(
    () => () => {
      model.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => material.dispose());
      });
    },
    [model],
  );
  return (
    <group position={position} rotation={rotation}>
      <ambientLight intensity={1.5} />
      <directionalLight position={[3, 5, 4]} intensity={2.2} />
      <primitive object={model} />
    </group>
  );
}

export const mysticalFox: AnimalDefinition = {
  id: "mystical-fox",
  name: "Mystical Fox",
  WebXRModel: MysticalFoxModel,
  createWorldModel: createMysticalFoxModel,
};
