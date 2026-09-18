# SmartComm: Rachel's mobile-first web companion

## Persona and scope

Rachel has an established Tampines–Raffles Place routine, normally leaving at 07:40 to arrive by 08:45. Those times are editable preferences. Her exact address is not in the brief, so the default start is a named Tampines Central street point and the destination is One Raffles Place. Users can select presets, enter coordinates or choose mapped street entrances inside the supported areas.

The application is a web interface, opened directly in a phone browser. Native installation, Xcode and an app store are not part of the delivery flow. Existing iOS files are retained from an earlier experiment and are not the submission entry point.

## Mapping to PS2 requirements

Scope reference: [jerry/smartcomm.md](../jerry/smartcomm.md), Section 3, checked against the repository’s PS2 README. Section 3.1 sets a mobile-first web scope; 3.2.1–3.2.3 are mandatory, 3.2.4 supplies the rubric, and 3.3 is optional.

| Requirement | Running implementation | Evidence / remaining limit |
| --- | --- | --- |
| **3.2.1: origin, destination and time** | Editable start/destination, map selection, date, departure, earliest departure and deadline. | Try another endpoint and compare the computed walking geometry. Coverage is explicitly bounded. |
| **3.2.1: door-to-door, multimodal** | Walking graph → station entrance → mapped rail corridor → exit → walking graph → destination. | Named exits, distances, ordered walking instructions and station list. Rail + walking serve this Rachel route; there is no bus planner. |
| **3.2.1: revised route** | Conditions affect availability, walking time, boarding allowance and ranking. | EWL disruption replay selects DTL. Closure excludes the affected EWL option. High crowding changes waits; comfort preference can change the result. |
| **3.2.1: live conditions** | Server adapters for official weather, train alerts, station crowd observations and dated crowd forecasts; cache and time-window checks. | Weather and authenticated LTA responses were exercised live. Live major-disruption verification remains outstanding. Missing data stays unknown. |
| **3.2.1: uncertainty** | Arrival ranges, upper timing allowance, unknown crowding state, stale/unavailable sources. | Reproducible model assumptions, not calibrated confidence intervals. |
| **3.2.2: OSM GIS** | Actual OSM pedestrian graph, rail alignments, entrances and endpoint map detail. | Checked-in attributed ODbL extract; no public tile calls. |
| **3.2.3: map and alternatives** | Interactive Leaflet map shows both routes, affected sections, walks and stations. | Whole route / first walk / last walk controls; named station landmarks and equivalent written directions. Selecting an alternative updates advice, map emphasis and directions together. |
| **3.2.3: glanceable information** | Arrival range, walking time, departure, added allowance, low/moderate/high/unknown crowding. | Crowding uses text and marks; affected sections use dashes as well as colour. |
| **3.2.3: actual-phone usability** | Responsive single-column layout, touch controls, mobile navigation, standard input fields, focus states and native dialog. | Desktop Safari and the redesigned 366-pixel responsive layout checked. A physical-phone browser test remains necessary. |

## Design decisions against 3.2.4

**Problem Fit — 40%.** Advice is attached to Rachel's journey and deadline, not a network status dashboard. She receives one action, can compare alternatives, and can see why it changed. Normal service stays quiet when her usual plan works. Updates are deduplicated by meaningful advice. Earlier departures respect her earliest acceptable departure. Unachievable deadlines are reported as late; walking limits are not silently overridden.

**Technical Execution — 35%.** Geographic routes use real cached OSM data. The walking graph includes permitted footways, steps, pedestrian paths and local streets; private/no-foot access is excluded. Dijkstra routing favours covered/indoor edges when requested. Rail shape follows the OSM relation rather than straight station-to-station lines. Official data stays server-side, API keys never reach the client, and source freshness is retained. Unit tests cover geographic changes and feed failure semantics, not just rendered labels. A clean startup needs only Node and the repository because the map assets are vendored.

**Ease of Use — 25%.** Official feeds are the default; demo controls live in a separate, clearly labelled selector. A single selected route connects the recommendation, map and directions. Consistent typography, 44–48 px controls, a compact journey summary and a bottom navigation bar keep the first phone viewport focused on the action. The page leads with a route recommendation and deadline, then explains the route choice and lets Rachel inspect the map. Map controls focus on the walks rather than requiring precise map gestures. No operator dashboard, charts or native app setup is needed. Feedback distinguishes unavailable routes, out-of-coverage locations and unknown conditions.

These are design and implementation choices, not a predicted judging score. The remaining gaps below prevent claiming a fully validated submission.

## Architecture and timing model

`server.cjs` serves the web assets and `/api/conditions`. `lib/feeds.cjs` fetches and normalises official feeds with shared caches and bounded requests. `dist/geo.js` calculates geographic walking paths over `dist/data/network.js`. `dist/planner.js` adds rail/waiting/rain/crowding allowances and ranks alternatives. `dist/web.js` manages the interface and device-local preferences. `dist/session.js` validates, restores and expires locally saved journey progress. The service worker caches application and geographic assets but deliberately bypasses live API requests.

Timing assumptions:

