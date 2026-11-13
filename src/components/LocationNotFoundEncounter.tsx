import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useXRHitTest } from "@react-three/xr";
import {
  CanvasTexture,
  DoubleSide,
  Group,
  Matrix4,
  Quaternion,
  Vector3,
} from "three";

type Placement = {
  position: [number, number, number];
  yaw: number;
};

const hitMatrix = new Matrix4();
const hitPosition = new Vector3();
const hitQuaternion = new Quaternion();
const hitScale = new Vector3();
const surfaceUp = new Vector3();
const viewerPosition = new Vector3();
const labelCanvasSize = { width: 512, height: 128 };

function createLocationLabelTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = labelCanvasSize.width;
  canvas.height = labelCanvasSize.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create the location reminder label.");
  }

  context.fillStyle = "rgba(15, 24, 30, 0.88)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "bold 30px Arial";
  context.fillText("Allow location access", canvas.width / 2, 43);
  context.font = "26px Arial";
  context.fillText("for a full experience", canvas.width / 2, 86);
  return new CanvasTexture(canvas);
}

export default function LocationNotFoundEncounter({
  onPlacementStatus,
}: {
  onPlacementStatus: (status: string | null) => void;
}) {
  const camera = useThree((state) => state.camera);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const placed = useRef(false);
  const pin = useRef<Group>(null);
  const statusRef = useRef<string | null>(null);
  const labelTexture = useMemo(createLocationLabelTexture, []);

  function updateStatus(status: string) {
    if (statusRef.current === status) return;
    statusRef.current = status;
    onPlacementStatus(status);
  }

  useEffect(() => {
    updateStatus("Location reminder: scan a horizontal surface to place it.");
    return () => {
      statusRef.current = null;
      onPlacementStatus(null);
      labelTexture.dispose();
    };
  }, [labelTexture, onPlacementStatus]);

  useXRHitTest(
    (results, getWorldMatrix) => {
      if (placed.current) return;
      camera.getWorldPosition(viewerPosition);
      for (const result of results) {
        if (!getWorldMatrix(hitMatrix, result)) continue;
        hitMatrix.decompose(hitPosition, hitQuaternion, hitScale);
        surfaceUp.set(0, 1, 0).applyQuaternion(hitQuaternion);
        if (Math.abs(surfaceUp.y) < 0.9) continue;

        placed.current = true;
        setPlacement({
          position: [hitPosition.x, hitPosition.y + 0.01, hitPosition.z],
          yaw: Math.atan2(
            viewerPosition.x - hitPosition.x,
            viewerPosition.z - hitPosition.z,
          ),
        });
        updateStatus("Location reminder placed on a detected horizontal surface.");
        return;
      }
      updateStatus("Location reminder: no horizontal plane hit yet. Slowly scan the area.");
    },
    "viewer",
    "plane",
  );

  useFrame((_, delta) => {
    if (pin.current) pin.current.rotation.y += delta * 1.4;
  });

  if (!placement) return null;

  return (
    <group position={placement.position} rotation={[0, placement.yaw, 0]}>
      <group ref={pin} position={[0, 0.72, 0]}>
        <mesh position={[0, 0.2, 0]}>
          <sphereGeometry args={[0.24, 20, 16]} />
          <meshBasicMaterial color="#ef6868" />
        </mesh>
        <mesh position={[0, -0.02, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.17, 0.38, 20]} />
          <meshBasicMaterial color="#ef6868" />
        </mesh>
        <mesh position={[0, 0.2, 0.23]} rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.48, 0.055, 0.045]} />
          <meshBasicMaterial color="white" />
        </mesh>
      </group>
      <mesh position={[0, 1.42, 0]}>
        <planeGeometry args={[1.65, 0.42]} />
        <meshBasicMaterial
          map={labelTexture}
          transparent
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
