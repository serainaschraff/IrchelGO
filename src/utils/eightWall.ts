import * as THREE from "three";
import {
  AmbientLight,
  DirectionalLight,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
  type Camera,
  type Group,
  type Scene,
} from "three";
import { createMysticalFoxModel } from "../components/mysticalFoxModel";

type EightWallHit = {
  type: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
};

type HitDebugMarker = {
  mesh: Mesh<SphereGeometry, MeshBasicMaterial>;
};

type TrackedFeaturePoint = {
  hit: EightWallHit;
  sampleIndex: number;
  lastSeenAt: number;
};

type HorizontalFeatureEstimate = {
  hit: EightWallHit;
  supportCount: number;
  sampleCount: number;
  horizontalSpan: number;
  distanceFromCamera: number;
};

type EightWallModule = {
  name: string;
  onStart?: () => void;
  onUpdate?: (frame: {
    processCpuResult?: {
      reality?: {
        trackingStatus?: string;
        trackingReason?: string;
      };
    };
  }) => void;
  onCameraStatusChange?: (event: { status: string }) => void;
};

type EightWallApi = {
  addCameraPipelineModules?: (modules: EightWallModule[]) => void;
  run: (options: {
    canvas: HTMLCanvasElement;
    allowedDevices: number;
  }) => void;
  stop: () => void;
  GlTextureRenderer?: { pipelineModule?: () => EightWallModule } | null;
  Threejs: {
    pipelineModule?: () => EightWallModule;
    xrScene?: () => { scene: Scene; camera: Camera };
  } | null;
  XrController: {
    configure?: (options: { disableWorldTracking: boolean }) => void;
    hitTest?: (x: number, y: number, includedTypes: string[]) => EightWallHit[];
    pipelineModule?: () => EightWallModule;
  } | null;
  XrConfig?: { device: () => { MOBILE: number } };
};

type ReadyEightWallApi = EightWallApi & {
  addCameraPipelineModules: (modules: EightWallModule[]) => void;
  GlTextureRenderer: { pipelineModule: () => EightWallModule };
  Threejs: {
    pipelineModule: () => EightWallModule;
    xrScene: () => { scene: Scene; camera: Camera };
  };
  XrController: {
    configure: (options: { disableWorldTracking: boolean }) => void;
    hitTest: (x: number, y: number, includedTypes: string[]) => EightWallHit[];
    pipelineModule: () => EightWallModule;
  };
  XrConfig: { device: () => { MOBILE: number } };
};

declare global {
  interface Window {
    XR8?: EightWallApi;
    THREE?: typeof THREE;
  }
}

let runtimePromise: Promise<ReadyEightWallApi> | null = null;
let pipelineInstalled = false;
let activeScene: Scene | null = null;
let activeCamera: Camera | null = null;
let activeFox: Group | null = null;
let activeCanvas: HTMLCanvasElement | null = null;
let animalAvailable = false;
let debugEnabled = false;
const MIN_HORIZONTAL_ALIGNMENT = 0.5;
const DEBUG_MARKER_LIMIT = 36;
const FEATURE_POINT_HISTORY_MS = 6000;
const FEATURE_POINT_DEDUP_DISTANCE = 0.05;
const FEATURE_PLANE_HEIGHT_TOLERANCE = 0.1;
const MIN_FEATURE_PLANE_SUPPORT = 12;
const AIM_SCREEN_X = 0.5;
const AIM_SCREEN_Y = 0.62;
const MIN_AIM_DISTANCE = 0.5;
const MAX_AIM_DISTANCE = 8;
const samplePoints: Array<[number, number]> = [
  [0.5, 0.52],
  [0.5, 0.62],
  [0.5, 0.7],
  [0.35, 0.62],
  [0.65, 0.62],
  [0.2, 0.74],
  [0.8, 0.74],
];
const hitTypeColors: Record<string, number> = {
  DETECTED_SURFACE: 0x00ff66,
  ESTIMATED_SURFACE: 0xffcc00,
  FEATURE_POINT: 0x00ccff,
  UNSPECIFIED: 0xffffff,
};
let lastHitTestAt = 0;
let lastDiagnosticAt = 0;
let lastTrackingState = "";
let lastHitTestError = "";
let debugMarkers: HitDebugMarker[] = [];
let featurePointHistory: TrackedFeaturePoint[] = [];
let onStatusChange: (status: string) => void = () => {};
let onError: (message: string) => void = () => {};

