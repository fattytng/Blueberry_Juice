(() => {
  'use strict';
  const E = window.SmartCommEngine, G = window.SmartCommGeo, $ = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const ACRONYMS = new Set(['EWL', 'DTL', 'MRT', 'LRT', 'CBD', 'PUB', 'LTA', 'SGT', 'ETA', 'AM', 'PM', 'SGDS', 'OSM', 'ODBL', 'HUD', 'CTA', 'MBFC', 'NSL', 'NEL', 'CCL', 'TEL', 'WAB', 'SEA', 'SDA', 'LSD', 'SD', 'DD', 'BD']);
  function toTitleCase(str) {
    if (!str) return '';
    return String(str).replace(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/g, w => {
      const upper = w.toUpperCase();
      if (ACRONYMS.has(upper)) return upper;
      return w.charAt(0).toUpperCase() + w.slice(1);
    });
  }

  const paths = {
    home: '<path d="m3 10 9-7 9 7v10H3zM9 20v-7h6v7"/>',
    route: '<circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M9 6h7a4 4 0 0 1 0 8H8a4 4 0 0 0 0 8"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    train: '<rect x="5" y="3" width="14" height="15" rx="3"/><path d="M5 10h14M8 21l3-3m5 3-3-3M9 14h.01M15 14h.01"/>',
    rain: '<path d="M6 15a5 5 0 1 1 1-10 6 6 0 0 1 11 3 4 4 0 1 1 0 8M8 18l-1 3m6-3-1 3m6-3-1 3"/>',
    people: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4M17 4a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5v2"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    shield: '<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6zM8 12l3 3 5-6"/>'
  };
  const icon = n => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[n] || paths.info}</svg>`;
  document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));

  const S = window.SmartCommSession;
  let preferences = { ...E.defaults }, storage = true;
  try {
    const saved = JSON.parse(localStorage.getItem('smartcomm.web.preferences') || 'null');
    if (saved) preferences = E.validate(saved);
  } catch { storage = false; }

  let scenario = 'live', view = 'today', result, snapshot = null, feedLoading = false, feedError = '', active = null, activePlan = null, selectedRoute = null, map = null, picking = null, updates = [], toastTimer, dialogTrigger, notifying = false, mapFocus = 'all';

  try {
    snapshot = JSON.parse(localStorage.getItem('smartcomm.lastFeeds') || 'null');
    if (snapshot) {
      for (const f of [snapshot.weather, snapshot.rail, ...Object.values(snapshot.crowd || {}), ...Object.values(snapshot.forecast || {})]) {
        if (f) f.status = 'stale';
      }
    }
    const saved = S.restore(localStorage);
    if (saved) {
      active = saved.record;
      activePlan = saved.plan;
      preferences = active.preferences;
      scenario = active.scenario;
    }
  } catch {}

  const seen = new Set();
  const range = r => `${E.clock(r.arrivalMin)} - ${E.clock(r.arrivalMax)}`;
  const shownRoute = () => result.routes.find(r => r.id === (active?.route || selectedRoute)) || result.recommendation;
  const prettyDate = () => new Date(preferences.journeyDate + 'T12:00:00+08:00').toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Singapore' });

  function save() {
    try {
      localStorage.setItem('smartcomm.web.preferences', JSON.stringify(preferences));
      storage = true;
    } catch { storage = false; }
  }

  function clearActive() {
    active = null;
    activePlan = null;
    try { S.persist(localStorage, null); } catch {}
  }

  function persistActive() {
    try {
      if (!S.persist(localStorage, active)) toast('Could Not Save Journey Offline. Keep Page Open.');
    } catch { toast('Keep Page Open To Retain Active Journey.'); }
  }

  function toast(text) {
    clearTimeout(toastTimer);
    $('#toast').textContent = toTitleCase(text);
    $('#toast').classList.add('show');
    toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 4000);
  }

  function instruction(r) {
    if (!r) return 'No Route Meets All Constraints';
    if (r.late) return `Take ${r.code}; Arrival May Be Late`;
    return `Leave At ${E.clock(r.leave)} · Take The ${r.code}`;
  }

  function recalc(record = true) {
    try {
      result = active && activePlan ? activePlan : E.plan(preferences, scenario, snapshot);
    } catch (error) {
      toast(error.message);
      return false;
    }
    const r = result.recommendation;
    const key = JSON.stringify([scenario, preferences.journeyDate, result.origin.coord, result.destination.coord, r?.id, r?.leave, r?.max, r?.blocked, result.stale]);
    if (record && !active && !feedLoading && result.needsAlert && !seen.has(key)) {
      seen.add(key);
      const title = toTitleCase(instruction(r));
      const text = r ? `Arrive ${result.destination.short} Around ${range(r)}. ${toTitleCase(r.explanation)}` : 'Try Adjusting Walking Limit Or Select Another Nearby Entrance.';
      updates.unshift({ title, text, date: new Date().toISOString(), mode: scenario === 'live' ? 'Official Feeds' : 'Demo Scenario' });
      updates = updates.slice(0, 15);

      if (notifying && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification((scenario === 'live' ? 'SmartComm' : 'SmartComm Demo') + ': ' + title, {
            body: text,
            tag: 'smartcomm-journey'
          });
        } catch {}
      }
    }
    render();
    $('#replan-status').textContent = instruction(r) + (r ? ' Estimated Arrival ' + range(r) : '');
    return true;
  }

  function reasonFor(r) {
    if (r.blocked) return 'Affected Rail Section Blocked · Alternative Route Selected';
    if (r.walkExceeded) return `Route Exceeds Your ${preferences.maxWalk} Min Walking Limit`;
    if (r.late) return result.recommendation?.late ? `Departure May Miss ${preferences.deadline} · Allow More Buffer` : `This Alternative May Miss ${preferences.deadline}`;
    if (scenario === 'delay' && r.id === 'dtl') return 'Avoids EWL Delay Between Paya Lebar And Bugis';
    if (scenario === 'planned' && r.id === 'dtl' && result.routes[0].blocked) return 'Bypasses Scheduled EWL Track Maintenance';
    if (r.rain) return `Includes ${r.rain} Extra Min For Walking In Rain`;
    if (r.crowd === 'High') return 'Extra Boarding Buffer Included For High Station Crowding';
    if (r.stepFree) return 'Step-Free Paths Prioritised · Avoiding Stairs And Steps';
    if (result.stale) return 'Provisional Schedule · Check Live Feeds Before Leaving';
    return r.id === 'ewl' ? 'Your Usual Fast Route Works Smoothly' : 'Balances Punctual Arrival With Lower Crowding';
  }

  function personaSelector() {
    const activePersona = preferences.persona || 'rachel';
    return `
      <div class="persona-segmented-control" role="group" aria-label="Commuter Profiles">
        <button class="persona-tab ${activePersona === 'rachel' ? 'active' : ''}" data-action="set-persona" data-persona="rachel" aria-pressed="${activePersona === 'rachel'}">
          <span class="persona-badge">⚡</span>
          <span class="persona-meta">
            <strong>Rachel</strong>
            <small>Fast & Punctual</small>
          </span>
        </button>
        <button class="persona-tab ${activePersona === 'arjun' ? 'active' : ''}" data-action="set-persona" data-persona="arjun" aria-pressed="${activePersona === 'arjun'}">
          <span class="persona-badge">🍃</span>
          <span class="persona-meta">
            <strong>Arjun</strong>
            <small>Comfort & Shelter</small>
          </span>
        </button>
        <button class="persona-tab ${activePersona === 'mdmLim' ? 'active' : ''}" data-action="set-persona" data-persona="mdmLim" aria-pressed="${activePersona === 'mdmLim'}">
          <span class="persona-badge">♿</span>
          <span class="persona-meta">
            <strong>Mdm Lim</strong>
            <small>Step-Free & Lifts</small>
          </span>
        </button>
      </div>
    `;
  }

  function horizontalMapCard() {
    return `
      <section class="horizontal-map-card" aria-label="Interactive Transit Map">
        <div class="map-bar-top">
          <div class="map-corridor-title">
            <span class="corridor-pulse" aria-hidden="true"></span>
            <strong>Tampines ➔ CBD Transit Corridor</strong>
          </div>
          <div class="map-views-pill" aria-label="Map Views">
            <button class="map-pill-btn ${mapFocus === 'all' ? 'active' : ''}" data-action="map-focus" data-focus="all" aria-pressed="${mapFocus === 'all'}">Full Corridor</button>
            <button class="map-pill-btn ${mapFocus === 'origin' ? 'active' : ''}" data-action="map-focus" data-focus="origin" aria-pressed="${mapFocus === 'origin'}">Start Walk</button>
            <button class="map-pill-btn ${mapFocus === 'destination' ? 'active' : ''}" data-action="map-focus" data-focus="destination" aria-pressed="${mapFocus === 'destination'}">End Walk</button>
          </div>
        </div>
        <div id="journey-map" role="region" aria-label="OpenStreetMap Transit Map"></div>
        <div class="map-bar-bottom">
          <div class="map-legend-pills">
            <span class="legend-pill ewl"><i class="dot ewl-dot"></i> EWL</span>
            <span class="legend-pill dtl"><i class="dot dtl-dot"></i> DTL</span>
            <span class="legend-pill delay"><i class="dot delay-dot"></i> Disruption</span>
            <span class="legend-pill walk"><i class="dot walk-dot"></i> Walk</span>
          </div>
          <div class="map-endpoint-actions">
            <button class="map-link-btn" data-action="pick" data-kind="origin">Change Start</button>
            <span class="dot-sep">·</span>
            <button class="map-link-btn" data-action="pick" data-kind="destination">Change Destination</button>
          </div>
        </div>
        <p id="map-message" class="map-message" role="status" hidden></p>
      </section>
    `;
  }

  function liveStatusStrip() {
    const s = result.scenario, r = shownRoute(), rail = snapshot?.rail;
    const isLive = scenario === 'live';

    let trainTitle = 'Normal Service';
    let trainState = 'ok';
    if (scenario === 'delay') {
      trainTitle = 'EWL Delay · DTL Active';
      trainState = 'warn';
    } else if (scenario === 'planned') {
      trainTitle = 'Planned Track Works';
      trainState = 'warn';
    } else if (isLive && rail?.status === 'ok') {
      if (rail.data.Status === 2) {
        trainTitle = 'Rail Advisory Active';
        trainState = 'warn';
      } else {
        trainTitle = 'Normal Train Service';
        trainState = 'ok';
      }
    } else if (scenario === 'offline') {
      trainTitle = 'Offline Mode';
      trainState = 'muted';
    }

    let weatherTitle = 'Fair Weather';
    let weatherState = 'ok';
    if (scenario === 'rain' || r?.rain) {
      weatherTitle = `Rain (+ ${r?.rain || 2} Min Walk)`;
      weatherState = 'warn';
    }

    let crowdTitle = `${r?.crowd || 'Low'} Crowd`;
    let crowdState = r?.crowd === 'High' ? 'warn' : 'ok';

    let accessTitle = preferences.stepFree ? 'Step-Free Verified' : 'Standard Access';
    let accessState = preferences.stepFree ? 'ok' : 'muted';

    return `
      <div class="live-status-strip" role="region" aria-label="Live Commute Status">
        <div class="hud-item ${trainState}" data-action="sources" tabindex="0" role="button" aria-label="Train Status: ${trainTitle}">
          <span class="hud-icon">${icon('train')}</span>
          <div class="hud-text">
            <span class="hud-label">Train Service</span>
            <strong class="hud-val">${toTitleCase(trainTitle)}</strong>
          </div>
        </div>
        <div class="hud-item ${weatherState}" data-action="sources" tabindex="0" role="button" aria-label="Weather: ${weatherTitle}">
          <span class="hud-icon">${icon('rain')}</span>
          <div class="hud-text">
            <span class="hud-label">Weather</span>
            <strong class="hud-val">${toTitleCase(weatherTitle)}</strong>
          </div>
        </div>
        <div class="hud-item ${crowdState}" data-action="sources" tabindex="0" role="button" aria-label="Station Crowd: ${crowdTitle}">
          <span class="hud-icon">${icon('people')}</span>
          <div class="hud-text">
            <span class="hud-label">Station Crowd</span>
            <strong class="hud-val">${toTitleCase(crowdTitle)}</strong>
          </div>
        </div>
        <div class="hud-item ${accessState}" data-action="edit" tabindex="0" role="button" aria-label="Accessibility: ${accessTitle}">
          <span class="hud-icon">${icon('shield')}</span>
          <div class="hud-text">
            <span class="hud-label">Accessibility</span>
            <strong class="hud-val">${toTitleCase(accessTitle)}</strong>
          </div>
        </div>
      </div>
    `;
  }

  function recommendation() {
    const r = shownRoute();
    if (!r) {
      return `
        <article class="card recommendation-card warning-card">
          <div class="rec-top-row">
            <span class="status-pill warning">No Matching Route</span>
          </div>
          <h2>Adjust Your Journey Constraints</h2>
          <p class="reason-text">All Available Routes Exceed Your ${preferences.maxWalk} Min Walking Limit Or Are Closed.</p>
          <button class="primary-btn full-width" data-action="edit">Review Journey Settings</button>
        </article>
      `;
    }

    const isManual = selectedRoute && r.id !== result.recommendation?.id;
    const isCalm = !result.changed && !result.stale;
    const statusText = active ? 'Journey Saved Offline' :
      isManual ? 'Selected Alternative Route' :
      feedLoading ? 'Checking Live Feeds' :
      result.stale ? 'Provisional Plan · Recheck Before Leaving' :
      r.late ? 'Arrival At Risk' :
      isCalm ? 'Your Usual Route Works Smoothly' : 'Recommended Optimal Route';

    const nextStep = active ? E.steps(result, r)[active.step] : null;
    const timeRange = `${E.clock(r.arrivalMin)} - ${E.clock(r.arrivalMax)}`;

    return `
      <article class="card recommendation-card ${r.late ? 'warning-card' : ''}">
        ${active ? `<div class="active-badge-bar"><span>Active Trip · ${r.code}</span><span>Step ${active.step + 1} Of 4</span></div>` : ''}
        
        <div class="rec-top-row">
          <div class="rec-status-badge">
            <span class="status-dot ${r.late ? 'red' : 'green'}"></span>
            <span class="status-text">${toTitleCase(statusText)}</span>
          </div>
          <span class="line-badge ${r.id}">${r.code}</span>
        </div>

        <div class="rec-main-times">
          <div class="time-block">
            <span class="time-caption">Leave At</span>
            <strong class="time-display departure">${E.clock(r.leave)}</strong>
          </div>
          <div class="time-arrow" aria-hidden="true">➔</div>
          <div class="time-block">
            <span class="time-caption">Estimated Arrival</span>
            <strong class="time-display arrival">${timeRange}</strong>
          </div>
          <div class="time-target">
            <span>Target Deadline</span>
            <strong>${preferences.deadline}</strong>
          </div>
        </div>

        <div class="rec-reason-bar">
          <p class="reason-text">${active ? `Step ${active.step + 1} Of 4: <strong>${esc(toTitleCase(nextStep.title))}</strong>` : esc(toTitleCase(reasonFor(r)))}</p>
        </div>

        <div class="rec-stats-row">
          <div class="stat-pill">
            <span class="stat-icon">${icon('train')}</span>
            <span><strong>${r.min} - ${r.max} Min</strong> Transit</span>
          </div>
          <div class="stat-pill">
            <span class="stat-icon">🚶</span>
            <span><strong>${r.walk} Min</strong> Walk</span>
          </div>
          <div class="stat-pill">
            <span class="stat-icon">🔄</span>
            <span>Direct · No Transfers</span>
          </div>
          ${preferences.stepFree ? `
          <div class="stat-pill step-free">
            <span class="stat-icon">♿</span>
            <span>Step-Free Verified</span>
          </div>` : ''}
        </div>

        <div class="rec-action-group">
          <button class="primary-btn full-width" data-action="${active ? 'advance' : 'start'}" data-route="${r.id}" ${r.blocked || r.walkExceeded ? 'disabled' : ''}>
            ${active ? (active.step === 3 ? 'Finish Journey' : 'Next Step') : 'Start This Journey'} ${icon('arrow')}
          </button>
          <div class="rec-secondary-actions">
            <button class="sub-btn" data-action="${active ? 'end' : 'why'}">${active ? 'End Journey' : 'Why This Route?'}</button>
            <button class="sub-btn" data-action="journey" data-route="${r.id}">All Directions</button>
            <button class="sub-btn" data-action="edit">Edit Journey</button>
          </div>
        </div>
      </article>
    `;
  }

  function comparison() {
    const current = shownRoute();
    return `
      <section class="card route-comparison-card" aria-labelledby="compare-title">
        <div class="card-header-compact">
          <h2 id="compare-title">Compare Alternative Routes</h2>
          <span class="header-meta">Door To Door</span>
        </div>
        <div class="route-option-grid">
          ${result.routes.map(r => {
            const isSelected = r.id === current?.id;
            const isRec = r.id === result.recommendation?.id;
            const timeRange = r.blocked ? 'Service Blocked' : `${E.clock(r.leave)} Leave · ${E.clock(r.arrivalMin)} - ${E.clock(r.arrivalMax)} Arrival`;
            return `
              <button class="route-choice-card ${isSelected ? 'selected' : ''} ${r.blocked ? 'disabled' : ''}" data-action="select-route" data-route="${r.id}" aria-pressed="${isSelected}" ${active ? 'disabled' : ''}>
                <div class="choice-top">
                  <span class="line-badge ${r.id}">${r.code}</span>
                  <strong class="choice-name">${toTitleCase(r.name)}</strong>
                  ${isRec ? '<span class="rec-pill">★ Recommended</span>' : ''}
                </div>
                <div class="choice-times">
                  <span class="time-line">${timeRange}</span>
                  <span class="duration-badge ${isRec ? 'highlight' : ''}">${r.blocked ? 'Affected' : `${r.min} - ${r.max} Min`}</span>
                </div>
                <div class="choice-bottom">
                  <span><strong>${r.walk} Min</strong> Walk · <strong>${toTitleCase(r.crowd)}</strong> Crowd</span>
                  <span class="diff-tag">${r.walkExceeded ? 'Over Walk Limit' : r.late ? `+ ${r.late} Min Late` : r.blocked ? 'Closed' : 'On Schedule'}</span>
                </div>
              </button>
            `;
          }).join('')}
        </div>
      </section>
    `;
  }

  function itinerary() {
    const r = shownRoute();
    if (!r) return '';
    const allSteps = E.steps(result, r);
    return `
      <section class="card itinerary-card" aria-labelledby="itinerary-title">
        <div class="card-header-compact">
          <h2 id="itinerary-title">${active ? 'Active Journey Steps' : 'Turn-By-Turn Steps'}</h2>
          <span class="header-meta">${r.code} · 4 Stages</span>
        </div>
        <ol class="steps-list">
          ${allSteps.map((s, i) => `
            <li class="step-row ${active && i === active.step ? 'current' : active && i < active.step ? 'done' : ''}">
              <div class="step-marker">
                <span class="step-num">${active && i < active.step ? '✓' : i + 1}</span>
              </div>
              <div class="step-info">
                <div class="step-header">
                  <strong>${esc(toTitleCase(s.title))}</strong>
                  <span class="step-timestamp">${esc(toTitleCase(s.time))}</span>
                </div>
                <p class="step-desc">${esc(toTitleCase(s.detail))}</p>
              </div>
            </li>
          `).join('')}
        </ol>
      </section>
    `;
  }

  function commuteCard() {
    return `
      <article class="card card-pad">
        <div class="card-header-compact">
          <h2>Your Commute Routine</h2>
          <button class="sub-btn" data-action="edit">Edit Routine</button>
        </div>
        <div class="journey-points">
          <div class="journey-point">
            <span>Origin (Home)</span>
            <strong>${esc(toTitleCase(result.origin.name))}</strong>
          </div>
          <div class="journey-point">
            <span>Destination (Work)</span>
            <strong>${esc(toTitleCase(result.destination.name))}</strong>
          </div>
        </div>
        <div class="commute-time-row">
          <div><span>Departure</span><strong>${preferences.departure}</strong></div>
          <div><span>Target Deadline</span><strong>${preferences.deadline}</strong></div>
          <div><span>Earliest Leave</span><strong>${preferences.earliest}</strong></div>
        </div>
        <div class="chips-row">
          <span>${preferences.buffer} Min Buffer</span>
          <span>${preferences.maxWalk} Min Max Walk</span>
          ${preferences.shelter ? '<span>Covered Paths Preferred</span>' : ''}
          ${preferences.stepFree ? '<span>Step-Free Routing Active</span>' : ''}
        </div>
      </article>
    `;
  }

  function render() {
    const focused = document.activeElement;
    const focusKey = focused?.dataset?.action ? { action: focused.dataset.action, route: focused.dataset.route, focus: focused.dataset.focus } : null;
    const mapState = map ? { center: map.getCenter(), zoom: map.getZoom() } : null;
    if (map) { map.remove(); map = null; }

    // Update profile in header
    const currentPersona = E.personas[preferences.persona] || E.personas.rachel;
    $('#profile-name').textContent = toTitleCase(currentPersona.name);
    $('#profile-avatar').textContent = currentPersona.icon || currentPersona.name[0];

    // Notification bell button state
    const notifyBtn = $('.header-notify-btn');
    if (notifyBtn) {
      notifyBtn.classList.toggle('active', notifying);
      notifyBtn.title = notifying ? 'Notifications Active' : 'Enable Notifications';
    }

    $('#today-view').innerHTML = `
      ${scenario !== 'live' ? `
      <div class="replay-banner">
        <span>${icon('info')}<strong>Demo Scenario Active</strong> · ${esc(toTitleCase(result.scenario.name))}</span>
        <button class="text-button" data-action="live">Use Official Feeds</button>
      </div>` : ''}
      ${!navigator.onLine ? '<div class="offline-banner">You Are Offline. Saved Routes Are Available.</div>' : ''}
      
      ${personaSelector()}
      ${horizontalMapCard()}
      ${liveStatusStrip()}
      
      <div class="journey-layout">
        ${recommendation()}
        ${comparison()}
        ${itinerary()}
      </div>
    `;

    $('#commute-view').innerHTML = `
      <div class="settings-layout">
        ${commuteCard()}
        <article class="card card-pad">
          <div class="card-header-compact">
            <h2>Preferences & Accessibility</h2>
            <button class="sub-btn" data-action="edit">Edit</button>
          </div>
          ${[
            ['Earliest Allowed Departure', preferences.earliest],
            ['Arrival Buffer', preferences.buffer + ' Minutes'],
            ['Maximum Walking Distance', preferences.maxWalk + ' Minutes'],
            ['Route Optimization Priority', { reliable: 'Punctual Arrival', walking: 'Less Walking', comfort: 'Lower Crowding' }[preferences.priority] || 'Punctual Arrival'],
            ['Sheltered Walkways', preferences.shelter ? 'Preferred Where Mapped' : 'Standard'],
            ['Step-Free Accessibility', preferences.stepFree ? 'Enabled · Avoid Stairs' : 'Standard Routes']
          ].map(([a, b]) => `
            <div class="setting-row">
              <strong>${toTitleCase(a)}</strong>
              <span class="setting-value">${toTitleCase(b)}</span>
            </div>
          `).join('')}
          <div class="setting-row">
            <div>
              <strong>Live Commute Monitoring</strong>
              <p>Checks Feeds Every Minute When Page Is Open.</p>
            </div>
            <button class="secondary-btn" data-action="monitor">${preferences.monitoring ? 'Pause Checks' : 'Resume Checks'}</button>
          </div>
          <div class="setting-row">
            <div>
              <strong>Browser Push Notifications</strong>
              <p>Alerts You Before Departure If Disruption Occurs.</p>
            </div>
            <button class="secondary-btn" data-action="notify">${notifying ? 'Disable Notifications' : 'Enable Notifications'}</button>
          </div>
        </article>
        <button class="text-button" data-action="reset">Reset To Rachel Default Journey</button>
      </div>
    `;

    $('#updates-view').innerHTML = `
      <div class="settings-layout">
        <article class="card card-pad">
          <div class="card-header-compact">
            <h2>Changes That Matter</h2>
            <span class="header-meta">Session History</span>
          </div>
          ${updates.length ? updates.map(u => `
            <article class="update-item">
              <time>${esc(toTitleCase(u.mode))} · ${new Date(u.date).toLocaleTimeString('en-SG', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit' })}</time>
              <h3>${esc(toTitleCase(u.title))}</h3>
              <p>${esc(toTitleCase(u.text))}</p>
            </article>
          `).join('') : `
            <div class="empty-state">
              ${icon('check')}
              <h2>No Recent Disruption Alerts</h2>
              <p>Your Route Is Running Smoothly. Changes That Affect Your Arrival Will Appear Here.</p>
            </div>
          `}
        </article>
        ${updates.length ? '<button class="text-button" data-action="clear">Clear Updates History</button>' : ''}
      </div>
    `;

    $('#mode-label').textContent = toTitleCase(scenario === 'live' ? 'Official Feeds' : result.scenario.name.replace(' Replay', ''));
    $('#update-count').textContent = updates.length;
    $('#update-count').hidden = !updates.length;
    showView(view, false);

    if (view === 'today') {
      mountMap();
      if (mapState && !picking) map.setView(mapState.center, mapState.zoom, { animate: false });
    }

    if (focusKey && !$('#dialog').open) {
      const candidates = document.querySelectorAll('[data-action]');
      for (const el of candidates) {
        if (el.dataset.action === focusKey.action && el.dataset.route === focusKey.route && el.dataset.focus === focusKey.focus) {
          el.focus({ preventScroll: true });
          break;
        }
      }
    }
  }

  function showView(next, focus = true) {
    view = next;
    ['today', 'commute', 'updates'].forEach(v => $('#' + v + '-view').hidden = v !== next);
    document.querySelectorAll('[data-nav]').forEach(el => {
      const on = el.dataset.nav === next;
      el.classList.toggle('active', on);
      if (on) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
    });
    const currentName = toTitleCase(E.personas[preferences.persona]?.name || 'Rachel');
    $('#page-title').textContent = toTitleCase({
      today: active ? `On Your Way, ${currentName}` : 'Your Next Journey',
      commute: 'My Commute Settings',
      updates: 'Journey Updates'
    }[next]);
    $('#eyebrow').textContent = next === 'today' ? prettyDate() + ' · SGT' : 'SMARTCOMM';
    $('.mode-button').hidden = next !== 'today';

    if (focus) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      $('#main').focus({ preventScroll: true });
      if (next === 'today') {
        if (!map) mountMap(); else map.invalidateSize();
      }
    }
  }

  function mountMap() {
    if (!window.L) {
      $('#journey-map').textContent = 'Map Library Unavailable. Directions Are Still Accessible.';
      return;
    }
    map = L.map('journey-map', {
      preferCanvas: true,
      scrollWheelZoom: false,
      attributionControl: true,
      minZoom: 10,
      maxZoom: 19
    }).setView([1.32, 103.9], 12);

    map.attributionControl.setPrefix(false);
    map.attributionControl.addAttribution('<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap Contributors</a>');

    // Landuse & features
    L.geoJSON({ type: 'FeatureCollection', features: G.network.features }, {
      interactive: false,
      style: f => ({
        color: f.properties.kind === 'water' ? '#b9d4e5' : f.properties.kind === 'park' ? '#c2dec9' : '#e2e8f0',
        weight: 0.8,
        fillColor: f.properties.kind === 'water' ? '#d8e7f3' : f.properties.kind === 'park' ? '#e3efe5' : '#edf2f8',
        fillOpacity: 0.85
      })
    }).addTo(map);

    // Streets
    for (const w of G.network.ways) {
      const isRoad = !['footway', 'path', 'steps', 'corridor'].includes(w.tags.highway);
      L.polyline(w.nodes.map(id => G.network.nodes[id]), {
        color: isRoad ? '#d4dce5' : '#e6ecf2',
        weight: isRoad ? 2.5 : 1.2,
        interactive: false
      }).addTo(map);
    }

    // Rail & Walking lines
    for (const r of result.routes) {
      const isSelected = r.id === shownRoute()?.id;
      const color = r.id === 'ewl' ? '#217344' : '#2457a6';

      L.polyline(r.geo.rail.geometry, {
        color,
        weight: isSelected ? 5.5 : 3,
        opacity: isSelected ? 0.95 : 0.4
      }).bindPopup(toTitleCase(r.name) + ' · ' + (r.blocked ? 'Unavailable' : range(r))).addTo(map);

      for (const leg of [r.geo.access, r.geo.egress]) {
        L.polyline(leg.geometry, {
          color,
          weight: isSelected ? 4 : 2,
          dashArray: '3 5',
          opacity: isSelected ? 0.95 : 0.4
        }).bindPopup('Walk ' + leg.metres + ' M · ' + leg.minutes + ' Min').addTo(map);
      }

      for (const seg of r.affectedSegments) {
        L.polyline(seg.geometry, {
          color: '#cf3838',
          weight: 6,
          dashArray: '7 5'
        }).bindPopup('Affected Section: ' + seg.from + ' - ' + seg.to + ' (Disrupted)').addTo(map);
      }

      r.geo.rail.stops.forEach((s, i) => {
        const landmark = r.id === 'ewl' && ['EW2', 'EW8', 'EW12', 'EW14'].includes(s.code);
        L.circleMarker(s.coord, {
          radius: i === 0 || i === r.geo.rail.stops.length - 1 ? 5 : 3,
          color,
          weight: 2,
          fillColor: '#ffffff',
          fillOpacity: 1
        }).bindTooltip(toTitleCase(s.name) + ' · ' + s.code, {
          permanent: landmark,
          direction: s.code === 'EW2' ? 'left' : 'right',
          className: landmark ? 'station-label' : ''
        }).addTo(map);
      });
    }

    // Origin & Destination markers
    for (const [point, label, color] of [[result.origin, 'Start (Home)', '#f07a75'], [result.destination, 'Destination (Work)', '#15171c']]) {
      L.circleMarker(point.coord, {
        radius: 7,
        color: '#ffffff',
        weight: 3,
        fillColor: color,
        fillOpacity: 1
      }).bindTooltip(label + ': ' + esc(toTitleCase(point.name)), { permanent: false }).addTo(map);
    }

    map.on('click', event => {
      if (!picking) return;
      const coord = [+event.latlng.lat.toFixed(7), +event.latlng.lng.toFixed(7)];
      const next = { ...preferences, [picking]: 'custom', [picking + 'Coord']: coord };
      try {
        E.plan(next, scenario, snapshot);
        preferences = next;
        save();
        picking = null;
        clearActive();
        selectedRoute = null;
        recalc();
        toast('Location Updated. Walking Paths Recalculated.');
      } catch (e) { toast(e.message); }
    });

    focusMap(mapFocus);
  }

  function focusMap(kind) {
    mapFocus = kind;
    document.querySelectorAll('[data-action="map-focus"]').forEach(el => el.classList.toggle('active', el.dataset.focus === kind));
    if (!map) return;
    const r = shownRoute() || result.routes[0];
    let coords = kind === 'origin' ? r.geo.access.geometry :
      kind === 'destination' ? r.geo.egress.geometry :
      result.routes.flatMap(r => r.geo.geometry);
    map.fitBounds(L.latLngBounds(coords), { padding: [20, 20], maxZoom: kind === 'all' ? 13 : 17, animate: false });
  }

  function pick(kind) {
    showView('today');
    picking = kind;
    const b = G.network.metadata.bounds[kind];
    L.rectangle([[b[0], b[1]], [b[2], b[3]]], {
      color: '#2868aa',
      weight: 1.5,
      dashArray: '5 5',
      fillOpacity: 0.05,
      interactive: false
    }).addTo(map);
    map.fitBounds([[b[0], b[1]], [b[2], b[3]]]);
    $('#map-message').hidden = false;
    $('#map-message').textContent = toTitleCase(`Tap A Public Street Entrance In Shaded ${kind === 'origin' ? 'Tampines' : 'CBD'} Area.`);
    $('#journey-map').scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function open(title, html) {
    if (!$('#dialog').open) dialogTrigger = document.activeElement;
    $('#dialog-title').textContent = toTitleCase(title);
    $('#dialog-body').innerHTML = html;
    if (!$('#dialog').open) $('#dialog').showModal();
  }

  function close() {
    $('#dialog').close();
    if (dialogTrigger?.isConnected) dialogTrigger.focus();
  }

  function edit() {
    const opts = (items, value) => Object.entries(items).map(([key, v]) => `<option value="${key}" ${key === value ? 'selected' : ''}>${esc(toTitleCase(v.name || v))}</option>`).join('');
    open('Plan Your Commute', `
      <p class="form-intro">Configure Origin, Destination, Departure And Accessibility Needs.</p>
      <form id="preferences-form">
        <div class="form-grid">
          ${['origin', 'destination'].map(kind => `
            <div class="field wide">
              <label for="${kind}">${kind === 'origin' ? 'From (Origin)' : 'To (Destination)'}</label>
              <select name="${kind}" id="${kind}">
                ${opts(kind === 'origin' ? E.origins : E.destinations, preferences[kind])}
                <option value="custom" ${preferences[kind] === 'custom' ? 'selected' : ''}>Custom Coordinates / Map Point</option>
              </select>
            </div>
            <div class="field wide" id="${kind}-coordinates" ${preferences[kind] === 'custom' ? '' : 'hidden'}>
              <label for="${kind}Coord">Latitude, Longitude</label>
              <input id="${kind}Coord" name="${kind}Coord" value="${esc((preferences[kind + 'Coord'] || (kind === 'origin' ? result.origin.coord : result.destination.coord)).join(', '))}">
            </div>
          `).join('')}
          <div class="field wide">
            <label for="journeyDate">Travel Date</label>
            <input type="date" id="journeyDate" name="journeyDate" value="${preferences.journeyDate}" required>
          </div>
          ${[
            ['departure', 'Usually Leave At'],
            ['deadline', 'Must Arrive By'],
            ['earliest', 'Earliest Feasible Departure']
          ].map(([n, l]) => `
            <div class="field">
              <label for="${n}">${toTitleCase(l)}</label>
              <input type="time" id="${n}" name="${n}" value="${preferences[n]}" required>
            </div>
          `).join('')}
          <div class="field">
            <label for="buffer">Arrival Buffer</label>
            <select id="buffer" name="buffer">
              ${[0, 5, 10, 15, 20].map(n => `<option value="${n}" ${n === preferences.buffer ? 'selected' : ''}>${n} Minutes</option>`).join('')}
            </select>
          </div>
          <div class="field wide">
            <label for="maxWalk">Maximum Walking Limit (Minutes)</label>
            <input type="number" id="maxWalk" name="maxWalk" value="${preferences.maxWalk}" min="5" max="60" required>
          </div>
          <div class="field wide">
            <label for="priority">Optimization Priority</label>
            <select id="priority" name="priority">
              ${opts({ reliable: 'Punctual Arrival', walking: 'Less Walking', comfort: 'Lower Crowding' }, preferences.priority)}
            </select>
          </div>
          <label class="check-row">
            <input type="checkbox" name="shelter" ${preferences.shelter ? 'checked' : ''}>
            <span>Prefer Covered Walkways Where Available</span>
          </label>
          <label class="check-row">
            <input type="checkbox" name="stepFree" ${preferences.stepFree ? 'checked' : ''}>
            <span>Require Step-Free Accessibility (Avoid Stairs)</span>
          </label>
        </div>
        <p class="form-error" id="form-error" role="alert"></p>
        <button type="submit" class="primary-btn full-width form-actions">Save And Recalculate ${icon('arrow')}</button>
      </form>
    `);

    for (const kind of ['origin', 'destination']) {
      $('#' + kind).addEventListener('change', () => $('#' + kind + '-coordinates').hidden = $('#' + kind).value !== 'custom');
    }

    $('#preferences-form').addEventListener('submit', event => {
      event.preventDefault();
      const d = Object.fromEntries(new FormData(event.currentTarget));
      d.shelter = !!d.shelter;
      d.stepFree = !!d.stepFree;
      for (const k of ['origin', 'destination']) {
        if (d[k + 'Coord']) d[k + 'Coord'] = d[k + 'Coord'].split(',').map(Number);
      }
      try {
        const next = E.validate({ ...preferences, ...d });
        E.plan(next, scenario, snapshot);
        preferences = next;
        save();
        clearActive();
        selectedRoute = null;
        close();
        recalc();
        toast('Commute Routine Saved Successfully.');
      } catch (e) {
        $('#form-error').textContent = toTitleCase(e.message);
      }
    });
  }

  function journey(id) {
    const r = result.routes.find(r => r.id === id) || result.recommendation;
    if (!r) return;
    const allSteps = E.steps(result, r);
    const current = active?.route === r.id ? active.step : -1;
    open(toTitleCase(r.name + ' Directions'), `
      <p class="detail-lead"><span class="line-badge ${r.id}">${r.code}</span> ${E.clock(r.leave)} Departure · ${range(r)} Arrival</p>
      <ol class="steps-list">
        ${allSteps.map((s, i) => `
          <li class="step-row ${i === current ? 'current' : i < current ? 'done' : ''}">
            <div class="step-marker"><span class="step-num">${i < current ? '✓' : i + 1}</span></div>
            <div class="step-info">
              <div class="step-header">
                <strong>${esc(toTitleCase(s.title))}</strong>
                <span class="step-timestamp">${esc(toTitleCase(s.time))}</span>
              </div>
              <p class="step-desc">${esc(toTitleCase(s.detail))}</p>
            </div>
          </li>
        `).join('')}
      </ol>
      <div class="form-actions">
        <button class="primary-btn full-width" data-action="${current < 0 ? 'start' : 'advance'}" data-route="${r.id}" ${r.blocked || r.walkExceeded ? 'disabled' : ''}>
          ${current < 0 ? 'Start This Journey' : current === 3 ? 'Finish Journey' : 'Next Step'} ${icon('arrow')}
        </button>
      </div>
    `);
  }

  async function refresh() {
    if (feedLoading) return;
    feedLoading = true;
    feedError = '';
    document.querySelectorAll('[data-action="refresh"]').forEach(el => { el.disabled = true; el.textContent = 'Refreshing…'; });
    try {
      const response = await fetch('/api/conditions', { cache: 'no-store', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('Official Feeds Unavailable.');
      const data = await response.json();
      if (!data.weather || !data.rail) throw new Error('Unexpected Server Data.');
      snapshot = data;
      try { localStorage.setItem('smartcomm.lastFeeds', JSON.stringify(data)); } catch {}
    } catch {
      feedError = 'Could Not Refresh Feeds. Using Saved Snapshot.';
      if (snapshot) {
        for (const feed of [snapshot.weather, snapshot.rail, ...Object.values(snapshot.crowd || {}), ...Object.values(snapshot.forecast || {})]) {
          if (feed) feed.status = 'stale';
        }
      }
    } finally {
      feedLoading = false;
      if (scenario === 'live') recalc();
    }
  }

  function modeDialog() {
    open('Select Commute Scenario', `
      <p class="detail-lead">Choose Live Feeds Or A Simulated Disruption Replay.</p>
      <div class="mode-options">
        <button class="mode-option-btn ${scenario === 'live' ? 'active' : ''}" data-action="set-mode" data-mode="live">
          <strong>Official Feeds</strong>
          <span>Live LTA DataMall & Data.Gov.Sg</span>
        </button>
      </div>
      <h3 class="dialog-subhead">Simulated Replay Scenarios</h3>
      <div class="mode-options">
        ${Object.entries(E.scenarios).filter(([id]) => id !== 'live').map(([id, s]) => `
          <button class="mode-option-btn ${scenario === id ? 'active' : ''}" data-action="set-mode" data-mode="${id}">
            <strong>${esc(toTitleCase(s.name))}</strong>
            <span>${scenario === id ? 'Currently Active' : 'Switch To Scenario'}</span>
          </button>
        `).join('')}
      </div>
    `);
  }

  function changeMode(next) {
    const prev = scenario;
    scenario = next;
    clearActive();
    selectedRoute = null;
    if (!recalc()) {
      scenario = prev;
      recalc(false);
      edit();
      return;
    }
    if ($('#dialog').open) close();
    if (next === 'live') refresh();
    else toast(toTitleCase(`${E.scenarios[next]?.name || next} Activated.`));
  }

  function sources() {
    open('Data Sources & Advisories', `
      <ul class="sources-summary-list">
        <li><strong>OpenStreetMap:</strong> Bundled Footpaths & Rail Geometries (ODbL 1.0).</li>
        <li><strong>LTA TrainServiceAlerts:</strong> Structured Rail Disruption Feed.</li>
        <li><strong>LTA Station Crowd Density:</strong> Real-Time Observations & 30-Min Forecasts.</li>
        <li><strong>Data.Gov.Sg Nowcast:</strong> 2-Hour Rainfall & Weather Nowcast.</li>
        <li><strong>LTA Bridging Bus Services:</strong> Free Shuttle And Boarding Activations.</li>
      </ul>
      ${snapshot?.rail?.data?.Message?.length ? `
        <h3 class="dialog-subhead">Official Advisories</h3>
        ${snapshot.rail.data.Message.map(m => `<p class="source-msg"><strong>${esc(toTitleCase(m.Content))}</strong><br><small>${esc(m.CreatedDate)}</small></p>`).join('')}
      ` : ''}
      ${snapshot?.rail?.data?.AffectedSegments?.length ? `
        <h3 class="dialog-subhead">Official Bridging Mitigations</h3>
        ${snapshot.rail.data.AffectedSegments.map(s => `
          <p class="source-msg"><strong>Line: ${esc(s.Line)}</strong><br>Free Public Bus: ${esc(s.FreePublicBus || 'None')}<br>MRT Shuttle: ${esc(s.FreeMRTShuttle || 'None')}</p>
        `).join('')}
      ` : ''}
    `);
  }

  document.addEventListener('click', async event => {
    const nav = event.target.closest('[data-nav]');
    if (nav) { showView(nav.dataset.nav); return; }
    if (event.target.closest('.brand')) { event.preventDefault(); showView('today'); return; }

    const el = event.target.closest('[data-action]');
    if (!el) return;
    const { action, route, kind, focus, mode, persona } = el.dataset;

    if (action === 'set-persona') {
      const p = E.personas[persona];
      if (p) {
        preferences = E.validate({ ...preferences, ...p, persona });
        save();
        clearActive();
        selectedRoute = null;
        recalc();
        toast(`${p.name} Profile Activated.`);
      }
    }
    if (action === 'mode') modeDialog();
    if (action === 'set-mode') changeMode(mode);
    if (action === 'live') changeMode('live');
    if (action === 'select-route') {
      selectedRoute = route;
      render();
      focusMap(mapFocus);
      toast(`Viewing ${route === 'ewl' ? 'East–West' : 'Downtown'} Line.`);
    }
    if (action === 'edit') edit();
    if (action === 'journey') journey(active ? active.route : (route || shownRoute()?.id));
    if (action === 'map-focus') focusMap(focus);
    if (action === 'pick') pick(kind);
    if (action === 'refresh') refresh();
    if (action === 'sources') sources();
    if (action === 'start') {
      const chosen = result.routes.find(r => r.id === route);
      if (!chosen || chosen.blocked || chosen.walkExceeded) return;
      active = {
        version: 1,
        route,
        step: 0,
        startedAt: new Date().toISOString(),
        calculatedAt: result.calculatedAt,
        preferences: { ...preferences },
        scenario,
        snapshot: result.snapshot
      };
      activePlan = result;
      persistActive();
      if ($('#dialog').open) close();
      render();
      focusMap('origin');
      showView('today');
      toast('Journey Started. Directions Saved Offline.');
    }
    if (action === 'advance') {
      if (!active) return;
      active.step++;
      if (active.step > 3) {
        clearActive();
        if ($('#dialog').open) close();
        recalc(false);
        toast('Journey Completed Successfully!');
      } else {
        persistActive();
        if ($('#dialog').open) journey(active.route);
        render();
        focusMap(active.step >= 2 ? 'destination' : 'all');
        $('#replan-status').textContent = 'Step ' + (active.step + 1) + ': ' + E.steps(result, shownRoute())[active.step].title;
      }
    }
    if (action === 'end') {
      clearActive();
      selectedRoute = null;
      recalc(false);
      toast('Active Journey Ended.');
    }
    if (action === 'monitor') {
      preferences.monitoring = !preferences.monitoring;
      save();
      recalc();
      toast(preferences.monitoring ? 'Live Commute Monitoring Resumed.' : 'Commute Monitoring Paused.');
    }
    if (action === 'notify') {
      if (notifying) {
        notifying = false;
        render();
        toast('Notifications Paused.');
        return;
      }
      if (!('Notification' in window)) {
        toast('Notifications Not Supported In This Browser.');
        return;
      }
      const permission = await Notification.requestPermission();
      notifying = permission === 'granted';
      render();
      if (notifying) {
        try {
          new Notification('SmartComm · Commuter Companion', {
            body: 'Notifications Active. You Will Be Alerted If Delays Occur On Your Journey.',
            tag: 'smartcomm-welcome'
          });
        } catch {}
        toast('Notifications Enabled For Commute Delays.');
      } else {
        toast('Notifications Were Not Granted By Browser.');
      }
    }
    if (action === 'reset') {
      preferences = { ...E.defaults };
      save();
      clearActive();
      selectedRoute = null;
      updates = [];
      seen.clear();
      recalc();
      toast('Defaults Restored.');
    }
    if (action === 'clear') { updates = []; render(); }
    if (action === 'why') {
      open('Why This Route?', `
        <ul class="sources-summary-list">
          <li><strong>Door-To-Door Walking:</strong> Calculates Connected OSM Paths To Exact Station Exits.</li>
          <li><strong>Disruption Bypass:</strong> Excludes Blocked Stretches And Recommends The Fastest Viable Alternative.</li>
          <li><strong>Punctuality First:</strong> Solves For Your ${preferences.deadline} Target With A ${preferences.buffer} Min Buffer.</li>
          <li><strong>Weather & Rain:</strong> Automatically Adds Rain Buffers And Prioritises Sheltered Paths.</li>
          <li><strong>Step-Free:</strong> ${preferences.stepFree ? 'Active: Avoids All Flight Of Stairs And Step-Heavy Paths.' : 'Standard Routing.'}</li>
        </ul>
      `);
    }
    if (action === 'about') {
      open('About SmartComm', `
        <p class="detail-lead">A Mobile-First Companion For Singapore Commuters.</p>
        <ul class="sources-summary-list">
          <li>Door-To-Door Routing On OpenStreetMap Pedestrian GIS.</li>
          <li>Integrates Official LTA DataMall Disruption Feeds And Station Crowd Density.</li>
          <li>Designed To Intervene Only When Your Arrival Time Is At Risk.</li>
        </ul>
      `);
    }
  });

  $('#close-dialog').addEventListener('click', close);
  $('#dialog').addEventListener('click', e => {
    if (e.target === $('#dialog')) {
      const r = e.target.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
    }
  });

  window.addEventListener('offline', () => {
    toast('Network Connection Lost. Cached Maps Available.');
    if (scenario === 'live') refresh();
  });
  window.addEventListener('online', () => {
    if (scenario === 'live') refresh();
  });

  setInterval(() => {
    if (scenario === 'live' && preferences.monitoring && !$('#dialog').open && !picking) refresh();
  }, 60000);

  if (!active && (preferences.journeyDate < E.dateSG() || (preferences.journeyDate === E.dateSG() && E.minutes(preferences.deadline) <= E.nowSG()))) {
    preferences = {
      ...preferences,
      journeyDate: E.dateSG(new Date(Date.now() + (E.minutes(preferences.deadline) <= E.nowSG() ? 86400000 : 0)))
    };
    save();
  }

  if (!recalc(false)) {
    preferences = { ...E.defaults };
    recalc(false);
  }
  if (scenario === 'live') refresh();
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
