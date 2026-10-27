import { useEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { useXRHitTest } from "@react-three/xr";
import { Matrix4, Quaternion, Vector3 } from "three";

type MysticalFoxProps = {
  onPlacementStatus: (status: string | null) => void;
};

type FoxPlacement = {
  position: [number, number, number];
  yaw: number;
};

const fur = "#c96d32";
const cream = "#f5e5ca";
const cocoa = "#392b2b";
const earPink = "#db8190";
const gold = "#ffc04c";
const magicTeal = "#46d5cf";
const hitMatrix = new Matrix4();
const hitPosition = new Vector3();
const hitQuaternion = new Quaternion();
const surfaceUp = new Vector3();
const viewerPosition = new Vector3();
const hitScale = new Vector3();

export default function MysticalFox({
  onPlacementStatus,
}: MysticalFoxProps) {
  const camera = useThree((state) => state.camera);
  const [placement, setPlacement] = useState<FoxPlacement | null>(null);
  const hasPlacement = useRef(false);
  const lastStatus = useRef<string | null>(null);

  function updateStatus(status: string) {
    if (lastStatus.current === status) return;
    lastStatus.current = status;
    onPlacementStatus(status);
  }

  useEffect(() => {
    const status = "Scanning for a horizontal surface to place the fox...";
    lastStatus.current = status;
    onPlacementStatus(status);
    return () => {
      lastStatus.current = null;
      onPlacementStatus(null);
    };
  }, [onPlacementStatus]);

  useXRHitTest(
    (results, getWorldMatrix) => {
      if (hasPlacement.current) return;
      if (results.length === 0) {
        updateStatus("No plane hits yet. Slowly scan the area and point the camera toward the floor.");
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
        setPlacement({
          position: [hitPosition.x, hitPosition.y + 0.005, hitPosition.z],
          yaw,
        });
        updateStatus("Fox placed on a detected horizontal surface.");
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

  if (!placement) return null;

  return (
    <MysticalFoxModel
      position={placement.position}
      rotation={[0, placement.yaw, 0]}
    />
  );
}

export function CameraFallbackFox({
  screenPosition,
}: {
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
  }, [camera, screenPosition]);

  return (
    <MysticalFoxModel
      position={placement.position}
      rotation={placement.rotation}
    />
  );
}

function MysticalFoxModel({
  position,
  rotation,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation} scale={0.3}>
      <ambientLight intensity={1.5} />
      <directionalLight position={[3, 5, 4]} intensity={2.2} />

      <mesh position={[0, 0.62, 0]} scale={[0.34, 0.4, 0.55]} castShadow>
        <sphereGeometry args={[1, 20, 14]} />
        <meshStandardMaterial color={fur} roughness={0.88} />
      </mesh>

      <mesh position={[0, 0.55, 0.38]} scale={[0.24, 0.34, 0.24]} castShadow>
        <sphereGeometry args={[1, 18, 12]} />
        <meshStandardMaterial color={cream} roughness={0.92} />
      </mesh>

      <mesh position={[0, 1.16, 0.31]} scale={[0.31, 0.29, 0.3]} castShadow>
        <sphereGeometry args={[1, 20, 14]} />
        <meshStandardMaterial color={fur} roughness={0.82} />
      </mesh>

      <mesh position={[0, 1.04, 0.55]} scale={[0.19, 0.13, 0.23]} castShadow>
        <sphereGeometry args={[1, 16, 10]} />
        <meshStandardMaterial color={cream} roughness={0.9} />
      </mesh>

      <mesh position={[0, 1.065, 0.765]} scale={[0.055, 0.04, 0.035]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial color={cocoa} roughness={0.38} />
      </mesh>

      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.19, 1.39, 0.25]} rotation={[0, 0, side * -0.12]}>
          <mesh castShadow>
            <coneGeometry args={[0.15, 0.38, 5]} />
            <meshStandardMaterial color={fur} roughness={0.84} />
          </mesh>
          <mesh position={[0, -0.015, 0.105]} scale={[0.52, 0.72, 0.35]}>
            <coneGeometry args={[0.15, 0.31, 5]} />
            <meshStandardMaterial color={earPink} roughness={0.9} />
          </mesh>
        </group>
      ))}

      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.125, 1.2, 0.568]}>
          <mesh scale={[0.045, 0.055, 0.025]}>
            <sphereGeometry args={[1, 14, 10]} />
            <meshStandardMaterial color={cocoa} roughness={0.28} />
          </mesh>
          <mesh position={[-side * 0.012, 0.022, 0.02]} scale={0.014}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshBasicMaterial color="white" />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 0.7, -0.49]} rotation={[0.32, 0, 0]} scale={[0.22, 0.23, 0.51]} castShadow>
        <sphereGeometry args={[1, 18, 12]} />
        <meshStandardMaterial color={fur} roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.84, -0.9]} rotation={[0.32, 0, 0]} scale={[0.18, 0.18, 0.22]} castShadow>
        <sphereGeometry args={[1, 16, 10]} />
        <meshStandardMaterial color={cream} roughness={0.9} />
      </mesh>

      {([
        [-0.22, 0.28, 0.28],
        [0.22, 0.28, 0.28],
        [-0.23, 0.28, -0.3],
        [0.23, 0.28, -0.3],
      ] as [number, number, number][]).map(([x, y, z], index) => (
        <group key={index}>
          <mesh position={[x, y, z]} scale={[0.095, 0.26, 0.105]} castShadow>
            <sphereGeometry args={[1, 14, 10]} />
            <meshStandardMaterial color={fur} roughness={0.9} />
          </mesh>
          <mesh position={[x, 0.08, z]} scale={[0.105, 0.085, 0.13]} castShadow>
            <sphereGeometry args={[1, 14, 10]} />
            <meshStandardMaterial color={cocoa} roughness={0.95} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 0.84, 0.32]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.19, 0.045, 8, 24]} />
        <meshStandardMaterial color={gold} metalness={0.55} roughness={0.34} />
      </mesh>
      <mesh position={[0, 0.73, 0.53]} scale={[0.075, 0.09, 0.045]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={magicTeal} emissive={magicTeal} emissiveIntensity={0.65} roughness={0.25} />
      </mesh>

      <mesh position={[-0.45, 1.43, 0.08]} rotation={[0, 0, Math.PI / 4]} scale={0.055}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={gold} emissive={gold} emissiveIntensity={0.45} metalness={0.45} />
      </mesh>
      <mesh position={[0.43, 1.56, 0.18]} rotation={[0, 0, Math.PI / 4]} scale={0.04}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={magicTeal} emissive={magicTeal} emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}
