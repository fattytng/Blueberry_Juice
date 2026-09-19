# SmartComm — User Manual & Instruction Guide

> Your personal commute assistant for Singapore. Plan smarter. Travel easier.

---

## Table Of Contents

1. [What Is SmartComm?](#1-what-is-smartcomm)
2. [Getting Started](#2-getting-started)
3. [App Overview](#3-app-overview)
4. [The Today Tab](#4-the-today-tab)
5. [The My Commute Tab](#5-the-my-commute-tab)
6. [The Updates Tab](#6-the-updates-tab)
7. [Agenda Profiles](#7-agenda-profiles)
8. [Notifications](#8-notifications)
9. [Accessibility & Preferences](#9-accessibility--preferences)
10. [Live Data & Conditions](#10-live-data--conditions)
11. [Tips & Best Practices](#11-tips--best-practices)
12. [Troubleshooting](#12-troubleshooting)
13. [Tech Notes For Developers](#13-tech-notes-for-developers)

---

## 1. What Is SmartComm?

**SmartComm** is a mobile-first commute planner designed for Singapore public transport users. It helps you:

- Find the **best route** for your daily commute (MRT, bus, or express shuttle).
- Know **exactly when to leave** to arrive on time.
- Receive **real-time alerts** about train disruptions, crowd levels, and weather.
- Save your **regular journeys** as agenda profiles so you never have to re-enter your routes.
- Get **step-by-step directions** via push notifications — without needing to keep the app open.

SmartComm works directly in your phone's browser. No app download or installation is required.

---

## 2. Getting Started

### Step 1 — Open The App

Open your phone browser (Safari, Chrome, or Edge) and navigate to:

```
http://localhost:4173
```

> If you are on the same Wi-Fi as the host computer, replace `localhost` with your computer's local IP address (e.g., `http://192.168.1.5:4173`).

### Step 2 — Allow Notifications

When prompted, tap **Allow** to enable push notifications. This lets SmartComm send you step-by-step journey directions even when the app is in the background.

> You can also enable or disable notifications later in the **My Commute** tab under Notification Settings.

### Step 3 — Select Your Agenda

On the **Today** tab, you will see your saved agenda profiles at the top. Tap the relevant tab for your current journey (e.g., **Home To Work**) and the app will automatically load your route, departure time, and destination.

### Step 4 — Review Your Journey

SmartComm will display:
- A **map** showing your full route across Singapore.
- A **recommended route** card with departure time, arrival estimate, and travel duration.
- **Alternative route options** for comparison.

### Step 5 — Start Your Journey

Tap the **Start Journey** button on the recommendation card. SmartComm will begin sending you turn-by-turn notifications at each step of your journey.

---

## 3. App Overview

SmartComm has **three main tabs** at the bottom of the screen:

| Tab | Purpose |
|---|---|
| **Today** | Your live journey for today — map, recommended route, conditions |
| **My Commute** | Your saved agendas, preferences, accessibility settings, and notifications |
| **Updates** | All commute notifications and alerts received |

---

## 4. The Today Tab

This is the main screen you will use every day.

### Map View

At the top of the screen is a **full-width interactive map** of Singapore showing your active route. You can:
- Pinch to zoom in and out.
- Drag to pan around the map.
- See your walking segments, MRT line, and any shuttle bus routes colour-coded on the map.

### Agenda Switcher

Below the map, tap between your saved agenda tabs:
- **Home To Work** — Your weekday morning commute.
- **Work To Home** — Your weekday evening commute.
- **Weekend** — Your weekend journey (e.g., to visit family).

### Recommendation Card

The **Your Next Journey** card displays:
- **Recommended Route** — The best option based on current conditions.
- **Depart** — The suggested departure time.
- **Arrive** — The estimated arrival time range (e.g., `08:35 - 08:42`).
- **Duration** — Total travel time (e.g., `39 - 43 Min`).
- **Route Badge** — Colour-coded label showing the transport mode (e.g., `EWL`, `DTL`, `SHUTTLE`).

### Route Comparison

Below the recommendation, you will see **alternative route cards** for comparison. Each card shows:
- Route name and transport line.
- Estimated duration and arrival window.
- Whether the route is **Stair - Free**, **Rain - Sheltered**, or has a **Reserved Seat** (shuttle).

Tap any route card to select it as your active route. The map will update to highlight that route.

### Live Status

A **green pulsing dot** labelled **Live Transit Active** at the top of the page confirms that SmartComm is connected to real-time data feeds.

---

## 5. The My Commute Tab

This is where you manage all your personal settings and journey profiles.

### Your Agenda Profiles

View and switch between your saved journeys. Each agenda shows:
- **Origin** — Where you are travelling from.
- **Destination** — Where you are travelling to.
- **Departure Time** — Your usual departure time.
- **Latest Allowed Arrival** — The latest time you can arrive, plus buffer.
- **Active Days** — Which days this agenda applies (e.g., Mon - Fri).

### Preferences & Accessibility

Customise how SmartComm plans your routes:

| Setting | What It Does |
|---|---|
| **Stair - Free Access** | Prioritises routes with lifts and ramps — no stairs required. |
| **Rain - Sheltered Paths** | Favours covered walkways and sheltered connections where possible. |
| **Quiet & Low Crowding** | Avoids crowded trains and platforms during peak hours. |
| **Travel Priority** | Choose between **Fastest Route** or **Most Comfortable**. |
| **Latest Allowed Arrival** | Set your hard deadline so SmartComm ensures you are never late. |

### Notification Settings

| Setting | What It Does |
|---|---|
| **Enable Notifications** | Toggle push notifications on or off. |
| **Send Test Notification** | Sends a sample notification so you can confirm it is working. |

---

## 6. The Updates Tab

The **Updates** tab (also called **Commute Notifications**) shows a chronological log of all alerts and notifications sent to you, including:

- Journey step reminders (e.g., "Board the EWL at Tampines Station").
- Train disruption alerts.
- Crowd level warnings.
- Weather advisories affecting your walking segments.

If there are no recent notifications, the tab will show an **empty state** message.

> Notifications also appear on your phone's lock screen and notification centre — you do not need to keep the app open.

---

## 7. Agenda Profiles

SmartComm uses **agenda profiles** instead of single-user profiles. Each agenda is a saved journey for a specific purpose and time of day.

### Default Agendas

| Agenda | Route | Days | Depart |
|---|---|---|---|
| **Home To Work** | Tampines Central → One Raffles Place | Mon - Fri | 07:40 |
| **Work To Home** | One Raffles Place → Tampines Central | Mon - Fri | 18:15 |
| **Weekend Grandparents** | Tampines Central → Yew Tee | Sat - Sun | 10:00 |

### Switching Agendas

Tap any agenda tab on the **Today** screen or the **My Commute** screen to switch. The map, recommendation, and route options will all update immediately to reflect the selected agenda.

### Saved Preferences

Your selected agenda is saved to your device automatically. The next time you open SmartComm, it will restore your last active agenda.

---

## 8. Notifications

SmartComm uses your phone's built-in notification system to send you alerts **outside the app**.

### What Triggers A Notification?

| Event | Notification Sent |
|---|---|
| Journey started | "Your journey has begun. Walk to [Station]." |
| Approaching next step | "[Action] — e.g., Board EWL at Tampines." |
| Journey completed | "You have arrived at [Destination]. Great commute!" |
| Train disruption detected | "EWL disruption detected. SmartComm recommends switching to DTL." |
| High crowd level | "Platform crowding is high. Consider departing 5 minutes earlier." |
| Weather advisory | "Rain expected along your walking route. Sheltered path recommended." |

### How To Enable Notifications

1. Go to the **My Commute** tab.
2. Under **Notification Settings**, toggle **Enable Notifications** to on.
3. If your browser requests permission, tap **Allow**.
4. Tap **Send Test Notification** to confirm it works.

> Notifications require a secure connection (HTTPS or localhost). On a plain local network address (e.g., `http://192.168.x.x`), notifications may not be available depending on your browser.

---

## 9. Accessibility & Preferences

SmartComm is designed to support a wide range of commuter needs.

### Stair - Free Access

When enabled, SmartComm will only recommend routes that avoid stairs. This includes:
- MRT stations with functioning lifts.
- Walking paths that do not require staircases or underpasses without ramp access.

### Rain - Sheltered Paths

When enabled, SmartComm prioritises:
- Covered linkways between MRT stations and exits.
- Sheltered bus interchanges.
- Underground or sheltered walking segments.

### Quiet & Low Crowding

When enabled, SmartComm adjusts its route recommendation to avoid:
- Crowded train carriages (based on LTA crowd density data).
- Peak-hour bottlenecks at major interchanges.

### Latest Allowed Arrival

Set the **hard deadline** by which you must arrive. SmartComm will factor in a buffer and ensure its recommended departure time always gets you there on time. If real-time conditions threaten your deadline, you will be alerted immediately.

---

## 10. Live Data & Conditions

SmartComm connects to official Singapore data sources to give you accurate, real-time commute information.

| Source | What It Provides |
|---|---|
| **LTA DataMall** | Live train service alerts and crowd density by station |
| **data.gov.sg** | 2-hour weather nowcast for rain along your route |
| **OpenStreetMap** | Walking paths, MRT geometry, and station locations |

### When Data Is Unavailable

If live feeds cannot be reached (e.g., offline or no LTA key configured), SmartComm will:
- Show conditions as **Unknown** rather than assuming normal service.
- Continue to operate using offline geographic data and cached preferences.
- Still allow you to start and progress through a saved journey.

---

## 11. Tips & Best Practices

- **Set your Latest Allowed Arrival** for each agenda so SmartComm always plans around your real deadline.
- **Enable Stair - Free Access** if you have mobility needs or are carrying heavy luggage.
- **Use the Weekend agenda** for irregular trips — you can duplicate and rename agendas for new destinations.
- **Check the Updates tab** in the morning before leaving — it logs any overnight alerts about your usual route.
- **Tap the map** to see your full route geometry. Zooming in shows exact walking paths to station entrances.
- **Send a test notification** after installing to make sure alerts will reach your lock screen.

---

## 12. Troubleshooting

### The Map Is Blank

- Check your internet connection. The map tiles are loaded from OpenStreetMap.
- If you are offline, the route lines will still appear but background map tiles may not load.

### Notifications Are Not Arriving

- Go to **My Commute → Notification Settings** and check that **Enable Notifications** is toggled on.
- Check your phone's system settings to confirm the browser has notification permission.
- Try tapping **Send Test Notification** to test delivery.
- Notifications require HTTPS or localhost — they will not work over a plain `http://` LAN address on most browsers.

### The App Shows "Unknown" For Conditions

- This is expected when no LTA API key is configured, or when the data.gov.sg feed is outside its valid time window.
- Tap the **Refresh** button on the conditions section to retry the live data fetch.

### My Agenda Is Not Saving

- SmartComm saves agendas to your browser's local storage. If you cleared your browser data, your saved agendas will be reset to defaults.
- Make sure you are using the same browser and device each time.

### The App Does Not Load

- Ensure the server is running: open a terminal and run `npm start` from the project folder.
- Then open `http://localhost:4173` in your browser.

---

## 13. Tech Notes For Developers

| Component | Detail |
|---|---|
| **Frontend** | Vanilla HTML5 / CSS3 / JavaScript (ES2022+) — no build step required |
| **Map Library** | Leaflet.js v1.9.4 with OpenStreetMap tile layer |
| **Routing Engine** | Custom Dijkstra planner in `dist/planner.js` and `dist/geo.js` |
| **Live Data** | LTA DataMall API + data.gov.sg — proxied via Node.js `server.cjs` |
| **Offline Support** | Service Worker (`dist/sw.js`) + `localStorage` |
| **Notifications** | Web Notification API |
| **Typography** | Bierstadt / Aptos / Segoe UI |
| **iOS Wrapper** | Swift + WKWebView (`SmartCommApp.swift`) |

### Running The Server

```sh
npm start
```

Open `http://localhost:4173` in your browser.

### Enabling Live Train & Crowd Data

1. Obtain a free API key from [LTA DataMall](https://datamall.lta.gov.sg).
2. Copy `.env.example` to `.env`.
3. Set `LTA_ACCOUNT_KEY=your_key_here` in `.env`.
4. Restart the server with `npm start`.

### Running Tests

```sh
npm test
npm run check
```

### Project Structure

```
dist/index.html        — Main app interface
dist/styles.css        — Visual styling
dist/web.js            — UI controller and state management
dist/planner.js        — Route planning and scoring engine
dist/geo.js            — OSM walking graph and route geometry
dist/session.js        — Journey save and restore
dist/data/network.js   — Bundled Singapore OSM graph (1.3 MB)
dist/sw.js             — Service worker for offline support
server.cjs             — Node.js API proxy server
lib/feeds.cjs          — Live data feed normalisation
tests/                 — Unit tests
```

---

*SmartComm — Built for Singapore commuters. Designed to keep you on time, every time.*

