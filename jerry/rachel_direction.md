# Smart Commuter Companion — a possible direction for Rachel

Draft for discussion · 18 September 2026

Based on the [PS2 problem statement](../NebulaX-Hackathon-ProblemStatement/PS2/PS2_README.md), its [submission instructions](../NebulaX-Hackathon-ProblemStatement/PS2/submission/README.md), and the Singapore Government Design System (SGDS) pages linked below. Product choices, thresholds and example timings in this document are proposals, not validated results. No live transport integration or route timing has been tested for this draft.

## 1. My reading of the problem

Rachel travels from Tampines to Raffles Place on the EWL, usually leaves at 07:40, and needs to be at her desk by 08:45. She has followed the same routine for four years and does not open a transport app on a normal morning. A small delay is tolerable; a larger one threatens a meeting.

Her core need is: **“Watch my usual journey, interrupt me when my arrival is at risk, and tell me what to do while I can still act.”**

That means the product has to earn two kinds of trust: useful advice when something changes, and silence when nothing needs her attention. Counting how often she opens the app would be a poor measure of success. An ordinary morning with no alert can be a successful interaction.

The brief nevertheless requires a substantial working journey underneath that short message:

| Requirement from the brief | What it means for our Rachel version |
| --- | --- |
| Mobile-first web application | Works in a real phone browser; no native build or app store dependency. |
| Route planning and replanning | Accept origin, destination and time; provide usable walking and public transport legs; recalculate when conditions change. |
| Door-to-door coverage | Her deadline means arrival at her workplace, including the final walk and any agreed building-entry allowance. |
| OpenStreetMap geospatial base | Use OSM pedestrian geography meaningfully, with attribution, alongside transport and station-exit data. |
| Journey visualisation | Show the original route, affected segment and alternative, with crowding and comparable timing. |
| Planned and unplanned events | Warn about relevant future changes as well as faults happening now. |
| Personalised decision support | Recommend an action based on Rachel's deadline and preferences, not merely an EWL status. |
| Honest uncertainty and offline behaviour | Explain what is estimated, when data was checked, and what still works underground. |

Problem Fit is worth 40%, Technical Execution 35%, and Ease of Use 25%. This favours one convincing Rachel journey with working routing and a clear decision. The brief explicitly allows concentrating on one persona; cycling preferences and comprehensive accessibility routing can remain outside this initial scope.

## 2. Proposed product: SmartComm

The promise would be **“Your usual commute, watched for you.”**

Rachel sets up her routine once. SmartComm checks whether she can still reach work by her chosen time, compares feasible alternatives, and contacts her only when a change is worth acting on. When she opens an alert, the first screen answers three questions: what should I do, when will I arrive, and why?

The distinctive feature could be a **latest useful decision time**: the point after which an alternative stops helping. “Leave by 07:35” is more actionable than “Allow extra travel time.” We should derive that time from the route and its uncertainty, and show it as an estimate rather than a guarantee.

### Set up once

Collect home and workplace entrance locations, commute days, usual departure, arrival deadline, acceptable walking distance, and willingness to take a bus or transfer. Ask how early Rachel could realistically leave. Offer a simple way to skip tomorrow or pause monitoring while away.

The brief does not give her exact addresses or normal door-to-door duration. We must obtain those inputs or clearly label selected demo locations. We should not infer that a 07:40 departure gives her 65 minutes of spare time: 65 minutes is the entire available journey window.

Start with an explicit saved routine. Continuous location tracking and automatic routine learning add privacy and reliability work before they establish value. During a trip, a “I've left” action and an editable current stop can support replanning without assuming we know her location.

### An ordinary morning

Monitor the relevant corridor during an agreed window. If the journey remains comfortably within her deadline, send nothing. If Rachel chooses to open the app, show her usual departure, estimated arrival range, and last successful check.

### A morning that needs a change

Match an event to the sections and direction she will actually travel. Recalculate the usual route and feasible alternatives. If an action is needed, send a message in this form:

> Leave by [time]. Take [route]; reach work around [arrival range]. EWL disruption affects your usual journey.

The message must be populated from a calculated journey. A DTL-based alternative from Tampines is worth evaluating, but its destination station, walking leg, transfers and timing must be checked against Rachel's actual workplace before recommending it. A named line alone is not an executable route.

The expanded screen gives boarding instructions, transfer details, the final walk, and a short explanation of the trade-off. Offer one recommended route and at most one other useful alternative initially.

### A planned change

Check future notices against Rachel's next commute date and time. A closure that ends before her journey should not trigger an alert. If a planned event changes tomorrow's trip, notify her at an agreed evening time with tomorrow's recommended departure and route, then recheck before departure.