function resizeEightWallCanvas() {
  if (!activeCanvas) return;
  activeCanvas.width = window.innerWidth;
  activeCanvas.height = window.innerHeight;
}

function hasRequiredPipelineModules(
  api: EightWallApi | undefined,
): api is ReadyEightWallApi {
  return Boolean(
    api?.addCameraPipelineModules &&
      api.GlTextureRenderer?.pipelineModule &&
      api.Threejs?.pipelineModule &&
      api.Threejs.xrScene &&
      api.XrController?.pipelineModule &&
      api.XrController.configure &&
      api.XrController.hitTest &&
      api.XrConfig?.device,
  );
}

function loadRuntime(): Promise<ReadyEightWallApi> {
  if (hasRequiredPipelineModules(window.XR8)) {
    return Promise.resolve(window.XR8);
  }
  if (runtimePromise) return runtimePromise;

  runtimePromise = new Promise<ReadyEightWallApi>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      finish(
        new Error(
          "Timed out waiting for 8th Wall to initialize its world-tracking pipeline. Check that xr.js and the SLAM chunk both load successfully.",
        ),
      );
    }, 45000);

    function finish(error?: Error) {
      window.clearTimeout(timeoutId);
      window.removeEventListener("xrloaded", handleRuntimeReady);
      if (error) reject(error);
      else if (hasRequiredPipelineModules(window.XR8)) resolve(window.XR8);
      else {
        reject(
          new Error(
            "8th Wall signaled that it loaded, but its camera, Three.js, or world-tracking pipeline modules are unavailable.",
          ),
        );
      }
    }

    function handleRuntimeReady() {
      finish();
    }

    function handleScriptError() {
      finish(new Error("Could not load the 8th Wall runtime script."));
    }

    window.addEventListener("xrloaded", handleRuntimeReady, { once: true });

    if (window.XR8) return;

    const script = document.createElement("script");
    script.src = "/xr-runtime/xr.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.preloadChunks = "slam";
    script.onerror = handleScriptError;
    // The engine assigns window.XR8 only after its SLAM chunk has loaded.
    // Script download completion can occur before the xrloaded readiness event.
    document.head.append(script);
  }).catch((error: unknown) => {
    runtimePromise = null;
    throw error;
  });

  return runtimePromise;
}

function installDebugMarkers(scene: Scene) {
  const geometry = new SphereGeometry(0.035, 8, 6);
  debugMarkers = Array.from({ length: DEBUG_MARKER_LIMIT }, () => {
    const material = new MeshBasicMaterial({
      color: 0xffffff,
      depthTest: false,
    });
    const mesh = new Mesh(geometry, material);
    mesh.name = "irchelgo-hit-debug-marker";
    mesh.visible = false;
    mesh.renderOrder = 1000;
    scene.add(mesh);
    return { mesh };
  });
}

function updateDebugMarkers(hits: EightWallHit[]) {
  debugMarkers.forEach(({ mesh }, index) => {
    const hit = hits[index];
    if (!hit) {
      mesh.visible = false;
      return;
    }

    mesh.visible = true;
    mesh.position.set(hit.position.x, hit.position.y, hit.position.z);
    mesh.material.color.setHex(hitTypeColors[hit.type] ?? 0xff00ff);
  });
}

function removeDebugMarkers(scene: Scene | null) {
  const geometry = debugMarkers[0]?.mesh.geometry;
  for (const { mesh } of debugMarkers) {
    scene?.remove(mesh);
    mesh.material.dispose();
  }
  geometry?.dispose();
  debugMarkers = [];
}