- Walking: mapped distance divided by **75 m/min**, rounded up for each end.
- Rail: distance / **42 km/h EWL** or **39 km/h DTL**, plus **0.45 min per intermediate stop**; upper estimate adds **15%** to that rail duration.
- Boarding: **2–7 min** under moderate/low crowding, **5–14 min** under high crowding, **2–12 min** when unknown.
- Station access: **4 min total** for platform access at both ends. The grey dotted map connectors are not claimed as surveyed indoor paths.
- Rain: **35%** additional time on exposed walking distance. Missing coverage tags are treated as exposed. Shelter preference changes path cost rather than inventing a guaranteed sheltered route.
- Disruption replay: **15–25 min** added to the affected EWL route. The planned replay closure is labelled and date-scoped by the selected journey; availability checks the estimated affected-section traversal window at the calculated departure.
- Endpoint connectors: nearest connected walking nodes must be within **85 m**. Their summed approximate distance is disclosed in directions. No route is invented across disconnected network components.

Arrival ranges are engineering bounds, not a learned probability distribution. Real travel times should be measured and compared with authoritative schedules before making punctuality claims.

Rank feasible routes by lateness, loss of requested buffer, earlier departure, journey duration, and the selected walking/crowding preference. Routes exceeding the walking limit or flagged closed are excluded. Recommendations never assume a late traveller can leave in the past in official-feed mode. Live planning evaluates five-minute departure candidates, plus the exact earliest/usual times. For each candidate, crowding is matched at the boarding station after the access walk and two minutes of platform access. A matching observation takes precedence; a fresh, dated forecast is the fallback. Interval ends are exclusive. Missing or stale forecasts remain unknown. Unknown data by itself does not trigger a disruption notification.

## Proactivity and offline behaviour

With the page open and monitoring enabled, official conditions refresh every minute. Relevant advice is generated before departure and is deduplicated. Optional browser notifications are feature-detected and permission-based. A suspended or closed browser is **not** a dependable monitor; there is no backend saved-routine scheduler or Web Push delivery service yet.

After the initial successful load on HTTPS or localhost, application files and map data are cached. Offline routing continues on the bundled graph; cached feed records are marked stale. On ordinary HTTP over a LAN, service workers may be unavailable, so do not claim an offline reload is guaranteed there.

Preferences and last feed snapshots are stored on the device. A started journey additionally stores its input preferences, selected route, original feed snapshot, calculation time and step. Reload reconstructs the original plan; it does not silently move the departure forward. The record expires after 18 hours and is cleared on completion or ending the journey. Arrival times during a started journey are labelled as original estimates, not GPS-derived ETAs. The server holds shared public-feed caches in process memory; it does not store Rachel's routine or track her position. Journey-step progression is user-controlled and does not claim GPS tracking or replanning from an in-transit location.

## Validation and remaining work

Completed on 18 September 2026:

- 29 Node tests: route constraints, deadlines, rain/shelter, crowding, closure traversal windows, direction filtering, source normalisation, credential-safe error handling, invalid/disconnected geography real walking/rail geometry, forecast intervals, station-arrival matching, departure re-evaluation and saved-journey recovery.
- JavaScript syntax checks.
- Server endpoint checks: current official weather returned successfully; rail/crowding correctly returned `not_configured` without a key. After local configuration, authenticated TrainServiceAlerts returned status 1 with two advisories, and PCDRealTime returned 33 EWL and 37 DTL records. PCDForecast also returned and normalised 1,584 EWL and 1,776 DTL station-interval records; the live response covered the current day, so the next day correctly remained unknown. The key was absent from API responses and public assets; `.env` is ignored, untracked and owner-readable/writable only. Configuration and server files are not served over HTTP.
- Safari desktop checks: page renders, mapped pedestrian paths display, changing 08:45 to 08:30 recalculates departure from 07:35 to 07:20 in the DTL replay; official weather and missing-key states are visible.
- Safari responsive views: initial layout at 390×844; redesigned layout at 366×844. Mode changes, alternative selection, journey start, progression and restoration after reload checked. With the local server stopped, a cached reload and further journey-step progression still worked. This is not a physical iPhone or radio-signal-loss test.

Before submission:

1. Extend authenticated validation to a captured major-disruption response or real event, plus upstream timeout/stale behaviour. The live normal-service and crowding responses have been verified with a local key; failure handling also has automated coverage.
2. Walk the real journey and calibrate timings, entrances, platform access, uncovered gaps and short endpoint connectors. The prototype has real geographic routing but has not been field validated.
3. Test Safari/Chrome on a real phone, one-handed, with large text, keyboard open, rotating orientation, address bar changes and signal loss.
4. Add a permitted captured disruption for the final recorded demo. The present replay is synthetic, clearly labelled and allowed by the brief, but must not be described as a real historical incident.
5. If claiming full proactive delivery, implement and verify a server scheduler and Web Push with opt-in. If claiming future rail works coverage, ingest reviewed official notices with effective windows; the existing closure demo alone is not that live service.

WebMCP hooks are optional and feature-detected. A supported WebMCP runtime was not available for their contract test; the ordinary interface does not depend on them.

## Section 3.3: optional extensions

The additional commuter value is advance crowd-aware planning and a resumable journey when connectivity fails. Both have running implementations and automated checks. No product AI model is claimed: deterministic geographic routing and explicit timing rules are appropriate for this bounded prototype and can be inspected without a paid model account. Forecasts are attributed to LTA rather than described as our predictions. Server-side push, island-wide routing and automatic in-transit rerouting remain outside the implemented scope.
