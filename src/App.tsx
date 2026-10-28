import { useEffect, useRef, useState } from "react";
import {
  findGeoJSONFeatureAtLocation,
  getGeolocation,
  isGeoJSONAreaCollection,
} from "./utils/geolocation";
import { RedWalls } from "./components/RedWalls";
import AnimalEncounter from "./components/AnimalEncounter";
import { Canvas } from "@react-three/fiber";
import { createXRStore, XR } from "@react-three/xr";
import {
  setEightWallEncounterAnimal,
  startEightWall,
  stopEightWall,
} from "./utils/eightWall";
import { checkMotionSensorAccess } from "./utils/motionSensors";
import {
  chooseRandomAnimal,
  distanceBetweenLocations,
  encounterRules,
  getAnimalDefinition,
  isAnimalId,
  type AnimalId,
} from "./utils/animals";

type AnimalAreaProperties = {
  areaId: string;
  areaName: string;
  animals: AnimalId[];
};

function isAnimalAreaProperties(
  value: unknown,
): value is AnimalAreaProperties | null {
  return (
    value === null ||
    (typeof value === "object" &&
      "areaId" in value &&
      typeof value.areaId === "string" &&
      "areaName" in value &&
      typeof value.areaName === "string" &&
      "animals" in value &&
      Array.isArray(value.animals) &&
      value.animals.length > 0 &&
      value.animals.every(isAnimalId))
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
    const [selectedAnimalId, setSelectedAnimalId] = useState<AnimalId | null>(null);
    const [currentAnimalId, setCurrentAnimalId] = useState<AnimalId | null>(null);
    const [previousEncounters, setPreviousEncounters] = useState<AnimalId[]>([]);
    const [encounterNumber, setEncounterNumber] = useState(0);
    const [animalPlacementStatus, setAnimalPlacementStatus] = useState<string | null>(null);
    const [locationStatus, setLocationStatus] = useState("Loading animal areas...");
    const [troubleshootingOpen, setTroubleshootingOpen] = useState(false);
    const selectedAnimalIdRef = useRef<AnimalId | null>(null);
    const currentAnimalIdRef = useRef<AnimalId | null>(null);
    const encounterNumberRef = useRef(0);
    const previousEncountersRef = useRef<AnimalId[]>([]);
    const isArActiveRef = useRef(false);
    const animalPoolRef = useRef<readonly AnimalId[]>([]);
    const currentAreaIdRef = useRef<string | null>(null);
    const latestPlayerPosition = useRef<GeolocationCoordinates | null>(null);
    const lastEncounterPosition = useRef<GeolocationCoordinates | null>(null);

    function recordPreviousEncounter(animalId: AnimalId) {
      const updatedEncounters = [...previousEncountersRef.current, animalId];
      previousEncountersRef.current = updatedEncounters;
      setPreviousEncounters(updatedEncounters);
    }

    function archiveCurrentEncounter() {
      const currentAnimal = currentAnimalIdRef.current;
      if (currentAnimal) {
        recordPreviousEncounter(currentAnimal);
      }
      currentAnimalIdRef.current = null;
      setCurrentAnimalId(null);
    }

    function clearSelectedAnimal() {
      selectedAnimalIdRef.current = null;
      setSelectedAnimalId(null);
    }

    function confirmAnimalPlacement(animalId: AnimalId, placedEncounterNumber: number) {
      if (
        !isArActiveRef.current ||
        selectedAnimalIdRef.current !== animalId ||
        encounterNumberRef.current !== placedEncounterNumber ||
        currentAnimalIdRef.current !== null
      ) {
        return;
      }

      currentAnimalIdRef.current = animalId;
      setCurrentAnimalId(animalId);
    }

    function startRandomEncounter() {
      if (!isArActiveRef.current) return;
      const animals = animalPoolRef.current;
      if (animals.length === 0) return;

      archiveCurrentEncounter();
      const animal = chooseRandomAnimal(animals);
      selectedAnimalIdRef.current = animal.id;
      setSelectedAnimalId(animal.id);
      encounterNumberRef.current += 1;
      setEncounterNumber(encounterNumberRef.current);
      lastEncounterPosition.current = latestPlayerPosition.current;
    }

    function finishARSession() {
      isArActiveRef.current = false;
      archiveCurrentEncounter();
      clearSelectedAnimal();
      lastEncounterPosition.current = null;
      setAnimalPlacementStatus(null);
      setExperienceMode("idle");
    }

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
                latestPlayerPosition.current = coords;

                if (!feature?.properties) {
                  if (currentAreaIdRef.current !== null) {
                    currentAreaIdRef.current = null;
                    animalPoolRef.current = [];
                    lastEncounterPosition.current = null;
                    archiveCurrentEncounter();
                    clearSelectedAnimal();
                  }
                  setLocationStatus(
                    `Location acquired (±${Math.round(coords.accuracy)} m). You are not in an animal area.`,
                  );
                  return;
                }

                const { areaId, areaName, animals } = feature.properties;
                if (currentAreaIdRef.current !== areaId) {
                  currentAreaIdRef.current = areaId;
                  animalPoolRef.current = animals;
                  if (isArActiveRef.current) {
                    archiveCurrentEncounter();
                    startRandomEncounter();
                  }
                } else if (
                  isArActiveRef.current &&
                  (selectedAnimalIdRef.current === null ||
                    (lastEncounterPosition.current !== null &&
                    distanceBetweenLocations(lastEncounterPosition.current, coords) >=
                      encounterRules.moveOnDistanceMeters))
                ) {
                  startRandomEncounter();
                }

                setLocationStatus(
                  `Location acquired (±${Math.round(coords.accuracy)} m). You are in the ${areaName}.`,
                );
              },
              (error) => {
                console.error("Could not get player location:", error);
                if (error.code === 1) {
                  currentAreaIdRef.current = null;
                  animalPoolRef.current = [];
                  lastEncounterPosition.current = null;
                  archiveCurrentEncounter();
                  clearSelectedAnimal();
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
        isArActiveRef.current = true;
        setExperienceMode("webxr");
        startRandomEncounter();
        session.addEventListener(
          "end",
          finishARSession,
          { once: true },
        );
        setXrError(null);
      } catch (error) {
        isArActiveRef.current = false;
        console.error("Failed to start AR session:", error);
        setXrError(
          `Could not start WebXR AR: ${String(error)}. You can try 8th Wall AR.`,
        );
        setExperienceMode("idle");
      }
    }

    async function start8thWallSession() {
      isArActiveRef.current = true;
      setExperienceMode("eightwall");
      setXrError(null);
      setAnimalPlacementStatus("Starting 8th Wall world tracking...");
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });
      const canvas = eightWallCanvasRef.current;
      if (!canvas) {
        finishARSession();
        setXrError("Could not create the 8th Wall camera canvas.");
        return;
      }
      startRandomEncounter();
      try {
        await startEightWall({
          canvas,
          animalId: selectedAnimalIdRef.current,
          showDebug: debugEnabled,
          onStatus: setAnimalPlacementStatus,
          onRuntimeError: (message) => {
            setXrError(message);
            stopEightWall();
            finishARSession();
          },
          onEncounter: startRandomEncounter,
          onPlaced: confirmAnimalPlacement,
          encounterNumber: encounterNumberRef.current,
        });
      } catch (error) {
        console.error("Failed to start 8th Wall AR:", error);
        stopEightWall();
        finishARSession();
        setXrError(`Could not start 8th Wall AR: ${String(error)}`);
      }
    }

    useEffect(() => {
      setEightWallEncounterAnimal(selectedAnimalId, encounterNumber);
    }, [selectedAnimalId, encounterNumber]);

    useEffect(() => () => stopEightWall(), []);

    function end8thWallSession() {
      stopEightWall();
      finishARSession();
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
        ? animalPlacementStatus ?? "AR is active. Looking for a suitable place to show an animal."
        : experienceMode === "eightwall"
          ? animalPlacementStatus ?? "Starting camera tracking."
          : xrSupported === null
            ? "Checking whether this browser supports AR."
            : xrError
              ? "AR could not start. You can try the 8th Wall option if it is available."
              : "Ready to start the AR experience.";
    const currentAnimalName = experienceMode !== "idle" && currentAnimalId
      ? getAnimalDefinition(currentAnimalId).name
      : null;

    /*
     * Screen-space camera fallback, intentionally disabled while WebXR and
     * 8th Wall are being tested. Restore this if both AR paths fail:
     *
     * const [fallbackPosition, setFallbackPosition] =
     *   useState<[number, number] | null>(null);
     * <div onPointerDown={placeFallbackAnimal}>
     * function placeFallbackAnimal(event: PointerEvent<HTMLDivElement>) {
     *   if (!(event.target instanceof HTMLCanvasElement)) return;
     *   const bounds = event.currentTarget.getBoundingClientRect();
     *   setFallbackPosition([
     *     (event.clientX - bounds.left) / bounds.width,
     *     (event.clientY - bounds.top) / bounds.height,
     *   ]);
     * }
     * Restore a camera preview using startCamera() and:
     * {fallbackPosition && (
     *   <CameraFallbackAnimal animalId={currentAnimalId} screenPosition={fallbackPosition} />
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
            {selectedAnimalId && (
              <AnimalEncounter
                key={encounterNumber}
                animalId={selectedAnimalId}
                onPlacementStatus={setAnimalPlacementStatus}
                onNewEncounter={startRandomEncounter}
                encounterNumber={encounterNumber}
                onPlaced={confirmAnimalPlacement}
              />
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
          {troubleshootingOpen ? "Close Help" : "Help"}
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
            {currentAnimalName ? (
              <>
                <h3>Current encounter</h3>
                <p>{currentAnimalName}</p>
              </>
            ) : null}
            <h3>Previous encounters</h3>
            {previousEncounters.length > 0 ? (
              <ul>
                {[...previousEncounters].reverse().map((animalId, index) => (
                  <li key={`${animalId}-${index}`}>
                    {getAnimalDefinition(animalId).name}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No previous encounters yet.</p>
            )}
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
              <li>
                Entering the Fox area starts a random animal encounter. Walking
                at least {encounterRules.moveOnDistanceMeters} m starts another.
              </li>
              <li>
                After a {Math.round(
                  (encounterRules.cameraTurnThresholdRadians * 180) / Math.PI,
                )}° camera turn and a{" "}
                {encounterRules.cameraTurnCooldownMs / 1000}-second cooldown,
                there is a{" "}
                {Math.round(encounterRules.cameraTurnChance * 100)}% chance of
                another encounter.
              </li>
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
            : `${locationStatus}\n${animalPlacementStatus ?? "Starting AR..."}`}
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