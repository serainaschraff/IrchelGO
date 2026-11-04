import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useXRHitTest } from "@react-three/xr";
import { Matrix4, Quaternion, Vector3 } from "three";
import {
  getAnimalDefinition,
  shouldStartEncounterAfterCameraPan,
  type AnimalId,
} from "../utils/animals";

type AnimalEncounterProps = {
  animalId: AnimalId;
  encounterNumber: number;
  debugEnabled: boolean;
  onPlacementStatus: (status: string | null) => void;
  onDebug: (message: string) => void;
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
  debugEnabled,
  onPlacementStatus,
  onDebug,
  onNewEncounter,
  onPlaced,
}: AnimalEncounterProps) {
  const camera = useThree((state) => state.camera);
  const [placement, setPlacement] = useState<AnimalPlacement | null>(null);
  const hasPlacement = useRef(false);
  const hasReportedPlacement = useRef(false);
  const lastStatus = useRef<string | null>(null);
  const encounterDirection = useRef<Vector3 | null>(null);
  const cameraPanState = useRef({ latched: false, lastAttemptAt: 0 });
  const lastDebugAt = useRef(0);

  function getCameraDirection() {
    camera.getWorldDirection(cameraDirection);
    return cameraDirection.clone();
  }

  function updateStatus(status: string) {
    if (lastStatus.current === status) return;
    lastStatus.current = status;
    onPlacementStatus(status);
  }

  function reportHitTestDebug(summary: string, force = false) {
    if (!debugEnabled) return;
    const now = performance.now();
    if (!force && now - lastDebugAt.current < 1000) {
      return;
    }
    lastDebugAt.current = now;
    onDebug(summary);
  }

  useEffect(() => {
    const status = "Scanning for a horizontal surface to place the animal...";
    lastStatus.current = status;
    onPlacementStatus(status);
    if (debugEnabled) {
      onDebug(`WebXR: placement scan started for animal=${animalId}, encounter=${encounterNumber}.`);
    }
    return () => {
      lastStatus.current = null;
      onPlacementStatus(null);
    };
  }, [animalId, debugEnabled, encounterNumber, onDebug, onPlacementStatus]);

  useEffect(() => {
    if (!placement || hasReportedPlacement.current) return;
    hasReportedPlacement.current = true;
    onPlaced(animalId, encounterNumber);
  }, [animalId, encounterNumber, onPlaced, placement]);

  useXRHitTest(
    (results, getWorldMatrix) => {
      if (hasPlacement.current) return;
      camera.getWorldPosition(viewerPosition);
      let usablePoseCount = 0;
      let horizontalCandidateCount = 0;
      let placementCandidate: AnimalPlacement | null = null;
      const candidates: string[] = [];

      for (const result of results) {
        if (!getWorldMatrix(hitMatrix, result)) {
          if (candidates.length < 5) candidates.push("unavailable pose");
          continue;
        }

        usablePoseCount += 1;
        hitMatrix.decompose(hitPosition, hitQuaternion, hitScale);
        surfaceUp.set(0, 1, 0).applyQuaternion(hitQuaternion);
        const distance = viewerPosition.distanceTo(hitPosition);
        const horizontal = Math.abs(surfaceUp.y) >= 0.9;
        if (horizontal) horizontalCandidateCount += 1;
        if (candidates.length < 5) {
          candidates.push(
            `d=${distance.toFixed(2)}m upY=${surfaceUp.y.toFixed(2)} ` +
              `at=(${hitPosition.x.toFixed(2)},${hitPosition.y.toFixed(2)},${hitPosition.z.toFixed(2)})` +
              (horizontal ? " horizontal" : " rejected: tilted"),
          );
        }
        if (horizontal && placementCandidate === null) {
          placementCandidate = {
            position: [hitPosition.x, hitPosition.y + 0.005, hitPosition.z],
            yaw: Math.atan2(
              viewerPosition.x - hitPosition.x,
              viewerPosition.z - hitPosition.z,
            ),
          };
        }
      }

      if (results.length === 0) {
        updateStatus(
          "No plane hits yet. Slowly scan the area and point the camera toward the floor.",
        );
      } else if (placementCandidate) {
        hasPlacement.current = true;
        encounterDirection.current = getCameraDirection();
        cameraPanState.current.lastAttemptAt = performance.now();
        setPlacement(placementCandidate);
        updateStatus("Animal placed on a detected horizontal surface.");
      } else {
        updateStatus(
          usablePoseCount > 0
            ? "A surface was detected, but it is not horizontal enough. Point the camera toward a level floor or table."
            : "Plane hits were returned, but no usable surface pose is available. Scan the area again.",
        );
      }

      reportHitTestDebug(
        `WebXR hit-test: hits=${results.length}, usablePoses=${usablePoseCount}, ` +
          `horizontalCandidates=${horizontalCandidateCount}, status=${lastStatus.current ?? "unknown"}, ` +
          `viewer=(${viewerPosition.x.toFixed(2)},${viewerPosition.y.toFixed(2)},${viewerPosition.z.toFixed(2)}), ` +
          `candidates=[${candidates.join("; ")}]`,
        placementCandidate !== null,
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
    if (
      shouldStartEncounterAfterCameraPan(
        turnAngle,
        performance.now(),
        cameraPanState.current,
      )
    ) {
      onNewEncounter();
    }
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

/*
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
*/
