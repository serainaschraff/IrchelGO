import { useEffect, useRef } from "react";
import { startCamera } from "./utils/camera";
import { getGeolocation } from "./utils/geolocation";
import { getXR } from "./utils/geolocation";

export default function App() {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const geolocation = getGeolocation();
        const xr = getXR();
        startCamera(videoRef);
    }, []);

  return (
    <div>
      <h1>Irchel Go App</h1>
        <video ref={videoRef} autoPlay playsInline muted></video>
    </div>
  );
}