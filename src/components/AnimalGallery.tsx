import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { animalRegistry } from "../utils/animals";
import { disposeThreeObject } from "../utils/three";

function SpinningAnimal({ index }: { index: number }) {
  const group = useRef<Group>(null);
  const elapsed = useRef(0);
  const definition = animalRegistry[index];
  const model = useMemo(() => {
    if (!definition) {
      throw new Error(`No animal is registered at gallery index ${index}.`);
    }
    return definition.createWorldModel();
  }, [definition, index]);

  useFrame((_, delta) => {
    if (!group.current || elapsed.current >= 1.8) return;
    elapsed.current = Math.min(1.8, elapsed.current + delta);
    group.current.rotation.y = (elapsed.current / 1.8) * Math.PI * 2;
  });

  useEffect(() => () => disposeThreeObject(model), [model]);

  return (
    <group ref={group}>
      <group position={[0, -0.42, 0]}>
        <primitive object={model} />
      </group>
    </group>
  );
}

export default function AnimalGallery() {
  const [index, setIndex] = useState(0);
  const animal = animalRegistry[index];

  if (!animal) {
    throw new Error(`No animal is registered at gallery index ${index}.`);
  }

  function showNextAnimal() {
    setIndex((current) => (current + 1) % animalRegistry.length);
  }

  return (
    <main className="animal-gallery">
      <button
        className="animal-gallery-next"
        type="button"
        onClick={showNextAnimal}
        aria-label={`Show next animal. Currently showing ${animal.name}.`}
      >
        <Canvas
          className="animal-gallery-canvas"
          camera={{ position: [0, 0.35, 3.2], fov: 40 }}
          onCreated={({ camera }) => camera.lookAt(0, 0.12, 0)}
        >
          <ambientLight intensity={2} />
          <directionalLight position={[3, 5, 4]} intensity={2.5} />
          <SpinningAnimal key={animal.id} index={index} />
        </Canvas>
        <span className="animal-gallery-caption">
          <strong>{animal.name}</strong>
          <span>
            Tap anywhere to see the next animal ({index + 1} of {animalRegistry.length})
          </span>
        </span>
      </button>
    </main>
  );
}
