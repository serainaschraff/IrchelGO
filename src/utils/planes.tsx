import { useXRPlanes, XRSpace, XRPlaneModel } from "@react-three/xr";

export function RedWalls() {
  const wallPlanes = useXRPlanes('wall')
  return (
    <>
      {wallPlanes.map((plane, i) => (
        <XRSpace key={i} space={plane.planeSpace}>
          <XRPlaneModel plane={plane}>
            <meshBasicMaterial color="red" />
          </XRPlaneModel>
        </XRSpace>
 ))}
    </>
 )
}