function updateFeaturePointHistory(
  featurePoints: Array<{ hit: EightWallHit; sampleIndex: number }>,
  now: number,
) {
  for (const { hit, sampleIndex } of featurePoints) {
    const existing = featurePointHistory.find(
      ({ hit: existingHit }) =>
        Math.hypot(
          existingHit.position.x - hit.position.x,
          existingHit.position.y - hit.position.y,
          existingHit.position.z - hit.position.z,
        ) < FEATURE_POINT_DEDUP_DISTANCE,
    );

    if (existing) {
      existing.hit = hit;
      existing.sampleIndex = sampleIndex;
      existing.lastSeenAt = now;
    } else {
      featurePointHistory.push({ hit, sampleIndex, lastSeenAt: now });
    }
  }

  featurePointHistory = featurePointHistory.filter(
    ({ lastSeenAt }) => now - lastSeenAt <= FEATURE_POINT_HISTORY_MS,
  );
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const middleValue = sorted[middle];
  if (middleValue === undefined) {
    throw new Error("Cannot calculate a median from an empty feature-point set.");
  }
  if (sorted.length % 2 !== 0) return middleValue;

  const lowerMiddleValue = sorted[middle - 1];
  if (lowerMiddleValue === undefined) {
    throw new Error("Cannot calculate a median from an incomplete feature-point set.");
  }
  return (lowerMiddleValue + middleValue) / 2;
}

function intersectAimRayWithHorizontalPlane(height: number) {
  if (!activeCamera) return undefined;

  activeCamera.updateMatrixWorld(true);
  const cameraPosition = activeCamera.getWorldPosition(new Vector3());
  const aimPoint = new Vector3(
    AIM_SCREEN_X * 2 - 1,
    1 - AIM_SCREEN_Y * 2,
    0.5,
  ).unproject(activeCamera);
  const aimDirection = aimPoint.sub(cameraPosition).normalize();
  if (aimDirection.y >= -0.02) return undefined;

  const distance = (height - cameraPosition.y) / aimDirection.y;
  if (distance < MIN_AIM_DISTANCE || distance > MAX_AIM_DISTANCE) {
    return undefined;
  }

  return {
    position: cameraPosition.addScaledVector(aimDirection, distance),
    distance,
  };
}

function findHorizontalFeatureEstimate(): HorizontalFeatureEstimate | undefined {
  let bestCluster: TrackedFeaturePoint[] = [];
  for (const anchor of featurePointHistory) {
    const cluster = featurePointHistory.filter(
      ({ hit }) =>
        Math.abs(hit.position.y - anchor.hit.position.y) <=
        FEATURE_PLANE_HEIGHT_TOLERANCE,
    );
    if (cluster.length > bestCluster.length) bestCluster = cluster;
  }

  if (bestCluster.length === 0) return undefined;
  const sampleCount = new Set(
    bestCluster.map(({ sampleIndex }) => sampleIndex),
  ).size;
  const xValues = bestCluster.map(({ hit }) => hit.position.x);
  const zValues = bestCluster.map(({ hit }) => hit.position.z);
  const horizontalSpan = Math.hypot(
    Math.max(...xValues) - Math.min(...xValues),
    Math.max(...zValues) - Math.min(...zValues),
  );
  if (
    bestCluster.length < MIN_FEATURE_PLANE_SUPPORT ||
    sampleCount < 4 ||
    horizontalSpan < 0.3
  ) {
    return undefined;
  }

  const estimatedHeight = median(bestCluster.map(({ hit }) => hit.position.y));
  const aimIntersection = intersectAimRayWithHorizontalPlane(estimatedHeight);
  let position: Vector3;
  let distanceFromCamera: number;

  if (aimIntersection) {
    position = aimIntersection.position;
    distanceFromCamera = aimIntersection.distance;
  } else {
    const nearestAimSample = bestCluster.reduce((nearest, point) => {
      const current = samplePoints[point.sampleIndex];
      const nearestSample = samplePoints[nearest.sampleIndex];
      if (!current || !nearestSample) return nearest;
      const currentDistance = Math.hypot(
        current[0] - AIM_SCREEN_X,
        current[1] - AIM_SCREEN_Y,
      );
      const nearestDistance = Math.hypot(
        nearestSample[0] - AIM_SCREEN_X,
        nearestSample[1] - AIM_SCREEN_Y,
      );
      return currentDistance < nearestDistance ? point : nearest;
    });
    const cameraPosition =
      activeCamera?.getWorldPosition(new Vector3()) ?? new Vector3();
    position = new Vector3(
      nearestAimSample.hit.position.x,
      estimatedHeight,
      nearestAimSample.hit.position.z,
    );
    distanceFromCamera = position.distanceTo(cameraPosition);
  }

  return {
    hit: {
      type: "ESTIMATED_SURFACE",
      position: {
        x: position.x,
        y: position.y,
        z: position.z,
      },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
    },
    supportCount: bestCluster.length,
    sampleCount,
    horizontalSpan,
    distanceFromCamera,
  };
}

