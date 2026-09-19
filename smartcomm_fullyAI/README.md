# SmartComm — mobile-first web interface
# SmartComm — Mobile-First Web Interface

Rachel's door-to-door Tampines–CBD commute planner. Open it directly in a phone browser: **no native application, Xcode or app-store installation is needed**.
> 📖 **New here?** Read the [User Manual (MANUAL.md)](MANUAL.md) for a full guide on how to use the app, manage your commute agendas, enable notifications, and customise your settings.

SmartComm is a door-to-door Singapore commute planner. Open it directly in a phone browser: **no native application, Xcode or app-store installation is needed**.

This revision follows Section 3 in [jerry/smartcomm.md](../jerry/smartcomm.md) and the PS2 README. It provides real OpenStreetMap walking and rail geography, route replanning, arrival ranges, live observations and crowd forecasts, integrated route comparison, labelled event replay, and saved journey progress. See [WRITEUP.md](WRITEUP.md) for the PS2 section-by-section mapping, rubric decisions and known limitations, and [SOURCES.md](SOURCES.md) for data provenance and licences.

## Run from a clean checkout

Prerequisite: **Node.js 22 or newer** with npm. All frontend dependencies and geographic data are already bundled, so normal startup does not need a package download or a frontend build.

```sh
cd smartcomm_fullyAI
npm start
```

Open **http://localhost:4173** in Safari, Chrome or another modern browser.

The server listens on port 4173 on the local network. To open it on a physical phone, connect the phone and Mac to the same Wi-Fi and use `http://YOUR_MAC_LAN_IP:4173`. On a Mac using Wi-Fi, `ipconfig getifaddr en0` commonly displays that address. Allow the local connection through the Mac firewall if prompted. Do not use `localhost` on the phone; that refers to the phone itself.

The prototype has not been published to a public host. A production/remote deployment needs HTTPS and a Node-compatible backend for `/api/conditions`, not just a static file host.

## First journey to try

The page opens in **Official feeds** mode. Demo scenarios are available from the mode button beside the page heading. Default journey:

- Start: **Tampines Central 1**, a public map point used because Rachel's address is not in the brief.
- Destination: **One Raffles Place**, with the final walking leg included.
- Usual departure: **07:40**; earliest departure **07:20**; arrival deadline **08:45**; buffer **5 min**.

1. Read the recommended departure and arrival range. Future journeys remain provisional when current feeds do not cover them.
2. Open **Official feeds → EWL disruption** to try a labelled demo. The recommendation switches to DTL when it avoids the delay and meets the deadline.
3. Select either route option. The main advice, directions and highlighted map route change together; the other route remains visible for comparison.
4. Choose **First walk** or **Last walk** for pedestrian detail. Expand a journey step or open **All directions** for street names, station exits and boarding direction.
5. Choose **Start this journey**, advance a step, and reload. The chosen route and progress are retained on this device. **End journey** clears that saved trip.
6. Use **Edit** to change the date, deadline, earliest departure, walking limit or shelter preference. Arrival is not fixed to 08:45.
7. Try normal service, crowding, rain, planned closure and offline demos from the mode selector. Use **Use official feeds** to return to real sources.
8. Use **Change start on map** or **Change destination** to recalculate from another street entrance. Coordinates are also available in the form for keyboard access.

The bounded start area is Tampines Central; the destination area covers Raffles Place and part of Marina Bay. Points outside the extract, too far from a connected footpath, or separated by missing OSM connections are rejected with an explanation. This is not an island-wide journey planner.

## Enable official feeds

The default **Official feeds** mode refreshes automatically; use **Refresh** under journey conditions to check again. The app calls the server, which fetches the data.gov.sg two-hour weather forecast without a key. Weather affects walking only when its valid period covers the selected departure. For a journey tomorrow, a current two-hour forecast will correctly be shown as outside the relevant window.

