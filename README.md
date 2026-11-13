# IrchelGO

IrchelGO is a mobile augmented-reality experience for exploring the University of Zurich's Irchel campus and the cantons of Switzerland. Depending on the player's GPS location, the app selects one of the animals assigned to that area and places it on a detected horizontal surface.

## Features

- WebXR plane detection is the preferred AR mode.
- 8th Wall world tracking is available as a fallback on supported devices.
- Swiss canton boundaries are stored in GeoJSON; animal assignments are generated at runtime.
- Each animal species has two named color variants. Mink replaces marmot as the non-ibex encounter in the goats area.
- Help and developer diagnostics are available in the app.

## Requirements

- Node.js and npm
- A modern browser
- For AR, a compatible phone or headset with camera, motion sensor, and location access

Camera, geolocation, and AR permissions generally require a secure context (`https://`). `http://localhost` is treated as secure by many browsers, but a plain-HTTP local-network address is not.

## Run locally

Install dependencies and start Vite:

```sh
npm install
npm run dev -- --host
```

For testing browser permissions from another device or a non-localhost origin, open a second terminal and run:

```sh
npx localtunnel --port 5173
```

Open the HTTPS URL printed by LocalTunnel. Keep the Vite server running in the first terminal. For USB-connected Android testing, ADB port forwarding is another option; see [DEVELOPER-NOTES.md](./DEVELOPER-NOTES.md).

## Build and preview

```sh
npm run build
npm test
npm run preview
```

The easiest way to run the test suite is `npm test` from the project root (or `npm.cmd test` in PowerShell if script execution blocks `npm`). It runs all Vitest tests under `tests/`. These cover deterministic application logic and selected UI; they do not simulate or validate real device camera access, GPS permissions, WebXR tracking, or 8th Wall world tracking.

The production build is written to `dist/`.

## Animal areas and variants

The default Irchel map is [`public/data/irchel.geojson`](./public/data/irchel.geojson). Its territory geometry and properties are left unchanged; the configured animal species and both color variants are added at runtime by [`src/utils/territories.ts`](./src/utils/territories.ts). Add `?ch=1` to use the Swiss canton boundaries in [`public/data/animal-areas.geojson`](./public/data/animal-areas.geojson); each canton keeps its defined animal species and variants, configured in code rather than stored in the GeoJSON.

Animal definitions and their shared procedural species models are in [`src/animals/`](./src/animals/). The registry and encounter selection are in [`src/utils/animals.ts`](./src/utils/animals.ts). Anatomy-focused model tests live in [`tests/utils/animals.test.ts`](./tests/utils/animals.test.ts). See [DEVELOPER-NOTES.md](./DEVELOPER-NOTES.md) for the Irchel territory pairs, model design notes, and steps for adding or changing variants.

## AR placement and troubleshooting

In WebXR mode, the app uses a viewer-based plane hit test. It places the animal at the first returned hit whose surface is sufficiently horizontal. The app does not set a maximum placement distance or define a play-area perimeter. The XR device/runtime can still limit hit-test results to surfaces it can track, and a headset's own guardian or boundary may restrict the usable tracking area.

For devices without a usable WebXR path, the app can use the separate 8th Wall tracking pipeline. Keep its camera pipeline separate from WebXR.

Use the **Help** panel for user-facing status. Append `?debug=1` to show developer diagnostics; in supported handheld WebXR browsers, a live overlay reports horizontal planes, vertical planes/walls, and hit-test status while AR is active, and detected planes are drawn in the scene. The on-page log condenses consecutive no-hit samples into a timestamp range and can be copied after leaving AR. Add `?force8thwall=1` to start 8th Wall instead of WebXR. `?game=1` places the denied-location reminder on a detected WebXR plane rather than displaying it as an overlay. `?outside=1` changes the GPS move-on distance from 10 m to 25 m; it does not change the AR placement distance. `?animal=1` opens a standalone, tap-to-advance animal gallery; it uses no GPS or AR session. Flags can be combined, for example `?debug=1&game=1&ch=1`.

If location permission is denied, the app displays the **Location not found!** indicator with a rotating crossed-out location pin and a reminder to allow access.

AR behavior depends on the device, browser, permissions, lighting, and detected surfaces. A successful build does not verify camera access, tracking quality, or placement on a physical device.

## Deployment

GitHub Pages is configured through [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml). The project-site URL is `https://serainaschraff.github.io/IrchelGO/`; set the repository's Pages source to **GitHub Actions** and push to the configured branch to publish.

Deploy the complete `dist/` output, including the animal-area GeoJSON and 8th Wall runtime files. Test the deployed HTTPS site on the target devices and preserve the 8th Wall license and attribution.

## More developer information

See [DEVELOPER-NOTES.md](./DEVELOPER-NOTES.md) for the architecture, development commands, device-debugging guidance, animal assignments, project conventions, and deployment details.
