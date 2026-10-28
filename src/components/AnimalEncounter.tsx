import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useXRHitTest } from "@react-three/xr";
import { Matrix4, Quaternion, Vector3 } from "three";
import { encounterRules, getAnimalDefinition, type AnimalId } from "../utils/animals";

type AnimalEncounterProps = {
  animalId: AnimalId;
  encounterNumber: number;
  onPlacementStatus: (status: string | null) => void;
  onNewEncounter: () => void;
  onPlaced: (animalId: AnimalId, encounterNumber: number) => void;
};

type AnimalPlacement = {
  position: [number, number, number];
  yaw: number;
};

const hitMatrix = new Matrix4();
const hitPosition = new Vector3();
const hitQuaternion = new Quaternion();
const surfaceUp = new Vector3();
const viewerPosition = new Vector3();
const hitScale = new Vector3();
const cameraDirection = new Vector3();

export default function AnimalEncounter({
  animalId,
  encounterNumber,
  onPlacementStatus,
  onNewEncounter,
  onPlaced,
}: AnimalEncounterProps) {
  const camera = useThree((state) => state.camera);
  const [placement, setPlacement] = useState<AnimalPlacement | null>(null);
  const hasPlacement = useRef(false);
  const hasReportedPlacement = useRef(false);
  const lastStatus = useRef<string | null>(null);
  const encounterDirection = useRef<Vector3 | null>(null);
  const cameraPanLatched = useRef(false);
  const lastCameraPanAttemptAt = useRef(0);

  function getCameraDirection() {
    camera.getWorldDirection(cameraDirection);
    return cameraDirection.clone();
  }

  function updateStatus(status: string) {
    if (lastStatus.current === status) return;
    lastStatus.current = status;
    onPlacementStatus(status);
  }

  useEffect(() => {
    const status = "Scanning for a horizontal surface to place the animal...";
    lastStatus.current = status;
    onPlacementStatus(status);
    return () => {
      lastStatus.current = null;
      onPlacementStatus(null);
    };
  }, [animalId, onPlacementStatus]);

  useEffect(() => {
    if (!placement || hasReportedPlacement.current) return;
    hasReportedPlacement.current = true;
    onPlaced(animalId, encounterNumber);
  }, [animalId, encounterNumber, onPlaced, placement]);

  useXRHitTest(
    (results, getWorldMatrix) => {
      if (hasPlacement.current) return;
      if (results.length === 0) {
        updateStatus(
          "No plane hits yet. Slowly scan the area and point the camera toward the floor.",
        );
        return;
      }

      let foundUsablePose = false;
      for (const result of results) {
        if (!getWorldMatrix(hitMatrix, result)) continue;

        foundUsablePose = true;
        hitMatrix.decompose(hitPosition, hitQuaternion, hitScale);
        surfaceUp.set(0, 1, 0).applyQuaternion(hitQuaternion);
        if (Math.abs(surfaceUp.y) < 0.9) continue;

        camera.getWorldPosition(viewerPosition);
        const yaw = Math.atan2(
          viewerPosition.x - hitPosition.x,
          viewerPosition.z - hitPosition.z,
        );

        hasPlacement.current = true;
        encounterDirection.current = getCameraDirection();
        lastCameraPanAttemptAt.current = performance.now();
        setPlacement({
          position: [hitPosition.x, hitPosition.y + 0.005, hitPosition.z],
          yaw,
        });
        updateStatus("Animal placed on a detected horizontal surface.");
        return;
      }

      updateStatus(
        foundUsablePose
          ? "A surface was detected, but it is not horizontal enough. Point the camera toward a level floor or table."
          : "Plane hits were returned, but no usable surface pose is available. Scan the area again.",
      );
    },
    "viewer",
    "plane",
  );

  useFrame(() => {
    const initialDirection = encounterDirection.current;
    if (initialDirection === null) return;
    camera.getWorldDirection(cameraDirection);
    const turnAngle = initialDirection.angleTo(cameraDirection);
    if (turnAngle < encounterRules.cameraTurnResetRadians) {
      cameraPanLatched.current = false;
      return;
    }
    if (
      turnAngle < encounterRules.cameraTurnThresholdRadians ||
      cameraPanLatched.current
    ) {
      return;
    }

    cameraPanLatched.current = true;
    const now = performance.now();
    if (
      now - lastCameraPanAttemptAt.current <
      encounterRules.cameraTurnCooldownMs
    ) {
      return;
    }
    lastCameraPanAttemptAt.current = now;
    if (Math.random() < encounterRules.cameraTurnChance) onNewEncounter();
  });

  if (!placement) return null;
  const AnimalModel = getAnimalDefinition(animalId).WebXRModel;
  return (
    <AnimalModel
      position={placement.position}
      rotation={[0, placement.yaw, 0]}
    />
  );
}

export function CameraFallbackAnimal({
  animalId,
  screenPosition,
}: {
  animalId: AnimalId;
  screenPosition: [number, number];
}) {
  const camera = useThree((state) => state.camera);
  const placement = useMemo(() => {
    const point = new Vector3(
      screenPosition[0] * 2 - 1,
      1 - screenPosition[1] * 2,
      0.5,
    ).unproject(camera);
    const direction = point.sub(camera.position).normalize();
    const position = camera.position.clone().addScaledVector(direction, 1.5);
    const yaw = Math.atan2(
      camera.position.x - position.x,
      camera.position.z - position.z,
    );
    return {
      position: [position.x, position.y, position.z] as [number, number, number],
      rotation: [0, yaw, 0] as [number, number, number],
    };
  }, [animalId, camera, screenPosition]);
  const AnimalModel = getAnimalDefinition(animalId).WebXRModel;

  return (
    <AnimalModel position={placement.position} rotation={placement.rotation} />
  );
}
