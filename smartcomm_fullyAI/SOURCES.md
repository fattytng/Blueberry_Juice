# Data provenance and licences

## OpenStreetMap

The application bundles a transformed OSM extract in `dist/data/network.js`. That data and its derived walking/rail geometries are made available under the **Open Data Commons Open Database Licence (ODbL) 1.0**. Attribution appears on the map and derived written directions. See [OpenStreetMap copyright and licence](https://www.openstreetmap.org/copyright) and [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/).

Retrieved on 18 September 2026 through the official OSM API:

- [Tampines endpoint extract](https://www.openstreetmap.org/api/0.6/map?bbox=103.94,1.348,103.95,1.358)
- [CBD endpoint extract](https://www.openstreetmap.org/api/0.6/map?bbox=103.844,1.275,103.858,1.289)
- [City-bound EWL route relation 2312796](https://www.openstreetmap.org/relation/2312796)
- [Bukit Panjang-bound DTL route relation 7981642](https://www.openstreetmap.org/relation/7981642)

The exact fetch URLs and timestamp are also embedded in the extract's metadata. It contains 9,702 highway-associated nodes, 3,521 highway ways, and 1,676 building/water/park polygons, before routing filters. Not every highway is eligible for walking. The implemented rail segments are Tampines–Raffles Place and Tampines–Downtown. Background street detail is intentionally limited to the two endpoint areas.

The data is cached and served locally. The browser does not request public OSM tiles or query Overpass. No bulk public tile downloads occur. Earlier failed Overpass requests were not used as data.

To refresh, save responses from the four embedded API URLs as `/private/tmp/smartcomm-tampines.osm`, `smartcomm-cbd.osm`, `smartcomm-ewl.osm` and `smartcomm-dtl.osm`. Run `npm ci`, then `python3 scripts/build-osm.py`. This is an occasional maintainer operation, not part of normal startup. Respect OSM API usage limits.

## Official conditions

- [data.gov.sg two-hour forecast API](https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast): fetched server-side without a key, cached for two minutes, matched to the selected departure's valid period. Only Tampines and City forecasts are relevant to the supported corridor.
- [LTA DataMall](https://datamall.lta.gov.sg): `TrainServiceAlerts`, `PCDRealTime?TrainLine=EWL/DTL` and `PCDForecast?TrainLine=EWL/DTL`. Requires a free AccountKey supplied in local `.env`. Alerts are cached for one minute; crowd observations for ten minutes; forecasts for one hour (the upstream publication frequency is daily). Usage must comply with DataMall terms. The implementation follows the supplied PS2 brief and LTA API guide v6.8, section 2.25 for forecasts. Authenticated observations, alerts and forecast response shapes were verified on 18 September 2026. Forecasts are matched to the boarding station and their actual dated half-hour intervals.

Missing configuration, unavailable feeds, expired observations and stale cached data are explicitly distinguished from normal service. The official feed's message list and free-bus/shuttle fields are exposed in Sources & advisories; shuttles are not presented as calculated routes without service/timing data.

## Replay and timing

All replay events, including the closure window and extra delay minutes, are **synthetic injected test conditions**. They are not captured historical incidents. Replay labels remain visible in the interface and updates. Do not describe them as live or historical.

OSM supplies geographic geometry, not official transit schedules. Rail and waiting times are transparent engineering estimates. Formulae and uncertainty assumptions are in `WRITEUP.md`; no measured accuracy or on-time probability is claimed.

## Software and design

- Leaflet **1.9.4**, downloaded from npm and vendored in `dist/vendor/leaflet`. The upstream BSD-2-Clause licence is included at `dist/vendor/leaflet/LICENSE`.
- Visual direction references the [Singapore Government Design System](https://designsystem.tech.gov.sg), especially [accordion guidance](https://designsystem.tech.gov.sg/components/accordion), [foundations](https://designsystem.tech.gov.sg/foundations/) and [typography](https://designsystem.tech.gov.sg/foundations/typography) and [semantic colour](https://designsystem.tech.gov.sg/foundations/colour/semantic-colour). Implementation uses semantic HTML and custom CSS rather than the SGDS component package. This is not an official government service or a claim of SGDS certification.