Road works and planned bus changes also matter when they affect a fallback. Scheduled rail works need an explicit ingestion path for official notices; the structured disruption segments alone are not a complete future works calendar. For the prototype, support reviewed notices with source, publication time, effective dates, affected segment and direction. Any injected notice must carry a simulation label.

## 3. When should we interrupt her?

Use a transparent rule-based policy first. The brief's five-minute and fifteen-minute examples express tolerance; they do not establish a universal numerical alert threshold.

For each candidate route, calculate a door-to-door arrival range using walking, waiting, travel, transfers and the final workplace leg. Compare the cautious end of that range with the deadline. If the data cannot support a meaningful range, explicitly mark the estimate uncertain instead of inventing precision.

| Situation | Proposed behaviour |
| --- | --- |
| Small delay; arrival remains comfortably before 08:45 | Stay quiet. |
| Usual route risks missing the deadline; a feasible alternative helps | Alert once with route, departure time and estimated arrival. |
| Leaving earlier preserves a simpler journey | Suggest it only within Rachel's stated earliest departure and with enough notice to act. |
| All feasible options arrive late | Say so; show the best available option and estimated lateness. |
| Official disruption affects her route, but duration is unknown | Explain the uncertainty and offer a verified bypass if available. |
| Event is on another segment, direction or irrelevant date | Do not alert. |
| Data becomes stale during the monitoring window | Show monitoring as unavailable; if timely advice is materially compromised, send one service-status notice rather than implying all is well. |

Rank viable options by meeting the deadline with a reasonable buffer, then predictability, transfers, walking and cost. In early versions, “predictability” should come from explicit uncertainty allowances and source quality, not an unsupported percentage probability of arriving on time.

Avoid repeated notifications for the same incident. Remember the last advice and only notify again if the action materially changes. Require a meaningful improvement before switching an accepted route; small ETA fluctuations should not send her back and forth between stations. Once she has departed, recalculate from her confirmed position rather than continuing to suggest an earlier departure from home.

Crowding and rain belong in the decision where they affect the journey. High station crowding may widen the boarding-time allowance. A bus with limited standing space may be a weaker fallback. Heavy rain may make an exposed walk slower or favour a sheltered path. These are estimation choices to validate; neither crowding categories nor a weather forecast directly supplies an exact delay in minutes.

## 4. What Rachel would see

Keep navigation to **Today**, **My commute**, and **Settings**. Route comparison and instructions sit inside Today.

The disrupted-journey screen should put the action first, followed by arrival, the reason, and a compact map comparing routes. Detailed instructions continue below. A text outline of the proposed hierarchy is:

```text
SmartComm                         Prototype
Today's commute                   Arrive by 08:45

[Action needed]
Leave by [time]. Take [recommended route].
Reach work [arrival range].
[Short reason this is better today]

[ View journey steps ]
Compare with usual route

[Map: usual route / affected section / alternative]
[Route labels, legend and OSM attribution]

Recommended: [arrival] · [walk] · [transfers]
Usual route: [arrival] · [additional delay]
Crowding: Moderate · Updated [time]
Source and estimate details
```

The map must communicate the comparison without requiring Rachel to pan around Singapore. Fit the relevant corridor, distinguish the affected portion with a pattern or explicit label, and use line names as well as colours. Show low, moderate or high crowding as a short label with an icon; unknown must be a separate state. Provide a textual journey equivalent for someone who cannot use the map.

### Applying the Singapore Government Design System

