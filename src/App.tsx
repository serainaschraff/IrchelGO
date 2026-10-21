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
     <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      <h1
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          color: "white",
          zIndex: 1,
          margin: 0,
        }}
      >
        Irchel Go
      </h1>
    </div>
  );
}