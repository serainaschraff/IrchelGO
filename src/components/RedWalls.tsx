import { useXRPlanes, XRSpace, XRPlaneModel } from "@react-three/xr";
import { DoubleSide } from "three";

export function RedWalls({ debug = false }: { debug?: boolean }) {
  const allPlanes = useXRPlanes();
  const wallPlanes = useXRPlanes("wall");
  const planes = debug
    ? allPlanes
    : wallPlanes;
  return (
    <>
      {planes.map((plane, index) => (
        <XRSpace key={index} space={plane.planeSpace}>
          <XRPlaneModel plane={plane}>
            <meshBasicMaterial
              color={
                !debug
                  ? "red"
                  : plane.semanticLabel === "wall" || plane.orientation === "vertical"
                    ? "#ff3040"
                    : "#00e5ff"
              }
              wireframe={debug}
              transparent={debug}
              opacity={debug ? 0.85 : 1}
              side={DoubleSide}
              depthTest={!debug}
              depthWrite={!debug}
            />
          </XRPlaneModel>
        </XRSpace>
      ))}
    </>
  );
}
