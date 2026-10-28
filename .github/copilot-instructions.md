# Copilot instructions for IrchelGO

## Project overview

This repository is a Vite + React + TypeScript app for an immersive AR/VR campus experience centered on the University of Zurich's Irchel campus. It prefers WebXR plane detection, then falls back to 8th Wall's camera pipeline and world tracking when WebXR is unavailable or fails.

Key runtime pieces:
- `src/main.tsx` bootstraps the React app and mounts `App`.
- `src/App.tsx` owns the full-screen layout and AR mode choice. The user starts WebXR first where supported and can choose 8th Wall after WebXR is unavailable or fails.
- `src/utils/eightWall.ts` lazily loads the 8th Wall runtime, starts its Three.js camera pipeline, and uses detected horizontal surface hit tests to place the selected animal.
- `src/animals/` contains one self-contained model module per animal; each module supplies its WebXR model and Three.js world-tracking model.
- `src/utils/camera.ts` wraps `navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })`; it is retained for the commented screen-space fallback.
- `src/utils/geolocation.ts` exposes access to `navigator.geolocation`.
- `src/utils/planes.tsx` contains the XR logic: `useXRPlanes('wall')` draws red wall planes and `useXRHitTest` tracks viewer-plane intersections for a small marker.
- `src/components/AnimalEncounter.tsx` handles WebXR hit testing and camera-pan encounter checks; the selected model comes from its animal module.
- `src/utils/animals.ts` is the animal registry. To add an animal, create a module in `src/animals/`, register its definition there, and add its ID to the appropriate GeoJSON area's `animals` list.
- The idle welcome screen uses original static artwork and the Mystical Fox mascot; camera access is requested only after the user starts the game.
- Animal areas define a pool of encounter animals. Entering an area or moving 10 m from the previous encounter selects an animal at random. The current testing settings trigger a new encounter after a 30-degree camera turn with a 100% chance after a 15-second cooldown; restore the original 90-degree/30% settings after testing.

The app is intentionally split between browser/device APIs and the 3D scene logic. Keep browser camera and tracking APIs in `src/utils/*`, not in React components.

## Development commands

Use the project scripts from the repository root:

- `npm install`
- `npm run dev -- --host` — starts the Vite dev server with host access enabled for local-network / tunnel access.
- `npx localtunnel --port 5173` — opens a public tunnel to the Vite app so browser/device permission flows can be tested through a non-localhost URL when required.
- `npm run build` — runs TypeScript compilation and then produces the production bundle.
- `npm run preview` — serves the built app locally for inspection.

Append `?debug=1` to the app URL to show AR-path, camera, motion-sensor, and 8th Wall hit-test diagnostics. The default view hides those debug details.

For browser permission flows that require a non-`https://localhost` origin, run the app in two terminals:

1. `npm run dev -- --host`
2. `npx localtunnel --port 5173`

Then use the generated localtunnel URL to access the site. Vite is configured to allow generated `.loca.lt` subdomains and to fail rather than silently switch away from port 5173. This is the project’s current workaround for localhost permission restrictions when the app depends on browser APIs such as camera access.

### Android debugging over USB

To debug the app on an Android device through the Android Debug Bridge (ADB):

1. Connect the device to the computer with a USB cable and enable **File transfer** for the USB connection.
2. In PowerShell, check that ADB sees the device:

   ```powershell
   adb devices
   ```

   Confirm the device appears in the list and is authorized.
3. Forward the Vite development server port to the device:

   ```powershell
   adb reverse tcp:5173 tcp:5173
   ```

4. In Firefox, open `about:debugging#/setup` and verify that Android remote debugging is set up and the device/browser is available for inspection.

Validation status:
- No dedicated test runner is configured in `package.json`.
- No lint script is configured in `package.json`.
- The current validation path is `npm run build` because it executes `tsc` and `vite build`.

If a test file is added later, prefer the project’s actual runner and run a single file rather than the whole suite (for example, `npx vitest run path/to/file.test.ts` or the equivalent for the chosen framework).

## Architecture and implementation patterns

### React + Vite structure

This is a small app with a single main screen rather than a large multi-page application. Keep feature work centered in the existing `src/App.tsx` / `src/utils/*` split rather than creating a broad folder structure unless a new subsystem clearly warrants it.

### AR rendering and fallback pattern

The app uses separate render paths:
1. WebXR uses the React Three Fiber `Canvas` and `<XR store={xrStore}>`.
2. 8th Wall uses its own camera pipeline and canvas, and is only loaded when selected.
3. The older screen-relative camera tap-to-place fallback is commented out in `src/App.tsx`; retain it there so it can be restored if both AR paths fail.

Do not run WebXR and 8th Wall camera pipelines concurrently. Stop the 8th Wall pipeline when leaving that mode.

### XR / plane detection logic

The WebXR code in `src/utils/planes.tsx` is the most important scene logic in the repo. It uses:
- `useXRPlanes('wall')` to collect wall planes,
- `XRPlaneModel` to render them,
- `useXRHitTest` with `'viewer'` and `'plane'` to place a red marker where the viewer intersects a detected plane.

`src/App.tsx` creates one module-level XR store with plane detection and hit testing enabled, passes it to `<XR store={xrStore}>`, and starts AR from a user gesture. Keep `enterAR()` behind the user action; automatic session offer is disabled.

8th Wall's runtime files come from `@8thwall/engine-binary`. The Vite plugin in `vite.config.ts` serves them during development and emits the runtime files into `dist/xr-runtime/` during production builds. Keep this runtime lazy-loaded; do not import its multi-megabyte binaries into the main JavaScript bundle. Preserve the distributed `LICENSE` file and visible attribution link in the 8th Wall mode.

If you modify either AR path or hit-test behavior, validate the app on physical devices. A successful build does not verify camera permission, world tracking, or real surface detection.

### Browser/device API boundaries

Keep camera/tracking integrations inside `src/utils/*` rather than mixing SDK calls into React components; `App.tsx` should select modes and compose the experience.

## Key conventions in this codebase

- Follow the existing TypeScript style: semicolon usage, double-quoted string literals, and straightforward function declarations are used throughout the repo.
- Prefer small utility functions over inlining browser/device logic directly inside components.
- Keep WebXR scene code near the existing `@react-three/xr` / `@react-three/fiber` usage; isolate alternate SDK integrations in their own utility module.
- Do not treat the app as a traditional DOM-heavy web app; it is a real-time mobile/AR app and should be checked with browser permissions and XR/device support in mind.
- Use the existing `App.tsx` + `utils/` composition pattern unless a new concern warrants a dedicated component folder.

## Repository-specific notes

- The app depends on `@8thwall/engine-binary`, `@react-three/fiber`, `@react-three/drei`, `@react-three/xr`, `three`, and React 19.
- The primary build target is a browser app without a test suite, so TypeScript correctness and successful Vite build are the main regression checks.
