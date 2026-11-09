# IrchelGO

IrchelGO is a mobile augmented-reality experience for exploring the University of Zurich's Irchel campus and the cantons of Switzerland. Depending on the player's GPS location, the app selects one of the animals assigned to that area and places it on a detected horizontal surface.

## Features

- WebXR plane detection is the preferred AR mode.
- 8th Wall world tracking is available as a fallback on supported devices.
- Swiss canton boundaries and animal assignments are stored in GeoJSON.
- Each canton is assigned two animal variants with separate names and colors.
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

The canton polygons and animal IDs are in [`public/data/animal-areas.geojson`](./public/data/animal-areas.geojson). Each feature contains its canton code and two animal IDs. The simplified boundaries are from the geoBoundaries `gbOpen CHE ADM1 2022` dataset sourced from swisstopo; source and license attribution are included in the GeoJSON.

Animal definitions and their models are in [`src/animals/`](./src/animals/). The registry and encounter selection are in [`src/utils/animals.ts`](./src/utils/animals.ts). See [DEVELOPER-NOTES.md](./DEVELOPER-NOTES.md) for the canton assignment table and the steps for adding or changing variants.

## AR placement and troubleshooting

In WebXR mode, the app uses a viewer-based plane hit test. It places the animal at the first returned hit whose surface is sufficiently horizontal. The app does not set a maximum placement distance or define a play-area perimeter. The XR device/runtime can still limit hit-test results to surfaces it can track, and a headset's own guardian or boundary may restrict the usable tracking area.

For devices without a usable WebXR path, the app can use the separate 8th Wall tracking pipeline. Keep its camera pipeline separate from WebXR.

Use the **Help** panel for user-facing status. Append `?debug=1` to show developer diagnostics; in supported handheld WebXR browsers, a live overlay reports horizontal planes, vertical planes/walls, and hit-test status while AR is active. The on-page log condenses consecutive no-hit samples into a timestamp range and can be copied after leaving AR. Add `?force8thwall=1` to start 8th Wall instead of WebXR. `?outside=1` changes the GPS move-on distance from 10 m to 25 m; it does not change the AR placement distance.

If location permission is denied, the app displays the **Location not found!** indicator with a rotating crossed-out location pin and a reminder to allow access.

AR behavior depends on the device, browser, permissions, lighting, and detected surfaces. A successful build does not verify camera access, tracking quality, or placement on a physical device.

## Deployment

GitHub Pages is configured through [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml). The project-site URL is `https://serainaschraff.github.io/IrchelGO/`; set the repository's Pages source to **GitHub Actions** and push to the configured branch to publish.

Deploy the complete `dist/` output, including the animal-area GeoJSON and 8th Wall runtime files. Test the deployed HTTPS site on the target devices and preserve the 8th Wall license and attribution.

## More developer information

See [DEVELOPER-NOTES.md](./DEVELOPER-NOTES.md) for the architecture, development commands, device-debugging guidance, animal assignments, project conventions, and deployment details.
