import { useEffect, useRef, useState } from "react";
import { startCamera } from "./utils/camera";
import {
  findGeoJSONFeatureAtLocation,
  getGeolocation,
  isGeoJSONAreaCollection,
} from "./utils/geolocation";
import { RedWalls } from "./utils/planes";
import MysticalFox from "./components/MysticalFox";
import { Canvas } from "@react-three/fiber";
import { createXRStore, XR } from "@react-three/xr";
import {
  setEightWallAnimalAvailable,
  startEightWall,
  stopEightWall,
} from "./utils/eightWall";
import { checkMotionSensorAccess } from "./utils/motionSensors";

type AnimalAreaProperties = {
  animalId: string;
  animalName?: string;
};

function isAnimalAreaProperties(
  value: unknown,
): value is AnimalAreaProperties | null {
  return (
    value === null ||
    (typeof value === "object" &&
      "animalId" in value &&
      typeof value.animalId === "string" &&
      (!("animalName" in value) || typeof value.animalName === "string"))
  );
}

const xrStore = createXRStore({
  offerSession: false,
  anchors: false,
  handTracking: false,
  layers: false,
  meshDetection: false,
  domOverlay: false,
  planeDetection: true,
  hitTest: true,
});

export default function App() {
    const previewVideoRef = useRef<HTMLVideoElement>(null);
    const previewStreamRef = useRef<MediaStream | null>(null);
    const eightWallCanvasRef = useRef<HTMLCanvasElement>(null);
    const [xrError, setXrError] = useState<string | null>(null);
    const [xrSupported, setXrSupported] = useState<boolean | null>(null);
    const [experienceMode, setExperienceMode] = useState<"idle" | "webxr" | "eightwall">("idle");
    const [cameraPreviewRestart, setCameraPreviewRestart] = useState(0);
    const [cameraStatus, setCameraStatus] = useState("Camera preview is starting...");
    const [motionSensorStatus, setMotionSensorStatus] = useState(
      "Motion sensor access has not been checked.",
    );
    const [checkingMotionSensors, setCheckingMotionSensors] = useState(false);
    const [currentAnimalId, setCurrentAnimalId] = useState<string | null>(null);
    const [foxPlacementStatus, setFoxPlacementStatus] = useState<string | null>(null);
    const [locationStatus, setLocationStatus] = useState("Loading animal areas...");

    useEffect(() => {
        let cancelled = false;
        async function checkXRSupport() {
          const xr = navigator.xr;
          if (!xr) {
            if (!cancelled) {
              setXrSupported(false);
            }
            return;
          }
          try {
            const supported = await xr.isSessionSupported("immersive-ar");
            if (!cancelled) {
              setXrSupported(supported);
            }
          } catch (error) {
            console.error("Could not check WebXR support:", error);
            if (!cancelled) {
              setXrSupported(false);
            }
          }
        }
        void checkXRSupport();
        return () => {
          cancelled = true;
        };
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        let watchId: number | undefined;
        let loadTimedOut = false;
        const loadTimeoutId = window.setTimeout(() => {
          loadTimedOut = true;
          controller.abort();
          setLocationStatus("Timed out while loading animal areas.");
        }, 15000);

        async function loadAreasAndWatchLocation() {
          try {
            const response = await fetch("/data/animal-areas.geojson", {
              signal: controller.signal,
            });
            if (!response.ok) {
              throw new Error(`Could not load animal areas (${response.status}).`);
            }

            const data: unknown = await response.json();
            if (!isGeoJSONAreaCollection<AnimalAreaProperties>(data, isAnimalAreaProperties)) {
              throw new Error("Animal area data is not a valid GeoJSON FeatureCollection.");
            }

            if (controller.signal.aborted) return;

            setLocationStatus("Animal areas loaded. Waiting for a GPS position...");
            const geolocation = getGeolocation();
            watchId = geolocation.watchPosition(
              ({ coords }) => {
                const feature = findGeoJSONFeatureAtLocation(data, coords);
                const animalId = feature?.properties?.animalId ?? null;
                setCurrentAnimalId(animalId);
                setLocationStatus(
                  animalId
                    ? `Location acquired (±${Math.round(coords.accuracy)} m). You are in the ${feature?.properties?.animalName ?? animalId} area.`
                    : `Location acquired (±${Math.round(coords.accuracy)} m). No animal area at your current location.`,
                );
              },
              (error) => {
                console.error("Could not get player location:", error);
                if (error.code === 1) {
                  setCurrentAnimalId(null);
                  setLocationStatus("Location permission was denied. Allow location access and reload.");
                } else if (error.code === 2) {
                  setLocationStatus("The device cannot determine a location right now. Check device location services.");
                } else if (error.code === 3) {
                  setLocationStatus("Still waiting for a GPS fix. Keep the app open; Android may need more time or a clearer view of the sky.");
                } else {
                  setLocationStatus(`Could not get player location: ${error.message}`);
                }
              },
              { enableHighAccuracy: true, maximumAge: 0, timeout: 120000 },
            );
          } catch (error) {
            if (controller.signal.aborted && !loadTimedOut) return;
            console.error("Could not initialize location-based animal matching:", error);
            setLocationStatus(
              loadTimedOut
                ? "Timed out while loading animal areas."
                : `Could not initialize location-based animal matching: ${String(error)}`,
            );
          } finally {
            window.clearTimeout(loadTimeoutId);
          }
        }

        void loadAreasAndWatchLocation();

        return () => {
          controller.abort();
          window.clearTimeout(loadTimeoutId);
          if (watchId !== undefined) {
            getGeolocation().clearWatch(watchId);
          }
        };
    }, []);

    function stopCameraPreview() {
      const stream = previewStreamRef.current;
      if (!stream) return;
      stream.getTracks().forEach((track) => track.stop());
      previewStreamRef.current = null;
      const video = previewVideoRef.current;
      if (video?.srcObject === stream) {
        video.srcObject = null;
      }
    }

    useEffect(() => {
      if (experienceMode !== "idle") return;
      let cancelled = false;
      setCameraStatus("Requesting camera access...");
      void startCamera()
        .then((stream) => {
          if (cancelled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          previewStreamRef.current = stream;
          const video = previewVideoRef.current;
          if (!video) {
            stream.getTracks().forEach((track) => track.stop());
            previewStreamRef.current = null;
            setCameraStatus("Camera preview could not be displayed.");
            return;
          }
          video.srcObject = stream;
          return video.play().then(() => {
            if (!cancelled) setCameraStatus("Live camera preview");
          });
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          console.error("Could not start the camera preview:", error);
          stopCameraPreview();
          setCameraStatus(`Camera preview unavailable: ${String(error)}`);
        });

      return () => {
        cancelled = true;
        stopCameraPreview();
      };
    }, [experienceMode, cameraPreviewRestart]);

    async function startARSession() {
      try {
        if (!navigator.xr || !await navigator.xr.isSessionSupported("immersive-ar")) {
          setXrError("WebXR AR is unavailable in this browser. Start 8th Wall AR instead.");
          return;
        }
        stopCameraPreview();
        setCameraStatus("Camera preview paused while WebXR uses the camera.");
        const session = await xrStore.enterAR();
        if (!session) {
          setXrError("The browser did not start a WebXR session. You can try 8th Wall AR.");
          setCameraPreviewRestart((restart) => restart + 1);
          return;
        }
        setExperienceMode("webxr");
        session.addEventListener(
          "end",
          () => setExperienceMode("idle"),
          { once: true },
        );
        setXrError(null);
      } catch (error) {
        console.error("Failed to start AR session:", error);
        setXrError(
          `Could not start WebXR AR: ${String(error)}. You can try 8th Wall AR.`,
        );
        setExperienceMode("idle");
        setCameraPreviewRestart((restart) => restart + 1);
      }
    }

    async function start8thWallSession() {
      stopCameraPreview();
      setCameraStatus("Camera preview paused while 8th Wall starts its camera.");
      setExperienceMode("eightwall");
      setXrError(null);
      setFoxPlacementStatus("Starting 8th Wall world tracking...");
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });
      const canvas = eightWallCanvasRef.current;
      if (!canvas) {
        setExperienceMode("idle");
        setXrError("Could not create the 8th Wall camera canvas.");
        return;
      }
      try {
        await startEightWall(
          canvas,
          currentAnimalId === "mystical-fox",
          setFoxPlacementStatus,
          (message) => {
            setXrError(message);
            stopEightWall();
            setExperienceMode("idle");
          },
        );
      } catch (error) {
        console.error("Failed to start 8th Wall AR:", error);
        stopEightWall();
        setExperienceMode("idle");
        setXrError(`Could not start 8th Wall AR: ${String(error)}`);
      }
    }

    useEffect(() => {
      setEightWallAnimalAvailable(currentAnimalId === "mystical-fox");
    }, [currentAnimalId]);

    useEffect(() => () => stopEightWall(), []);

    function end8thWallSession() {
      stopEightWall();
      setExperienceMode("idle");
      setCameraStatus("Restarting camera preview...");
      setFoxPlacementStatus(null);
    }

    async function checkMotionSensors() {
      setCheckingMotionSensors(true);
      setMotionSensorStatus("Checking sensor APIs, permissions, and events...");
      try {
        setMotionSensorStatus(await checkMotionSensorAccess());
      } catch (error) {
        console.error("Could not check motion sensor access:", error);
        setMotionSensorStatus(`Motion sensor check failed: ${String(error)}`);
      } finally {
        setCheckingMotionSensors(false);
      }
    }

    const arPathStatus =
      experienceMode === "webxr"
        ? "AR path: WebXR (primary) is active."
        : experienceMode === "eightwall"
          ? "AR path: 8th Wall (fallback) is active or starting."
          : xrSupported === null
            ? "AR path: checking WebXR support..."
            : xrSupported
              ? xrError
                ? "AR path: WebXR primary failed; 8th Wall fallback is available."
                : "AR path: WebXR primary available; 8th Wall fallback available."
              : "AR path: WebXR unavailable; 8th Wall fallback available.";

    /*
     * Screen-space camera fallback, intentionally disabled while WebXR and
     * 8th Wall are being tested. Restore this if both AR paths fail:
     *
     * const [fallbackPosition, setFallbackPosition] =
     *   useState<[number, number] | null>(null);
     * <div onPointerDown={placeFallbackFox}>
     * function placeFallbackFox(event: PointerEvent<HTMLDivElement>) {
     *   if (!(event.target instanceof HTMLCanvasElement)) return;
     *   const bounds = event.currentTarget.getBoundingClientRect();
     *   setFallbackPosition([
     *     (event.clientX - bounds.left) / bounds.width,
     *     (event.clientY - bounds.top) / bounds.height,
     *   ]);
     * }
     * Render a video using startCamera() and:
     * {fallbackPosition && (
     *   <CameraFallbackFox screenPosition={fallbackPosition} />
     * )}
     * </div>
     * This is only screen-relative placement; it is not world-locked.
     */

  return (
     <div className="app-shell">
      <video
        ref={previewVideoRef}
        autoPlay
        playsInline
        muted
        className="camera-layer"
        style={{
          zIndex: 0,
        }}
      />
      {experienceMode !== "eightwall" ? (
        <Canvas
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            touchAction: "none",
          }}
        >
          <XR store={xrStore}>
            <RedWalls />
            {currentAnimalId === "mystical-fox" && (
              <MysticalFox onPlacementStatus={setFoxPlacementStatus} />
            )}
          </XR>
        </Canvas>
      ) : null}
      {experienceMode === "eightwall" ? (
        <canvas
          ref={eightWallCanvasRef}
          className="camera-layer"
          style={{
            zIndex: 1,
            touchAction: "none",
          }}
        />
      ) : null}
      <div style={{ position: "absolute", top: "20px", right: "20px", zIndex: 2 }}>
        {experienceMode === "idle" && xrSupported === false ? (
          <button type="button" onClick={() => void start8thWallSession()}>
            Start AR with 8th Wall
          </button>
        ) : null}
        {xrSupported === null ? <span>Checking AR support...</span> : null}
        {experienceMode === "idle" && xrSupported ? (
          <button type="button" onClick={() => void startARSession()}>
            Start AR with WebXR
          </button>
        ) : null}
        {experienceMode === "idle" && xrSupported && xrError ? (
          <button
            type="button"
            onClick={() => void start8thWallSession()}
            style={{ marginLeft: "8px" }}
          >
            Try 8th Wall
          </button>
        ) : null}
        {experienceMode === "eightwall" ? (
          <button type="button" onClick={end8thWallSession}>
            Stop AR
          </button>
        ) : null}
      </div>
      <p
        role="status"
        aria-live="polite"
        style={{
          position: "absolute",
          top: "58px",
          right: "20px",
          zIndex: 2,
          margin: 0,
          padding: "6px 10px",
          borderRadius: "4px",
          background: "rgba(0, 0, 0, 0.65)",
          color: "white",
          fontSize: "14px",
        }}
      >
        {arPathStatus}
      </p>
      {experienceMode === "idle" ? (
        <>
          <p
            role="status"
            aria-live="polite"
            style={{
              position: "absolute",
              top: "96px",
              right: "20px",
              zIndex: 2,
              margin: 0,
              padding: "6px 10px",
              borderRadius: "4px",
              background: "rgba(0, 0, 0, 0.65)",
              color: "white",
              fontSize: "14px",
            }}
          >
            {cameraStatus}
          </p>
          <div
            style={{
              position: "absolute",
              bottom: "16px",
              left: "12px",
              right: "12px",
              zIndex: 2,
              color: "white",
            }}
          >
            <button
              type="button"
              onClick={() => void checkMotionSensors()}
              disabled={checkingMotionSensors}
            >
              {checkingMotionSensors
                ? "Checking motion sensors..."
                : "Check motion sensor access"}
            </button>
            <p
              role="status"
              aria-live="polite"
              style={{
                margin: "6px 0 0",
                padding: "6px 8px",
                borderRadius: "4px",
                background: "rgba(0, 0, 0, 0.7)",
                fontSize: "12px",
                lineHeight: 1.4,
              }}
            >
              {motionSensorStatus}
            </p>
          </div>
        </>
      ) : null}
      {xrError && (
        <p role="alert" style={{ position: "absolute", top: "92px", right: "20px", zIndex: 2, color: "white" }}>
          {xrError}
        </p>
      )}
      <p
        aria-live="polite"
        style={{
          position: "absolute",
          top: "86px",
          left: "12px",
          right: "12px",
          zIndex: 2,
          margin: 0,
          padding: "8px 10px",
          borderRadius: "4px",
          background: "rgba(0, 0, 0, 0.7)",
          color: "white",
          fontSize: "13px",
          lineHeight: 1.4,
          whiteSpace: "pre-line",
        }}
      >
        {experienceMode === "idle"
          ? `${locationStatus}. Start AR to scan for a surface.`
          : `${locationStatus}\n${foxPlacementStatus ?? "Starting AR..."}`}
      </p>
      {experienceMode === "eightwall" ? (
        <>
          <div
            aria-label="Hit-test marker color legend"
            style={{
              position: "absolute",
              bottom: "40px",
              left: "12px",
              zIndex: 2,
              padding: "6px 8px",
              borderRadius: "4px",
              background: "rgba(0, 0, 0, 0.7)",
              color: "white",
              fontSize: "12px",
              lineHeight: 1.5,
            }}
          >
            <span style={{ color: "#00ff66" }}>●</span> detected surface{" "}
            <span style={{ color: "#ffcc00" }}>●</span> estimated surface{" "}
            <span style={{ color: "#00ccff" }}>●</span> feature point{" "}
            <span style={{ color: "#ff00ff" }}>●</span> other hit
          </div>
          <a
            href="/xr-runtime/LICENSE"
            target="_blank"
            rel="noreferrer"
            style={{
              position: "absolute",
              bottom: "12px",
              right: "12px",
              zIndex: 2,
              color: "white",
              fontSize: "12px",
            }}
          >
            8th Wall XR Engine by Niantic Spatial - license and warranty disclaimer
          </a>
        </>
      ) : null}
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