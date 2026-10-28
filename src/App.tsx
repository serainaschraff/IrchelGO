import { useEffect, useRef, useState } from "react";
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

const debugEnabled =
  new URLSearchParams(window.location.search).get("debug") === "1";

export default function App() {
    const eightWallCanvasRef = useRef<HTMLCanvasElement>(null);
    const [xrError, setXrError] = useState<string | null>(null);
    const [xrSupported, setXrSupported] = useState<boolean | null>(null);
    const [experienceMode, setExperienceMode] = useState<"idle" | "webxr" | "eightwall">("idle");
    const [motionSensorStatus, setMotionSensorStatus] = useState(
      "Motion sensor access has not been checked.",
    );
    const [checkingMotionSensors, setCheckingMotionSensors] = useState(false);
    const [currentAnimalId, setCurrentAnimalId] = useState<string | null>(null);
    const [foxPlacementStatus, setFoxPlacementStatus] = useState<string | null>(null);
    const [locationStatus, setLocationStatus] = useState("Loading animal areas...");
    const [troubleshootingOpen, setTroubleshootingOpen] = useState(false);

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

    async function startARSession() {
      try {
        if (!navigator.xr || !await navigator.xr.isSessionSupported("immersive-ar")) {
          setXrError("WebXR AR is unavailable in this browser. Start 8th Wall AR instead.");
          return;
        }
        const session = await xrStore.enterAR();
        if (!session) {
          setXrError("The browser did not start a WebXR session. You can try 8th Wall AR.");
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
      }
    }

    async function start8thWallSession() {
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
          debugEnabled,
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

    function startGame() {
      if (xrSupported === null) return;
      if (xrSupported) {
        void startARSession();
      } else {
        void start8thWallSession();
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

    const currentTask =
      experienceMode === "webxr"
        ? foxPlacementStatus ?? "AR is active. Looking for a suitable place to show the fox."
        : experienceMode === "eightwall"
          ? foxPlacementStatus ?? "Starting camera tracking."
          : xrSupported === null
            ? "Checking whether this browser supports AR."
            : xrError
              ? "AR could not start. You can try the 8th Wall option if it is available."
              : "Ready to start the AR experience.";

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
     * Restore a camera preview using startCamera() and:
     * {fallbackPosition && (
     *   <CameraFallbackFox screenPosition={fallbackPosition} />
     * )}
     * </div>
     * This is only screen-relative placement; it is not world-locked.
     */

  return (
     <div className="app-shell">
      {experienceMode === "idle" ? (
        <img
          className="welcome-art"
          src="/irchelgo-welcome.svg"
          alt="The Mystical Fox overlooking a moonlit campus garden"
        />
      ) : null}
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
      {experienceMode === "idle" ? (
        <section className="welcome-panel" aria-labelledby="welcome-heading">
          <h2 id="welcome-heading">Welcome to Irchel Go!</h2>
          <p>
            When asked, allow camera, location, and motion/orientation access so
            the AR experience and nearby animal matching can work.
          </p>
          <button
            className="start-game-button"
            type="button"
            onClick={startGame}
            disabled={xrSupported === null}
          >
            Start Game!
          </button>
          {xrSupported === null ? (
            <p className="welcome-hint">Checking AR support…</p>
          ) : null}
        </section>
      ) : null}
      <div className="session-controls">
        {experienceMode === "idle" && xrSupported && xrError ? (
          <button
            type="button"
            onClick={() => void start8thWallSession()}
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
      <div className="troubleshooting">
        <button
          className="troubleshooting-toggle"
          type="button"
          aria-expanded={troubleshootingOpen}
          aria-controls="troubleshooting-panel"
          onClick={() => setTroubleshootingOpen((open) => !open)}
        >
          {troubleshootingOpen ? "Close help" : "Troubleshooting"}
        </button>
        {troubleshootingOpen ? (
          <section
            id="troubleshooting-panel"
            className="troubleshooting-panel"
            aria-label="Troubleshooting information"
          >
            <h2>Need help?</h2>
            <h3>What is happening</h3>
            <p>{currentTask}</p>
            <h3>Location</h3>
            <p>{locationStatus}</p>
            {xrError ? (
              <>
                <h3>AR issue</h3>
                <p role="status">{xrError}</p>
              </>
            ) : null}
            <h3>How the experience works</h3>
            <ul>
              <li>AR starts only after you tap Start Game.</li>
              <li>The app tries WebXR first and can offer 8th Wall as a fallback.</li>
              <li>The Mystical Fox appears when your location matches its campus area.</li>
              <li>Allow camera and location access when prompted. Keep the camera aimed at a well-lit, textured surface while tracking starts.</li>
            </ul>
          </section>
        ) : null}
      </div>
      {debugEnabled ? (
        <p
          role="status"
          aria-live="polite"
          className="debug-path-status"
        >
          {arPathStatus}
        </p>
      ) : null}
      {experienceMode === "idle" ? (
        <>
          {debugEnabled ? (
            <div className="debug-sensor-panel">
              <button
                type="button"
                onClick={() => void checkMotionSensors()}
                disabled={checkingMotionSensors}
              >
                {checkingMotionSensors
                  ? "Checking motion sensors..."
                  : "Check motion sensor access"}
              </button>
              <p role="status" aria-live="polite">
                {motionSensorStatus}
              </p>
            </div>
          ) : null}
        </>
      ) : null}
      {debugEnabled && xrError && (
        <p role="alert" style={{ position: "absolute", top: "92px", right: "20px", zIndex: 2, color: "white" }}>
          {xrError}
        </p>
      )}
      {debugEnabled ? (
        <p
          aria-live="polite"
          className="location-status"
        >
          {experienceMode === "idle"
            ? locationStatus
            : `${locationStatus}\n${foxPlacementStatus ?? "Starting AR..."}`}
        </p>
      ) : null}
      {experienceMode === "eightwall" ? (
        <>
          {debugEnabled ? (
            <div
              aria-label="Hit-test marker color legend"
              className="debug-hit-legend"
            >
              <span style={{ color: "#00ff66" }}>●</span> detected surface{" "}
              <span style={{ color: "#ffcc00" }}>●</span> estimated surface{" "}
              <span style={{ color: "#00ccff" }}>●</span> feature point{" "}
              <span style={{ color: "#ff00ff" }}>●</span> other hit
            </div>
          ) : null}
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