function inspectHitResults(api: ReadyEightWallApi) {
  const hits: EightWallHit[] = [];
  const featurePoints: Array<{ hit: EightWallHit; sampleIndex: number }> = [];
  let bestCandidate: {
    hit: EightWallHit;
    horizontalAlignment: number;
    screenDistance: number;
    isDetectedSurface: boolean;
  } | undefined;
  let bestSurfaceHit: EightWallHit | undefined;
  let bestHorizontalAlignment = 0;

  for (const [sampleIndex, [x, y]] of samplePoints.entries()) {
    const pointHits = api.XrController.hitTest(x, y, ["FEATURE_POINT"]);
    hits.push(...pointHits);
    for (const candidate of pointHits) {
      if (candidate.type === "FEATURE_POINT") {
        featurePoints.push({ hit: candidate, sampleIndex });
      }
      if (
        candidate.type !== "DETECTED_SURFACE" &&
        candidate.type !== "ESTIMATED_SURFACE"
      ) {
        continue;
      }

      const rotation = new Quaternion(
        candidate.rotation.x,
        candidate.rotation.y,
        candidate.rotation.z,
        candidate.rotation.w,
      );
      const surfaceUp = new Vector3(0, 1, 0).applyQuaternion(rotation);
      const horizontalAlignment = Math.abs(surfaceUp.y);
      if (horizontalAlignment < MIN_HORIZONTAL_ALIGNMENT) continue;

      const isDetectedSurface = candidate.type === "DETECTED_SURFACE";
      const screenDistance = Math.hypot(
        x - AIM_SCREEN_X,
        y - AIM_SCREEN_Y,
      );
      if (
        !bestCandidate ||
        screenDistance < bestCandidate.screenDistance ||
        (screenDistance === bestCandidate.screenDistance &&
          horizontalAlignment > bestCandidate.horizontalAlignment) ||
        (screenDistance === bestCandidate.screenDistance &&
          horizontalAlignment === bestCandidate.horizontalAlignment &&
          isDetectedSurface &&
          !bestCandidate.isDetectedSurface)
      ) {
        bestCandidate = {
          hit: candidate,
          horizontalAlignment,
          screenDistance,
          isDetectedSurface,
        };
      }
    }
  }

  bestSurfaceHit = bestCandidate?.hit;
  bestHorizontalAlignment = bestCandidate?.horizontalAlignment ?? 0;
  updateFeaturePointHistory(featurePoints, performance.now());
  return {
    hits,
    bestSurfaceHit,
    bestHorizontalAlignment,
    featurePointCount: featurePointHistory.length,
    featureEstimate: findHorizontalFeatureEstimate(),
  };
}