For live rail alerts and station crowding, obtain a free AccountKey from [LTA DataMall](https://datamall.lta.gov.sg), then:

```sh
cp .env.example .env
```

Set `LTA_ACCOUNT_KEY` in `.env` locally and restart `npm start`. Never commit `.env` or paste keys into the frontend. The key is read only by the server. The example file contains no credential value.

Current official integrations:

| Source | Behaviour |
| --- | --- |
| `TrainServiceAlerts` | Parses nested affected segments, stations and direction, plus separate messages and mitigation fields. Matching disrupted sections are excluded conservatively. |
| `PCDRealTime` for EWL and DTL | Uses observations for the boarding station at the estimated station-arrival time. Unknown is distinct from low crowding. |
| `PCDForecast` for EWL and DTL | Uses dated 30-minute intervals when a matching observation is unavailable. Forecasts are labelled and never reused for another date. Cached for one hour. |
| data.gov.sg two-hour forecast | Uses Tampines/City forecasts only during their valid period. |

Current rail/crowding readings are not assumed to predict a distant future departure. Missing keys, source failures and stale records remain visibly unknown. This is essential: **an empty or unavailable feed must not become a claim of normal service**.

Weather, authenticated train alerts, crowd observations and crowd forecasts have been exercised live. Forecast availability is limited to the dates actually supplied by LTA; today’s forecast is not tomorrow’s forecast. No key is needed to run the OSM planner, inspect the map, reproduce timing calculations, or exercise the labelled replay scenarios.

## Proactivity, storage and offline use

While the page is open and monitoring is enabled, official feeds refresh every minute. Relevant in-app advice is deduplicated. Optional browser notifications require permission and a supported secure context. **Closed-browser monitoring and background Web Push are not implemented.** A page suspended by a mobile browser cannot promise timely delivery.

Preferences stay in local device storage. Starting a journey also stores its inputs, selected route, original conditions and progress locally; it restores after reload, expires after 18 hours, and is removed when ended or completed. Feed snapshots are public data cached locally and in server memory. The server does not store Rachel’s routine or continuously track her location. Progress is manual. A started journey keeps its original timing estimate rather than pretending to track live arrival.

On HTTPS or localhost, a service worker caches the application, OSM graph and map library after the first successful load. Geographic routing can then continue offline, with conditions marked unknown/stale. Service-worker offline reload is not guaranteed on a plain HTTP LAN address; test that feature over HTTPS or localhost. The OSM map never depends on downloading public tiles.

## Verification

```sh
npm test
npm run check
```

Twenty-nine tests cover route constraints, changed coordinates, real map geometry, deadlines, closure traversal windows, direction matching, rain/shelter, crowding, offline data, official response normalisation credential-safe failure messages, forecast interval boundaries, departure re-evaluation and saved-journey recovery. Syntax checks cover frontend, server and feed modules.

Authenticated server verification on 18 September 2026 succeeded for TrainServiceAlerts and PCDRealTime (33 EWL and 37 DTL station records). The local key is held only in ignored `.env`, with owner-only permissions. Checks confirmed that public assets and API responses do not contain it, and HTTP requests for configuration/server files are denied. Live major-disruption handling still needs a captured fixture or real event; the successful live alert response reported status 1.

Manual checks completed in Safari desktop and responsive views: the redesigned interface was checked at 366×844, including mode selection, alternative-route selection, journey start/progression and reload recovery. With the local server stopped, a cached reload still showed the saved journey and allowed step progression. Earlier checks covered arrival-time editing at 390×844. Authenticated crowd forecasts returned 1,584 EWL and 1,776 DTL station-interval records. This is **not** a physical-phone test.

Before judging, open the app on an actual phone and check:

- One-handed route choice and journey-step controls.
- Form editing with the soft keyboard open and browser address bar changing height.
- Large text, focus order, VoiceOver/TalkBack, portrait and landscape.
- Map zoom/focus controls and equivalent written directions.
- Reload after losing signal over a supported secure origin.

## Submission readiness

[WRITEUP.md](WRITEUP.md) maps each requirement in **3.2.1–3.2.3** to the implementation and explains the **40% / 35% / 25% rubric** choices in **3.2.4**. It also records the gaps honestly: physical-phone validation, timing calibration/field verification, captured major-disruption validation, real planned-notice ingestion and closed-browser notifications.

This is a working bounded-corridor prototype, not a claim of fully validated production routing or a guaranteed rubric score. Arrival ranges are transparent engineering estimates, not official schedules or calibrated probabilities. The current replay is synthetic; obtain a permitted captured disruption before describing a final demo as a historical incident. A recorded demo link has not yet been produced.

## Project structure

```text
dist/index.html          Mobile-first web interface
dist/styles.css          SGDS-inspired visual hierarchy and responsive layout
dist/web.js              Forms, map, state, updates and source status
dist/planner.js          Arrival estimates, constraints and route ranking
dist/geo.js              Connected OSM walking graph and route generation
dist/session.js          Saved journey restoration and expiry
dist/data/network.js     Bundled ODbL geographic extract
dist/vendor/leaflet/     Vendored map library and upstream licence
dist/sw.js               Web offline cache; bypasses live API requests
lib/feeds.cjs            Official source normalisation and shared caches
server.cjs               Web server and /api/conditions endpoint
tests/                   Reproducible routing and feed checks
scripts/build-osm.py     Occasional data-refresh transformation
WRITEUP.md               Persona, architecture, assumptions and rubric mapping
SOURCES.md               Source URLs, licences and refresh procedure
```

`npm ci` is only needed when refreshing vendored Leaflet assets; normal startup uses the committed files. Earlier `iOS/` and `SmartComm.xcodeproj/` experiments remain in the folder for reference, but are not required, maintained as the primary interface, or part of the PS2 web demonstration.
