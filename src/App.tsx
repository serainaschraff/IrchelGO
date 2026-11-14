import { useCallback, useEffect, useRef, useState } from "react";
import {
  findGeoJSONFeatureAtLocation,
  getGeolocation,
  isGeoJSONAreaCollection,
  type GeoJSONAreaCollection,
} from "./utils/geolocation";
import { RedWalls } from "./components/RedWalls";
import AnimalEncounter from "./components/AnimalEncounter";
import LocationNotFoundEncounter from "./components/LocationNotFoundEncounter";
import AnimalGallery from "./components/AnimalGallery";
import { Canvas } from "@react-three/fiber";
import { createXRStore, XR, XRDomOverlay, useXR } from "@react-three/xr";
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
  type AnimalId,
} from "./utils/animals";
import LocationNotFound from "./components/LocationNotFound";
import { summarizeDebugEvents } from "./utils/debugLog";
import {
  getARStartMode,
  getAnimalAreaMapFile,
  getAppFlags,
} from "./utils/runtimeOptions";
import {
  assignAnimalsToCantonTerritories,
  assignIrchelAnimalsToTerritories,
  isCantonTerritoryProperties,
  isTerritoryProperties,
  type AnimalAreaProperties,
} from "./utils/territories";

const xrStore = createXRStore({
  offerSession: false,
  anchors: false,
  handTracking: false,
  layers: false,
  meshDetection: false,
  domOverlay: true,
  planeDetection: true,
  hitTest: true,
});

const {
  debug: debugEnabled,
  forceEightWall: forceEightWallEnabled,
  game: gameEnabled,
  swissMap: swissMapEnabled,
  buliMap: buliMapEnabled,
  outside: outsideModeEnabled,
  animalGallery: animalGalleryEnabled,
} = getAppFlags(window.location.search);
const moveOnDistanceMeters = outsideModeEnabled
  ? 25
  : encounterRules.moveOnDistanceMeters;