function formatHitDiagnostics(
  hits: EightWallHit[],
  bestSurfaceHit: EightWallHit | undefined,
  bestHorizontalAlignment: number,
  featurePointCount: number,
  featureEstimate: HorizontalFeatureEstimate | undefined,
  trackingStatus: string | undefined,
  trackingReason: string | undefined,
) {
  const hitCounts = new Map<string, number>();
  for (const hit of hits) {
    hitCounts.set(hit.type, (hitCounts.get(hit.type) ?? 0) + 1);
  }

  const hitSummary =
    [...hitCounts.entries()]
      .map(([type, count]) => `${type} ${count}`)
      .join(", ") || "no hit results";
  const trackingSummary = trackingStatus
    ? `Tracking ${trackingStatus}${trackingReason ? ` (${trackingReason})` : ""}`
    : "Waiting for tracking status";
  const placementAvailability = animalAvailable
    ? "fox placement enabled"
    : "fox placement paused until GPS matches the Mystical Fox area";

  const surfaceSummary = bestSurfaceHit
    ? `Best actual surface: ${bestSurfaceHit.type}, ${Math.round((Math.acos(Math.min(1, bestHorizontalAlignment)) * 180) / Math.PI)}° from horizontal; ${bestHorizontalAlignment >= MIN_HORIZONTAL_ALIGNMENT ? "acceptable" : "too tilted (maximum allowed 60°)"}.`
    : "No actual surface candidate returned.";
  const estimateSummary = featureEstimate
    ? `Experimental plane estimate supported by ${featureEstimate.supportCount} points across ${featureEstimate.sampleCount} camera samples (${featureEstimate.horizontalSpan.toFixed(2)} m span); view ray intersects it ${featureEstimate.distanceFromCamera.toFixed(1)} m ahead.`
    : `Experimental plane estimate: ${featurePointCount}/${MIN_FEATURE_PLANE_SUPPORT} unique feature points so far; move slowly across the floor to gather points.`;

  return `${trackingSummary}. Hit test across ${samplePoints.length} camera points: ${hitSummary}. ${surfaceSummary} ${estimateSummary} ${placementAvailability}.`;
}

function placeFoxFromSurfaceHit(hit: EightWallHit, status: string) {
  if (!animalAvailable || !activeScene || activeFox) return;

  const rotation = new Quaternion(
    hit.rotation.x,
    hit.rotation.y,
    hit.rotation.z,
    hit.rotation.w,
  );
  const fox = createMysticalFoxModel();
  fox.position.set(hit.position.x, hit.position.y + 0.005, hit.position.z);
  fox.quaternion.copy(rotation);
  activeScene.add(fox);
  activeFox = fox;
  onStatusChange(status);
}

