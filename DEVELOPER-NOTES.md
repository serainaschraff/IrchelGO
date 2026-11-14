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

`public/data/irchel.geojson` is the default campus territory map and retains its source geometry/properties. `src/utils/territories.ts` assigns its configured animal species and both color variants at runtime without editing the GeoJSON. Add `?ch=1` to instead load `public/data/animal-areas.geojson`, which contains the Swiss canton boundaries from the geoBoundaries `gbOpen CHE ADM1 2022` dataset sourced from swisstopo. `src/utils/territories.ts` keeps the defined species and variants assigned to each canton; those assignments are not stored in the GeoJSON. Its per-feature source and license attribution refer to [swisstopo's geodata terms](https://www.swisstopo.admin.ch/en/home/meta/conditions/geodata/ogd.html).

Irchel area assignments:

| Area | Animals |
|---|---|
| park | Fox, Hedgehog |
| lake | Fish, Duck |
| tram-path | Lizard, Cat |
| mensa | Lion, Bear |
| geo | Butterfly, Crystal |
| goats | Ibex, Mink |
| bar | Monkey, Cow |
| hilltop | Crow, Eagle |
| building | Dwarf, Mouse |

Animal definitions live in `src/animals/`; the registry and encounter selection live in `src/utils/animals.ts`. `CreatureModel.tsx` supplies the shared stylized geometry for every species, including fox. Each species module defines two animal variants with unique IDs, names, and color palettes.

To add or replace an encounter variant:

1. Define a unique ID, display name, model, and palette in the relevant species module.
2. Register the definition in `src/utils/animals.ts`.
3. Add the ID to the appropriate runtime assignment in `src/utils/territories.ts` (or it may be selected randomly for a canton).
4. Confirm the ID resolves through `isAnimalId()` and the model renders in both WebXR and 8th Wall.

All variants of a species share the procedural geometry in `src/animals/CreatureModel.tsx`; colorways and names are defined in the species module. Keep species-defining anatomy visible at the gallery's viewing scale, and extend `tests/utils/animals.test.ts` when adding or redesigning a model. These tests check generated Three.js geometry, not rendered visual fidelity or biological accuracy, so inspect significant shape changes in the `?animal=1` gallery as well.

Reference pages consulted for the current model shapes:

- [Lizard](https://en.wikipedia.org/wiki/Lizard) — elongated body, four jointed limbs, and tapering tail.
- [Hedgehog](https://en.wikipedia.org/wiki/Hedgehog) — compact body, pointed snout, and dense spines.
- [Marmot](https://en.wikipedia.org/wiki/Marmot) — stocky rodent proportions, short limbs, and rounded head.

These are stylized low-poly interpretations. No reference images or third-party model assets are copied into the project.

Area entry and GPS movement select randomly from the feature's animal pool. The default move-on distance is 10 m; `?outside=1` changes only that distance to 25 m. Camera-pan testing is currently set to 30 degrees and 100% chance after a 15-second cooldown; the intended original values are 90 degrees and 30% chance.

## Development and validation

Run commands from the repository root:

- `npm install`
- `npm run dev -- --host` — Vite dev server accessible on the local network.
- `npx localtunnel --port 5173` — optional HTTPS tunnel for browser/device permission testing.
- `npm run build` — TypeScript compilation followed by the Vite production build.
- `npm test` — run all Vitest unit and component tests in `tests/` (`npm.cmd test` in PowerShell if `npm` is blocked by the execution policy).
- `npm run preview` — preview the production build.

When testing diagnostics, append `?debug=1` to the URL. The default view hides developer-only diagnostics. In supported handheld WebXR browsers, the optional DOM overlay shows live horizontal/vertical plane and wall counts plus placement and hit-test status. Session lifecycle and throttled hit-test samples are written to the browser console and retained in a copyable log; consecutive no-hit samples are condensed into a timestamp range. DOM overlay support is device/browser dependent.

Use `?force8thwall=1` to make the Start button launch 8th Wall directly instead of selecting WebXR. `?game=1` places the denied-location reminder on a WebXR plane; 8th Wall keeps the reminder as an overlay. `?ch=1` selects the Swiss canton map, `?buli=1` selects the Bülach territory map, and `?outside=1` changes the movement distance. `?animal=1` opens a standalone animal gallery; it skips XR support checks and animal-area loading/GPS access. Query flags can be combined, but the gallery takes precedence when `animal=1`. If geolocation permission is denied, the **Location not found!** indicator appears with a rotating crossed-out location pin and an access reminder.

For localtunnel testing, run the dev server and tunnel in separate terminals. Vite is configured to allow generated `.loca.lt` subdomains and to fail rather than switch away from port 5173. This is a local-development workaround for browser APIs that need a secure context; it is not part of deployment.

Android USB debugging notes:

1. Connect the device, enable **File transfer**, and confirm authorization with `adb devices`.
2. Run `adb reverse tcp:5173 tcp:5173`.
3. Use Firefox `about:debugging#/setup` to inspect Android remote debugging.

The test suite covers animal registry, generated anatomy cues, and encounter logic; GeoJSON location matching; AR path selection; debug-log summaries; and the denied-location indicator. It cannot verify visual fidelity, real camera/GPS permission prompts, WebXR plane tracking, or 8th Wall world tracking; inspect model changes in the gallery and validate AR behavior on supported physical devices. There is no separate lint script configured.

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