function WebXRDomOverlay({
  debug,
  locationPermissionDenied,
  game,
  animalPlacementStatus,
  debugEvents,
}: {
  debug: boolean;
  locationPermissionDenied: boolean;
  game: boolean;
  animalPlacementStatus: string | null;
  debugEvents: string[];
}) {
  const planes = useXR((state) => state.detectedPlanes);
  const horizontalPlaneCount = planes.filter(
    (plane) => plane.orientation === "horizontal",
  ).length;
  const verticalPlaneCount = planes.filter(
    (plane) => plane.orientation === "vertical",
  ).length;
  const labelledWallCount = planes.filter(
    (plane) => plane.semanticLabel === "wall",
  ).length;
  const latestHitTest = debugEvents
    .slice()
    .reverse()
    .find((event) => event.includes("WebXR hit-test:"));
  const hitTestSummary = latestHitTest?.replace(/^\[[^\]]+\]\s*/, "");

  if (!debug && !locationPermissionDenied) return null;

  return (
    <XRDomOverlay>
      <div className="xr-dom-overlay">
        {locationPermissionDenied && !game ? <LocationNotFound /> : null}
        {debug ? (
          <section className="xr-live-debug" aria-label="Live WebXR diagnostics">
            <strong>WebXR live diagnostics</strong>
            <p>
              Planes: {planes.length} (horizontal {horizontalPlaneCount}, vertical{" "}
              {verticalPlaneCount})
              <br />
              Walls labelled: {labelledWallCount}
            </p>
            <p>Placement: {animalPlacementStatus ?? "Waiting for an animal scan."}</p>
            {hitTestSummary ? <p>{hitTestSummary}</p> : null}
          </section>
        ) : null}
      </div>
    </XRDomOverlay>
  );
}

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
    const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
    const [troubleshootingOpen, setTroubleshootingOpen] = useState(false);
    const [availableFlagsOpen, setAvailableFlagsOpen] = useState(false);
    const [debugEvents, setDebugEvents] = useState<string[]>([]);
    const selectedAnimalIdRef = useRef<AnimalId | null>(null);
    const currentAnimalIdRef = useRef<AnimalId | null>(null);
    const encounterNumberRef = useRef(0);
    const previousEncountersRef = useRef<AnimalId[]>([]);
    const isArActiveRef = useRef(false);
    const animalPoolRef = useRef<readonly AnimalId[]>([]);
    const currentAreaIdRef = useRef<string | null>(null);
    const latestPlayerPosition = useRef<GeolocationCoordinates | null>(null);
    const lastEncounterPosition = useRef<GeolocationCoordinates | null>(null);
    const lastEightWallStatusRef = useRef<string | null>(null);
    const lastGpsDebugAreaRef = useRef<string | null>(null);

    const recordDebugEvent = useCallback((message: string) => {
      if (!debugEnabled) return;
      const timestamp = new Date().toLocaleTimeString();
      const entry = `[${timestamp}] ${message}`;
      console.info(`[IrchelGO debug] ${entry}`);
      setDebugEvents((events) => [...events.slice(-149), entry]);
    }, []);

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
      recordDebugEvent("AR: session closed; encounter state cleared.");
      isArActiveRef.current = false;
      archiveCurrentEncounter();
      clearSelectedAnimal();
      lastEncounterPosition.current = null;
      setAnimalPlacementStatus(null);
      setExperienceMode("idle");
    }

    useEffect(() => {
        if (animalGalleryEnabled) return;
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
        if (animalGalleryEnabled) return;
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
            const response = await fetch(
              `${import.meta.env.BASE_URL}data/${getAnimalAreaMapFile(swissMapEnabled, buliMapEnabled)}`,
              {
              signal: controller.signal,
              },
            );
            if (!response.ok) {
              throw new Error(`Could not load animal areas (${response.status}).`);
            }

            const rawData: unknown = await response.json();
            let data: GeoJSONAreaCollection<AnimalAreaProperties>;
            if (buliMapEnabled) {
              if (!isGeoJSONAreaCollection(rawData, isTerritoryProperties)) {
                throw new Error("Bülach territory data is not a valid GeoJSON FeatureCollection.");
              }
              data = assignIrchelAnimalsToTerritories(rawData);
            } else if (swissMapEnabled) {
              if (!isGeoJSONAreaCollection(rawData, isCantonTerritoryProperties)) {
                throw new Error("Swiss animal area data is not a valid GeoJSON FeatureCollection.");
              }
              data = assignAnimalsToCantonTerritories(rawData);
            } else {
              if (!isGeoJSONAreaCollection(rawData, isTerritoryProperties)) {
                throw new Error("Irchel territory data is not a valid GeoJSON FeatureCollection.");
              }
              data = assignIrchelAnimalsToTerritories(rawData);
            }

            if (controller.signal.aborted) return;

            setLocationStatus("Animal areas loaded. Waiting for a GPS position...");
            const geolocation = getGeolocation();
            watchId = geolocation.watchPosition(
              ({ coords }) => {
                const feature = findGeoJSONFeatureAtLocation(data, coords);
                latestPlayerPosition.current = coords;
                setLocationPermissionDenied(false);

                if (!feature?.properties) {
                  if (debugEnabled && lastGpsDebugAreaRef.current !== "outside") {
                    lastGpsDebugAreaRef.current = "outside";
                    recordDebugEvent(
                      `GPS: outside all animal areas; accuracy=${Math.round(coords.accuracy)}m`,
                    );
                  }
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
                if (debugEnabled && lastGpsDebugAreaRef.current !== areaId) {
                  lastGpsDebugAreaRef.current = areaId;
                  recordDebugEvent(
                    `GPS: area=${areaName} (${areaId}), canton=${feature.properties.cantonISO ?? "unknown"}, ` +
                      `accuracy=${Math.round(coords.accuracy)}m, animalPool=${animals.join(",")}`,
                  );
                }
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
                      moveOnDistanceMeters))
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
                  setLocationPermissionDenied(true);
                  recordDebugEvent("GPS: location permission was denied.");
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
    }, [recordDebugEvent]);

    async function startARSession() {
      recordDebugEvent("WebXR: start requested.");
      try {
        if (!navigator.xr || !await navigator.xr.isSessionSupported("immersive-ar")) {
          recordDebugEvent("WebXR: immersive-ar is not supported by this browser/device.");
          setXrError("WebXR AR is unavailable in this browser. Start 8th Wall AR instead.");
          return;
        }
        recordDebugEvent("WebXR: immersive-ar is supported; requesting session.");
        const session = await xrStore.enterAR();
        if (!session) {
          recordDebugEvent("WebXR: enterAR returned no session.");
          setXrError("The browser did not start a WebXR session. You can try 8th Wall AR.");
          return;
        }
        recordDebugEvent(
          `WebXR: session started; requestedMode=immersive-ar, visibility=${session.visibilityState}, ` +
            `blend=${session.environmentBlendMode}, enabledFeatures=${session.enabledFeatures?.join(",") ?? "not reported"}.`,
        );
        session.addEventListener("visibilitychange", () => {
          recordDebugEvent(`WebXR: visibility changed to ${session.visibilityState}.`);
        });
        isArActiveRef.current = true;
        setExperienceMode("webxr");
        startRandomEncounter();
        session.addEventListener(
          "end",
          () => {
            recordDebugEvent("WebXR: session end event received.");
            finishARSession();
          },
          { once: true },
        );
        setXrError(null);
      } catch (error) {
        recordDebugEvent(`WebXR: startup failed: ${String(error)}`);
        isArActiveRef.current = false;
        console.error("Failed to start AR session:", error);
        setXrError(
          `Could not start WebXR AR: ${String(error)}. You can try 8th Wall AR.`,
        );
        setExperienceMode("idle");
      }
    }

    async function start8thWallSession() {
      recordDebugEvent("8th Wall: start requested.");
      lastEightWallStatusRef.current = null;
      isArActiveRef.current = true;
      setExperienceMode("eightwall");
      setXrError(null);
      setAnimalPlacementStatus("Starting 8th Wall world tracking...");
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });
      const canvas = eightWallCanvasRef.current;
      if (!canvas) {
        recordDebugEvent("8th Wall: camera canvas was not available.");
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
          onStatus: (status) => {
            setAnimalPlacementStatus(status);
            if (debugEnabled && status !== lastEightWallStatusRef.current) {
              lastEightWallStatusRef.current = status;
              recordDebugEvent(`8th Wall: ${status}`);
            }
          },
          onRuntimeError: (message) => {
            recordDebugEvent(`8th Wall: runtime error: ${message}`);
            setXrError(message);
            stopEightWall();
            finishARSession();
          },
          onEncounter: startRandomEncounter,
          onPlaced: confirmAnimalPlacement,
          encounterNumber: encounterNumberRef.current,
        });
      } catch (error) {
        recordDebugEvent(`8th Wall: startup failed: ${String(error)}`);
        console.error("Failed to start 8th Wall AR:", error);
        stopEightWall();
        finishARSession();
        setXrError(`Could not start 8th Wall AR: ${String(error)}`);
      }
    }

    useEffect(() => {
      if (animalGalleryEnabled) return;
      setEightWallEncounterAnimal(selectedAnimalId, encounterNumber);
    }, [selectedAnimalId, encounterNumber]);

    useEffect(() => {
      if (animalGalleryEnabled) return;
      return () => stopEightWall();
    }, []);

    function end8thWallSession() {
      recordDebugEvent("8th Wall: Stop AR requested.");
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

    async function copyDebugLog() {
      try {
        await navigator.clipboard.writeText(summarizeDebugEvents(debugEvents).reverse().join("\n"));
        recordDebugEvent("Debug log copied to clipboard.");
      } catch (error) {
        recordDebugEvent(`Could not copy debug log: ${String(error)}`);
      }
    }

    function startGame() {
      const startMode = getARStartMode(forceEightWallEnabled, xrSupported);
      if (startMode === "eightwall") {
        void start8thWallSession();
        return;
      }
      if (startMode === "webxr") void startARSession();
    }

    const arPathStatus = forceEightWallEnabled
      ? "AR path: forced 8th Wall mode is enabled."
      : experienceMode === "webxr"
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

  if (animalGalleryEnabled) {
    return <AnimalGallery />;
  }

  return (
     <div className="app-shell">
      {experienceMode === "idle" ? (
        <img
          className="welcome-art"
          src={`${import.meta.env.BASE_URL}irchelgo-welcome.svg`}
          alt="The Mystical Fox overlooking a moonlit campus garden"
        />
      ) : null}
      {locationPermissionDenied && experienceMode !== "webxr" ? (
        <LocationNotFound />
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
            <RedWalls debug={debugEnabled} />
            <WebXRDomOverlay
              debug={debugEnabled}
              locationPermissionDenied={locationPermissionDenied}
              game={gameEnabled}
              animalPlacementStatus={animalPlacementStatus}
              debugEvents={debugEvents}
            />
            {selectedAnimalId && (
              <AnimalEncounter
                key={encounterNumber}
                animalId={selectedAnimalId}
                debugEnabled={debugEnabled}
                onDebug={recordDebugEvent}
                onPlacementStatus={setAnimalPlacementStatus}
                onNewEncounter={startRandomEncounter}
                encounterNumber={encounterNumber}
                onPlaced={confirmAnimalPlacement}
              />
            )}
            {gameEnabled && locationPermissionDenied && !selectedAnimalId ? (
              <LocationNotFoundEncounter
                onPlacementStatus={setAnimalPlacementStatus}
              />
            ) : null}
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
            disabled={!forceEightWallEnabled && xrSupported === null}
          >
            {forceEightWallEnabled ? "Start 8th Wall AR" : "Start Game!"}
          </button>
          {xrSupported === null && !forceEightWallEnabled ? (
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
                Entering an animal territory starts a random animal encounter. Walking
                at least {moveOnDistanceMeters} m starts another.
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
      {debugEnabled ? (
        <section className="debug-log-panel" aria-label="AR debug log">
          <div className="debug-log-header">
            <strong>AR debug log</strong>
            <button
              type="button"
              aria-expanded={availableFlagsOpen}
              onClick={() => setAvailableFlagsOpen((open) => !open)}
            >
              {availableFlagsOpen ? "Hide flags" : "Show flags"}
            </button>
            <button type="button" onClick={() => void copyDebugLog()}>
              Copy log
            </button>
          </div>
          {availableFlagsOpen ? (
            <ul className="available-flags">
              <li><code>?debug=1</code> — show diagnostics.</li>
              <li><code>?force8thwall=1</code> — start 8th Wall directly.</li>
              <li><code>?game=1</code> — place the denied-location reminder on a WebXR plane.</li>
              <li><code>?ch=1</code> — use the Swiss canton map instead of the Irchel map.</li>
              <li><code>?buli=1</code> — use the Bülach territory map instead of the Irchel map.</li>
              <li><code>?outside=1</code> — use a 25 m move-on distance.</li>
              <li><code>?animal=1</code> — browse and spin through the animal variants without AR or location access.</li>
              <li>Flags can be combined, for example <code>?debug=1&amp;game=1</code>.</li>
            </ul>
          ) : null}
          <pre aria-live="polite">
            {debugEvents.length > 0
              ? summarizeDebugEvents(debugEvents).reverse().join("\n")
              : "Debug events will appear here. During immersive AR, the browser may hide page UI; diagnostics are also written to the browser console."}
          </pre>
        </section>
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
            href={`${import.meta.env.BASE_URL}xr-runtime/LICENSE`}
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