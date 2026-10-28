# IrchelGO developer notes

## Project overview

IrchelGO is a Vite + React + TypeScript mobile AR experience for the University of Zurich's Irchel campus. It prefers WebXR plane detection, with 8th Wall world tracking as a fallback.

## Runtime architecture

- `src/main.tsx` bootstraps the React app and mounts `App`.
- `src/App.tsx` owns the full-screen layout, location matching, encounter history, and AR mode selection.
- WebXR uses React Three Fiber's `Canvas`, `@react-three/xr`, and `src/components/AnimalEncounter.tsx` for horizontal-plane hit testing and placement.
- `src/components/RedWalls.tsx` visualizes wall planes detected through WebXR.
- `src/utils/eightWall.ts` lazily loads the 8th Wall runtime and runs its separate Three.js camera/tracking pipeline. Do not run WebXR and 8th Wall camera pipelines concurrently; stop 8th Wall when leaving that mode.
- Browser camera, motion sensor, and geolocation integrations belong in `src/utils/*`, not in React components.
- The old screen-relative camera tap-to-place fallback remains commented out in `src/App.tsx`.

### WebXR and 8th Wall

`src/App.tsx` creates one module-level XR store with plane detection and hit testing enabled. `enterAR()` must remain behind an explicit user gesture; automatic session offer is disabled.

The 8th Wall runtime comes from `@8thwall/engine-binary`. The Vite plugin in `vite.config.ts` serves it during development and emits the runtime files into `dist/xr-runtime/` for production. Keep the runtime lazy-loaded rather than bundling its large binaries with the main app. Preserve the distributed `LICENSE` file and visible attribution in 8th Wall mode.

Changes to camera, tracking, plane detection, or placement should be validated on physical devices. A successful build cannot verify permissions, world tracking, or real surface detection.

## Canton and animal data

`public/data/animal-areas.geojson` contains simplified Swiss canton boundaries from the geoBoundaries `gbOpen CHE ADM1 2022` dataset sourced from swisstopo. Each canton feature has an `areaId`, `areaName`, `cantonISO`, and an `animals` array containing the two encounter variants assigned to that canton. The data retains per-feature source attribution and license metadata; see [swisstopo's geodata terms](https://www.swisstopo.admin.ch/en/home/meta/conditions/geodata/ogd.html).

Assignments:

| Canton(s) | Animal |
|---|---|
| GR | Ibex |
| VS | Wolf |
| TG, SG, AI, AR | Butterfly |
| ZH, SH | Fox |
| AG, SO | Pig |
| BE | Bear |
| OW, NW, UR, SZ, GL | Cow |
| LU, ZG | Lion |
| TI | Lizard |
| GE, VD | Eagle |
| JU, NE, FR | Hedgehog |
| BS, BL | Dwarf |

`AR` is the ISO canton code for Appenzell Ausserrhoden; the user's list used `AS`.

Animal definitions live in `src/animals/`; the registry and shared encounter behavior live in `src/utils/animals.ts`. `CreatureModel.tsx` provides reusable stylized 3D geometry for non-fox animals. Each species module defines two animal definitions with different IDs, names, and palettes. The Mystical Fox and Polar Fox definitions remain in their dedicated modules.

To add or replace an encounter variant:

1. Define a unique ID, display name, model, and palette in the relevant species module.
2. Register the definition in `src/utils/animals.ts`.
3. Add the ID to the appropriate GeoJSON feature's `animals` array.
4. Confirm the ID resolves through `isAnimalId()` and the model renders in both WebXR and 8th Wall.

Area entry and GPS movement select randomly from the feature's animal pool. The default move-on distance is 10 m; `?outside=1` changes only that distance to 25 m. Camera-pan testing is currently set to 30 degrees and 100% chance after a 15-second cooldown; the intended original values are 90 degrees and 30% chance.

## Development and validation

Run commands from the repository root:

- `npm install`
- `npm run dev -- --host` — Vite dev server accessible on the local network.
- `npx localtunnel --port 5173` — optional HTTPS tunnel for browser/device permission testing.
- `npm run build` — TypeScript compilation followed by the Vite production build.
- `npm run preview` — preview the production build.

When testing diagnostics, append `?debug=1` to the URL. The default view hides developer-only AR, camera, motion-sensor, and 8th Wall hit-test details.

For localtunnel testing, run the dev server and tunnel in separate terminals. Vite is configured to allow generated `.loca.lt` subdomains and to fail rather than switch away from port 5173. This is a local-development workaround for browser APIs that need a secure context; it is not part of deployment.

Android USB debugging notes:

1. Connect the device, enable **File transfer**, and confirm authorization with `adb devices`.
2. Run `adb reverse tcp:5173 tcp:5173`.
3. Use Firefox `about:debugging#/setup` to inspect Android remote debugging.

There is no dedicated test runner or lint script configured. The normal regression check is `npm run build`; `git diff --check` is also useful for text/source edits. If tests are added, use the chosen framework's focused test command.

## Deployment

GitHub Pages is configured for a project site at `/IrchelGO/` by `.github/workflows/deploy-pages.yml`. The workflow builds and publishes `dist`. Keep the app's base-path-aware data, welcome-art, and runtime URLs intact.

Deploy the complete `dist` output, including the animal-area GeoJSON and `xr-runtime` files. Device camera, geolocation, and AR APIs require a secure context on deployed sites. Preserve the 8th Wall license and attribution.

## Code conventions

- TypeScript with semicolons and double-quoted strings.
- Prefer small utility functions for browser/device logic.
- Keep WebXR scene code near the React Three Fiber/XR components and isolate alternate SDK integrations in their own utilities.
- This is a real-time mobile/AR app; validate behavior with browser permissions and device capabilities in mind.
- Use the existing `App.tsx`, `components/`, `animals/`, and `utils/` boundaries unless a new subsystem warrants a distinct structure.

## Dependencies and project checks

The app uses React 19, `@react-three/fiber`, `@react-three/drei`, `@react-three/xr`, `three`, and `@8thwall/engine-binary`. The primary build target is a browser app.