The current SGDS website introduces v3 with shared tokens, components and accessibility foundations. We should adopt a consistent version of those foundations and check the selected package during implementation. [SGDS introduction](https://designsystem.tech.gov.sg/get-started/)

| Design choice | Application to SmartComm |
| --- | --- |
| Typography | Use SGDS's Inter typeface and text hierarchy: readable regular body text, stronger headings, and prominent departure/arrival information. Keep body text around the documented 16px base, scalable with user settings. [Typography](https://designsystem.tech.gov.sg/foundations/typography) |
| Colour and surfaces | Use semantic tokens for backgrounds, text, actions and status. Start with a light canvas, dark readable text and restrained emphasis. Keep rail-line identity distinct from warning/success meaning. [Semantic colour](https://designsystem.tech.gov.sg/foundations/colour/semantic-colour) |
| Main action | Use a clear SGDS button for “View journey steps” or “Use this route”; make route comparison secondary. Preserve visible keyboard focus and descriptive labels. [Button](https://designsystem.tech.gov.sg/components/button) |
| Supporting detail | Put data sources and extended reasoning in an accordion if needed. Keep departure advice and critical uncertainty visible: SGDS advises against hiding essential information in accordions. [Accordion](https://designsystem.tech.gov.sg/components/accordion) |
| Reusable controls | Evaluate SGDS inputs, cards, badges and feedback components for setup and journey states, rather than inventing separate styles for each screen. [Component catalogue](https://designsystem.tech.gov.sg/components/accordion) |

My proposed interaction rules are generous touch targets, sentence-case action labels, short explanations, persistent critical alerts, and error messages that explain how to recover without losing form input. Test large text, screen-reader order, keyboard focus, sunlight readability, and one-thumb operation. Reusing components does not establish accessibility for the complete app.

There is an important distinction between adopting SGDS and claiming official status. SGDS describes its masthead as the official government identifier for .gov.sg services. This hackathon prototype should identify itself as a prototype and avoid presenting that banner as proof of government ownership. An authorised government deployment would follow the official masthead requirements. [Masthead guidance](https://designsystem.tech.gov.sg/components/masthead)

## 5. Data and routing approach

The endpoint details below come from [PS2 section 2.4](../NebulaX-Hackathon-ProblemStatement/PS2/PS2_README.md). Validate schemas and availability against the supplied API guide and live responses before implementation.

| Source | Role in the first version | Important handling |
| --- | --- | --- |
| `TrainServiceAlerts` | Official current rail disruption state and available mitigation | Parse every nested `AffectedSegments` entry and the separate `Message` array. Match stations and direction. `Status = 1` can include minor delays. |
| Free boarding and MRT shuttle fields | Add available mitigations to candidate journeys | Distinguish free boarding on ordinary buses from dedicated shuttles. Verify coverage, direction and usable timing; activation alone does not make an option fastest. |
| `PCDRealTime` and `PCDForecast` | Current and expected station crowding along candidate routes | Preserve timestamps, forecast intervals and `NA`; a forecast is not a live observation. |
| `v3/BusArrival` plus bus network data | Usable bus alternatives, next arrivals and occupancy | Incorporate `Load` when selecting a bus. A stop ETA does not establish the whole bus journey duration. |
| Road works, planned bus routes and reviewed official rail notices | Future constraints on Rachel's commute | Store effective dates and expiry; apply changes only during the journey's time window. |
| data.gov.sg nowcast/rainfall | Conditions affecting walking and alternatives | Match geography and time. The provided forecast JSON files are API specifications, not observed weather. |
| OSM, station exits and covered walkways | Door-to-door geography and walking legs | Route to actual entrances and crossings; display “© OpenStreetMap contributors” on maps and relevant derived views. |

Maintain canonical station, interchange and line identifiers. The brief warns that alert and crowding endpoints disagree on some line codes, including extension handling. Also, the supplied 208 rail geometries are footprints, not station points or a transport network; their null CRS and weak line classification need resolving before spatial joins. Their planning provenance means they should not be treated as proof that every feature is an operating station.

For a hackathon, I would start with a supported Tampines–CBD corridor and enough rail, bus and pedestrian alternatives to make replanning real. Its planner must respond to changed origin/destination/time within that coverage, not return a fixed demonstration route. State the coverage boundary clearly.

Evaluate OneMap, identified in the brief as a public-transport routing option, for candidate generation. Use OSM pedestrian data and the OSM map as the geographic foundation, with authoritative station-exit overlays. Verify whether candidate generation can avoid a disrupted segment; simply rejecting a bad candidate may leave us with no alternative. If necessary, construct a small, validated transit graph for the supported corridor, with sourced or explicitly estimated service timings.

OSM geometry and a map renderer alone will not supply reliable train schedules, waits or transfers. Establish those timing inputs early. Compare complete journeys, including all walking and transfer penalties, and retain provenance for each estimate. Cache geospatial extracts; use a permitted tile provider or bundled data and respect the brief's public tile/Overpass restrictions.

## 6. Making “proactive” work in a web app

The crucial feasibility test is whether Rachel receives useful advice with the browser closed. Monitoring should run on a server against her saved commute window; an open page's timer is not the product's monitoring mechanism.

A small implementation could have a mobile web client, a backend holding API credentials, cached feed adapters, a routing/decision service, a scheduled monitoring worker, and a notification service. Fetch shared feeds once and evaluate affected routines, rather than making identical upstream calls for every user. Keep recorded source time separate from fetch time and use feed-specific freshness limits.

Use Web Push where available, with explicit opt-in. Apple's WebKit documents support for Home Screen web apps on iOS/iPadOS starting with 16.4, with permission requested after a user interaction. Installation and notification setup must therefore be explained and tested on the actual target phones. [WebKit Web Push documentation](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)

The ordinary browser experience should still support planning and show notification availability honestly. If permissions are denied or unsupported, it cannot promise to interrupt Rachel while closed. Prove this delivery path early; an in-app alert demonstration alone would leave her central need unresolved. Expire time-sensitive notifications so delayed delivery cannot present a missed departure as current advice.

Before travel, cache the accepted itinerary, walking instructions, route geometry and last advice. Offline, keep those usable and show “Offline — last checked [time].” Cache map assets only where their provider permits it. On reconnect, refresh before claiming the route is current. Do not silently replace an accepted journey; explain any material change.

For privacy, propose storing only the routine, notification subscription and minimal decision history needed for the service. Avoid raw movement history by default. Document server location and retention before launch, provide pause/delete controls, and keep exact home/work details out of lock-screen messages. API keys stay server-side and out of Git. Telegram material, if used, should remain reference material under the brief's rules, not become an unapproved scraped live feed.

## 7. A build and demonstration we could defend

I would implement in this order:

1. **Resolve feasibility:** validate data access, a complete Rachel route and an alternative, timing sources, and a push notification on a closed real phone browser/Home Screen app.
2. **Build the journey:** saved routine, normal door-to-door route, OSM map, arrival range, readable journey steps and offline copy.
3. **Build the decision:** segment/direction matching, route recalculation, deadline comparison, one recommendation, suppression of irrelevant and repeated alerts.
4. **Add changing conditions:** a planned event, crowding and rain scenarios that genuinely alter route ranking or timing when relevant.
5. **Polish and package:** SGDS styling and interactions, actual-phone testing, labelled replay mode, and a clean-machine setup check.

Do not depend on a real disruption happening during judging. Use a captured real incident where available and permitted, with source and original timestamps. Label all replay and injected conditions prominently, including on the map and advice. Keep live and replay modes separate. A synthetic fallback is acceptable under the brief when labelled, but should not be described as a historical event.

An illustrative timing fixture can make the policy testable: suppose the usual journey from a 07:40 departure has a cautious arrival of 08:35. A five-minute increase still fits; fifteen minutes would move that to 08:50. If a validated alternative from 07:35 arrives between 08:30 and 08:40, it may be worth recommending while that departure is still achievable. These numbers are deliberately synthetic test inputs, not measured Tampines–Raffles Place travel times.

Demonstrate these behaviours:

| Scenario | Evidence to show |
| --- | --- |
| Normal service or tolerable delay | No unnecessary push; the usual route remains available. |
| Relevant EWL disruption before departure | One actionable alert; a revised route avoids the affected segment; map and text agree. |
| Unrelated segment or opposite direction | No Rachel alert. |
| Planned event tomorrow | Advice arrives beforehand and only applies during the event's effective window. |
| Crowded fallback or rain-exposed walk | Recommendation or arrival range changes, with an intelligible reason. |
| Duplicate update or small ETA fluctuation | No repeated interruption or route oscillation. |
| No timely alternative | Honest lateness advice. |
| Lost signal, stale feed or denied notifications | Accurate availability state; cached steps remain usable where applicable. |

Measure alert usefulness and missed deadline-risk cases against a small labelled scenario set; include its size and limitations. Have people identify the next action on a real phone, and observe whether they can follow the full journey. Record measured processing and notification delivery times separately. Replay can prove decision behaviour; it cannot establish real-world punctuality or calibrated arrival probabilities.

Package the eventual application with reproducible setup commands, environment variable names, `WRITEUP.md`, a linked short demo recording, and labelled fixtures that can run without paid services. Live mode's key requirements should be explicit. These are future implementation deliverables; this document is the proposed direction.

## 8. Decisions to validate before committing to the build

- Rachel's exact endpoints, normal journey duration, earliest feasible departure, walking tolerance and acceptable transfers.
- Whether she will complete Home Screen/notification setup, and what silence should mean if monitoring fails.
- Whether the available routing and timing data support an alternative that actually improves this corridor.
- How planned rail notices can be obtained and maintained reliably through permitted sources.
- Which uncertainty allowance and alert policy users find useful without creating fatigue.

My recommendation is to commit first to **a dependable saved-commute monitor that produces one explainable, executable alternative**. AI is optional in the brief. A later model could help structure free-text planned notices, but dates, affected segments and mitigation must be validated, and route validity and alert decisions should remain inspectable. The first version succeeds when Rachel can trust both the interruption and the quiet mornings.