function installPipeline(api: ReadyEightWallApi) {
  if (pipelineInstalled) return;

  const appModule: EightWallModule = {
    name: "irchelgo-world-placement",
    onStart: () => {
      const xrScene = api.Threejs.xrScene();
      activeScene = xrScene.scene;
      activeCamera = xrScene.camera;
      activeScene.children
        .filter(
          (child) =>
            child.name === "irchelgo-ambient-light" ||
            child.name === "irchelgo-directional-light",
        )
        .forEach((child) => activeScene?.remove(child));
      const ambientLight = new AmbientLight(0xffffff, 1.8);
      ambientLight.name = "irchelgo-ambient-light";
      const directionalLight = new DirectionalLight(0xffffff, 2.2);
      directionalLight.name = "irchelgo-directional-light";
      activeScene.add(ambientLight, directionalLight);
      if (debugEnabled) installDebugMarkers(activeScene);
      activeFox = null;
      featurePointHistory = [];
      lastHitTestAt = 0;
      lastDiagnosticAt = 0;
      lastTrackingState = "";
      lastHitTestError = "";
      onStatusChange(
        "8th Wall started. Waiting for world tracking and checking camera hit-test results...",
      );
    },
    onUpdate: ({ processCpuResult }) => {
      const reality = processCpuResult?.reality;
      const trackingState = `${reality?.trackingStatus ?? ""}:${reality?.trackingReason ?? ""}`;
      if (trackingState && trackingState !== lastTrackingState) {
        lastTrackingState = trackingState;
      }

      const now = performance.now();
      if (reality?.trackingStatus === "LIMITED") {
        const statusInterval = debugEnabled ? 1000 : 5000;
        if (now - lastDiagnosticAt >= statusInterval) {
          lastDiagnosticAt = now;
          featurePointHistory = [];
          updateDebugMarkers([]);
          onStatusChange(
            debugEnabled
              ? `Tracking LIMITED${reality.trackingReason ? ` (${reality.trackingReason})` : ""}. Hit testing is paused; move the phone slowly and aim at a textured area.`
              : "AR tracking is limited. Move the phone slowly and aim at a textured area.",
          );
        }
        return;
      }

      if (
        !activeScene ||
        activeFox ||
        now - lastHitTestAt < 500
      ) {
        return;
      }

      lastHitTestAt = now;
      let inspection: ReturnType<typeof inspectHitResults>;
      try {
        inspection = inspectHitResults(api);
        lastHitTestError = "";
      } catch (error) {
        const message = `8th Wall hit test failed: ${String(error)}`;
        if (message !== lastHitTestError) {
          console.error(message, error);
          lastHitTestError = message;
        }
        if (debugEnabled && now - lastDiagnosticAt >= 1000) {
          lastDiagnosticAt = now;
          onStatusChange(message);
        }
        return;
      }

      const {
        hits,
        bestSurfaceHit,
        bestHorizontalAlignment,
        featurePointCount,
        featureEstimate,
      } = inspection;
      if (debugEnabled) {
        updateDebugMarkers(
          [
            ...hits,
            ...(featureEstimate ? [featureEstimate.hit] : []),
          ].slice(0, DEBUG_MARKER_LIMIT),
        );
      }

      if (debugEnabled && now - lastDiagnosticAt >= 1000) {
        lastDiagnosticAt = now;
        onStatusChange(
          formatHitDiagnostics(
            hits,
            bestSurfaceHit,
            bestHorizontalAlignment,
            featurePointCount,
            featureEstimate,
            reality?.trackingStatus,
            reality?.trackingReason,
          ),
        );
      }

      if (
        bestSurfaceHit &&
        bestHorizontalAlignment >= MIN_HORIZONTAL_ALIGNMENT &&
        animalAvailable
      ) {
        placeFoxFromSurfaceHit(
          bestSurfaceHit,
          "Fox placed on a horizontal surface near the center of your view.",
        );
      } else if (featureEstimate && animalAvailable) {
        placeFoxFromSurfaceHit(
          featureEstimate.hit,
          `Experimental plane estimated from ${featureEstimate.supportCount} feature points; fox placed along your view direction, ${featureEstimate.distanceFromCamera.toFixed(1)} m ahead at the approximate surface height.`,
        );
      }
    },
    onCameraStatusChange: ({ status }) => {
      if (status === "failed") {
        onError("8th Wall could not access the camera. Check camera permission and reload.");
      } else if (status === "hasVideo") {
        onStatusChange(
          "Camera ready. Waiting for world tracking and camera hit-test results...",
        );
      }
    },
  };

  api.addCameraPipelineModules([
    api.XrController.pipelineModule(),
    api.GlTextureRenderer.pipelineModule(),
    api.Threejs.pipelineModule(),
    appModule,
  ]);
  pipelineInstalled = true;
}

export async function startEightWall(
  canvas: HTMLCanvasElement,
  animalIsAvailable: boolean,
  showDebug: boolean,
  onStatus: (status: string) => void,
  onRuntimeError: (message: string) => void,
) {
  onStatusChange = onStatus;
  onError = onRuntimeError;
  animalAvailable = animalIsAvailable;
  debugEnabled = showDebug;

  const api = await loadRuntime();
  window.THREE = THREE;
  installPipeline(api);
  api.XrController.configure({ disableWorldTracking: false });
  activeCanvas = canvas;
  resizeEightWallCanvas();
  window.addEventListener("resize", resizeEightWallCanvas);
  window.addEventListener("orientationchange", resizeEightWallCanvas);
  onStatusChange("Starting 8th Wall camera and world tracking...");
  api.run({
    canvas,
    allowedDevices: api.XrConfig.device().MOBILE,
  });
}

export function setEightWallAnimalAvailable(available: boolean) {
  animalAvailable = available;
  if (!available && activeFox && activeScene) {
    activeScene.remove(activeFox);
    activeFox = null;
  }
}

export function stopEightWall() {
  if (window.XR8) window.XR8.stop();
  window.removeEventListener("resize", resizeEightWallCanvas);
  window.removeEventListener("orientationchange", resizeEightWallCanvas);
  activeCanvas = null;
  featurePointHistory = [];
  removeDebugMarkers(activeScene);
  if (activeFox && activeScene) activeScene.remove(activeFox);
  activeScene = null;
  activeCamera = null;
  activeFox = null;
  animalAvailable = false;
  debugEnabled = false;
}
