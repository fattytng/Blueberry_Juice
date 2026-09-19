(() => {
  'use strict';
  const E = window.SmartCommEngine, G = window.SmartCommGeo, $ = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toTitle = s => String(s ?? '').replace(/\b([a-z])/g, c => c.toUpperCase());

  const paths = {
    home: '<path d="m3 10 9-7 9 7v10H3zM9 20v-7h6v7"/>',
    route: '<circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M9 6h7a4 4 0 0 1 0 8H8a4 4 0 0 0 0 8"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    train: '<rect x="5" y="3" width="14" height="15" rx="3"/><path d="M5 10h14M8 21l3-3m5 3-3-3M9 14h.01M15 14h.01"/>',
    bus: '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M7 18l-2 3m14-3 2 3M8 15h.01M16 15h.01"/><path d="M7 6h10"/>',
    rain: '<path d="M6 15a5 5 0 1 1 1-10 6 6 0 0 1 11 3 4 4 0 1 1 0 8M8 18l-1 3m6-3-1 3m6-3-1 3"/>',
    people: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4M17 4a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5v2"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    shield: '<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6zM8 12l3 3 5-6"/>',
    pin: '<path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
  };

  const icon = n => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[n] || paths.info}</svg>`;
  document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));

  const S = window.SmartCommSession;

  // Default Agendas
  let defaultAgendas = {
    home_work: {
      id: 'home_work',
      name: 'Home To Work',
      tag: 'Weekday Commute',
      days: 'Mon - Fri',
      origin: 'central',
      destination: 'raffles',
      departure: '07:40',
      earliest: '07:20',
      deadline: '08:45',
      buffer: 10,
      maxWalk: 25,
      priority: 'reliable',
      shelter: true,
      stepFree: true,
      monitoring: true
    },
    work_home: {
      id: 'work_home',
      name: 'Work To Home',
      tag: 'Evening Commute',
      days: 'Mon - Fri',
      origin: 'raffles',
      destination: 'central',
      departure: '18:15',
      earliest: '18:00',
      deadline: '19:15',
      buffer: 10,
      maxWalk: 25,
      priority: 'reliable',
      shelter: true,
      stepFree: true,
      monitoring: true
    },
    weekend_yewtee: {
      id: 'weekend_yewtee',
      name: 'Weekend Grandparents',
      tag: 'Weekend Family Visit',
      days: 'Sat - Sun',
      origin: 'central',
      destination: 'yewtee',
      departure: '10:00',
      earliest: '09:30',
      deadline: '11:15',
      buffer: 15,
      maxWalk: 30,
      priority: 'comfort',
      shelter: true,
      stepFree: true,
      monitoring: true
    }
  };

  let agendas = { ...defaultAgendas };
  let activeAgendaId = 'home_work';
  let storage = true;

  try {
    const savedAgendas = JSON.parse(localStorage.getItem('smartcomm.agendas') || 'null');
    if (savedAgendas) agendas = { ...defaultAgendas, ...savedAgendas };
    const savedActive = localStorage.getItem('smartcomm.activeAgenda');
    if (savedActive && agendas[savedActive]) activeAgendaId = savedActive;
  } catch { storage = false; }

  let preferences = { ...E.defaults, ...agendas[activeAgendaId] };
  let scenario = 'live', view = 'today', result, snapshot = null, feedLoading = false, feedError = '';
  const hashView = window.location.hash.replace('#', '');
  if (['today', 'commute', 'updates'].includes(hashView)) view = hashView;
  let active = null, activePlan = null, selectedRoute = null, map = null, picking = null, updates = [];
  let toastTimer, bannerTimer, notifying = false, mapFocus = 'all';

  try {
    snapshot = JSON.parse(localStorage.getItem('smartcomm.lastFeeds') || 'null');
    if (snapshot) for (const f of [snapshot.weather, snapshot.rail, ...Object.values(snapshot.crowd || {}), ...Object.values(snapshot.forecast || {})]) if (f) f.status = 'stale';
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
  const shownRoute = () => result.routes.find(r => r.id === (active?.route || selectedRoute)) || result.recommendation || result.routes[0];
  const prettyDate = () => new Date(preferences.journeyDate + 'T12:00:00+08:00').toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Singapore' });

  function saveAgendas() {
    agendas[activeAgendaId] = { ...preferences };
    try {
      localStorage.setItem('smartcomm.agendas', JSON.stringify(agendas));
      localStorage.setItem('smartcomm.activeAgenda', activeAgendaId);
      localStorage.setItem('smartcomm.web.preferences', JSON.stringify(preferences));
      storage = true;
    } catch { storage = false; }
  }

  function clearActive() {
    active = null; activePlan = null;
    try { S.persist(localStorage, null); } catch {}
  }

  function persistActive() {
    try {
      if (!S.persist(localStorage, active)) toast('Journey Saved On This Device.');
    } catch { toast('Journey Saved On This Device.'); }
  }

  function toast(text) {
    clearTimeout(toastTimer);
    $('#toast').textContent = toTitle(text);
    $('#toast').classList.add('show');
    toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 4000);
  }

  // Outside-App Notification Delivery
  function sendOutsideNotification(title, body) {
    const capitalizedTitle = toTitle(title);
    const capitalizedBody = toTitle(body);

    // 1. Native Web Notification API
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(capitalizedTitle, {
          body: capitalizedBody,
          icon: 'icon.svg',
          badge: 'icon.svg',
          tag: 'smartcomm-outside-alert',
          renotify: true
        });
      } catch (e) {
        console.warn('Native Notification Error:', e);
      }
    }

    // 2. On-screen floating native push simulation banner
    showPushBanner(capitalizedTitle, capitalizedBody);
  }

  function showPushBanner(title, body) {
    const banner = $('#push-notification-banner');
    if (!banner) return;
    clearTimeout(bannerTimer);
    banner.hidden = false;
    banner.innerHTML = `
      <div class="push-banner-icon">${icon('bell')}</div>
      <div class="push-banner-content">
        <div class="push-banner-meta">
          <span>SmartComm Push</span>
          <span>Just Now</span>
        </div>
        <div class="push-banner-title">${esc(title)}</div>
        <div class="push-banner-body">${esc(body)}</div>
      </div>
      <button class="push-banner-close" data-action="dismiss-push" aria-label="Dismiss Notification">✕</button>
    `;
    bannerTimer = setTimeout(() => { banner.hidden = true; }, 6000);
  }

  function instruction(r) {
    if (!r) return 'No Route Meets All Selected Constraints.';
    if (r.id === 'shuttle') return `Leave ${E.clock(r.leave)} · Board ${r.name}.`;
    if (r.late) return `Take ${r.code}; Arrival Estimated At Risk.`;
    return `Leave ${E.clock(r.leave)} · Board ${r.code}.`;
  }

  function recalc(record = true) {
    try {
      result = active && activePlan ? activePlan : E.plan(preferences, scenario, snapshot);
    } catch (error) {
      toast(error.message);
      return false;
    }
    const r = result.recommendation;
    const key = JSON.stringify([activeAgendaId, scenario, preferences.journeyDate, result.origin.coord, result.destination.coord, r?.id, r?.leave, r?.max, r?.blocked, result.stale]);
    if (record && !active && !feedLoading && result.needsAlert && !seen.has(key)) {
      seen.add(key);
      const title = instruction(r);
      const text = r ? `Reach ${result.destination.short} Around ${range(r)}.` : 'Adjust Walking Limit Or Start Point.';
      updates.unshift({ title, text, date: new Date().toISOString(), mode: 'Live Service Alert' });
      updates = updates.slice(0, 15);
      sendOutsideNotification(title, text);
    }
    render();
    $('#replan-status').textContent = instruction(r) + (r ? ` Estimated Arrival ${range(r)}.` : '');
    return true;
  }

  function reasonFor(r) {
    if (r.blocked) return 'Affected Section Excluded From Recommendation.';
    if (r.walkExceeded) return `Exceeds Your ${preferences.maxWalk} - Minute Walking Limit.`;
    if (r.id === 'shuttle') return 'Direct Point - To - Point Express Via Expressway With Guaranteed Reserved Seat.';
    if (r.late) return `Arrival May Be Past ${preferences.deadline}. Allow More Time.`;
    if (r.rain) return `Includes ${r.rain} Extra Minutes Allowance For Rain.`;
    if (r.crowd === 'High') return 'Allow Extra Minutes For High Station Boarding Crowds.';
    return r.id === 'ewl' ? 'Fastest Direct Transit Route Fits Your Deadline.' : 'Balances Walking, Transit Time And Seating Comfort.';
  }

  // Agenda Selector Tabs Bar
  function agendaTabs() {
    return `
      <div class="agenda-tab-bar" role="tablist" aria-label="Commute Agendas">
        ${Object.values(agendas).map(a => `
          <button class="agenda-tab-btn ${a.id === activeAgendaId ? 'active' : ''}" data-action="switch-agenda" data-agenda="${a.id}" role="tab" aria-selected="${a.id === activeAgendaId}">
            <span class="icon">${icon(a.id === 'weekend_yewtee' ? 'home' : a.id === 'work_home' ? 'route' : 'train')}</span>
            <span>${esc(a.name)}</span>
            <span class="agenda-tag">${esc(a.days)}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  // Top Horizontal Map Card
  function mapCard() {
    return `
      <article class="map-horizontal-card">
        <div class="map-horizontal-header">
          <div class="map-header-title">
            ${icon('route')}
            <h2>Commute Route Map · Singapore</h2>
          </div>
          <div class="map-horizontal-controls" aria-label="Map Focus Controls">
            ${[['all', 'Full Route'], ['origin', 'Start Area'], ['destination', 'Destination Area']].map(([k, l]) => `
              <button data-action="map-focus" data-focus="${k}" aria-pressed="${mapFocus === k}">${l}</button>
            `).join('')}
          </div>
        </div>
        <div id="journey-map" role="region" aria-label="Geographical Singapore Map"></div>
        <div class="map-horizontal-footer">
          <div class="map-legend">
            <span><i class="legend-line ewl"></i>East - West Line</span>
            <span><i class="legend-line dtl"></i>Downtown Line</span>
            <span><i class="legend-line shuttle"></i>Express Shuttle</span>
            <span><i class="legend-line walking"></i>Walking Leg</span>
          </div>
          <div class="map-actions">
            <button class="text-button" data-action="recenter-map">${icon('pin')} Recenter</button>
          </div>
        </div>
      </article>
    `;
  }

  // Compact Recommendation Card & Active Commute Card
  function recommendation() {
    const r = shownRoute();
    const endpoint = `
      <div class="trip-endpoints">
        <div><span>From</span><strong>${esc(result.origin.short)}</strong></div>
        ${icon('arrow')}
        <div><span>To</span><strong>${esc(result.destination.short)}</strong></div>
        <button class="icon-button" data-action="edit" aria-label="Configure Commute Settings">${icon('pin')}</button>
      </div>
    `;

    if (!r) {
      return `
        <article class="card recommendation">
          ${endpoint}
          <div class="recommendation-body">
            <div class="advice-label"><span class="status">${icon('info')}No Matching Route</span></div>
            <h2 class="advice-title">Please Adjust Preferences</h2>
            <p class="advice-reason">Walking Limits Or Station Constraints Exceeded.</p>
            <button class="primary full-width" data-action="edit">${icon('arrow')} Review Preferences</button>
          </div>
        </article>
      `;
    }

    const manual = selectedRoute && r.id !== result.recommendation?.id;
    const status = active ? 'Commute In Progress · Saved Offline' : manual ? 'Selected Option' : r.late ? 'Arrival At Risk' : 'Recommended Route';
    const isShuttle = r.id === 'shuttle';
    const badgeClass = isShuttle ? 'shuttle' : r.id;

    if (active) {
      const stepsList = E.steps(result, r);
      const curStep = stepsList[active.step] || stepsList[0];
      const nextStep = stepsList[active.step + 1];

      return `
        <article class="card recommendation active-journey-card">
          ${endpoint}
          <div class="recommendation-body">
            <div class="advice-label">
              <span class="status">${icon('check')}${status}</span>
              <span class="line-badge ${badgeClass}">${r.code}</span>
            </div>
            <div class="active-tracker-step">
              <span class="step-pill">Step ${(active.step + 1)} Of 4</span>
              <span class="step-title-highlight">${esc(curStep.title)}</span>
            </div>
            <p class="advice-reason">${esc(curStep.detail)}</p>
            <div class="arrival-block">
              <div><span>Target Arrival</span><strong>${range(r)}</strong></div>
              <div class="arrival-goal"><span>Latest Allowed</span><strong>${preferences.deadline}</strong></div>
            </div>
            <div class="trip-facts">
              <span>${icon(isShuttle ? 'bus' : 'train')}<strong>${r.min} - ${r.max} Min</strong> Transit</span>
              <span><strong>${r.walk} Min</strong> Walk</span>
              <span>No Transfers</span>
            </div>
            <button class="primary full-width ${isShuttle ? 'purple-btn' : ''}" data-action="advance">
              ${icon('check')} ${active.step === 3 ? 'Finish Commute' : 'Next Step: ' + (nextStep ? esc(nextStep.title) : 'Proceed')}
            </button>
            <div class="advice-actions">
              <button class="text-button" data-action="send-step-push">${icon('bell')} Resend Step Notification</button>
              <button class="text-button" data-action="end">End Commute</button>
            </div>
          </div>
        </article>
      `;
    }

    return `
      <article class="card recommendation ${isShuttle ? 'shuttle-card' : ''}">
        ${endpoint}
        <div class="recommendation-body">
          <div class="advice-label">
            <span class="status">${icon(isShuttle ? 'bus' : 'shield')}${status}</span>
            <span class="line-badge ${badgeClass}">${r.code}</span>
          </div>
          <h2 class="advice-title">${instruction(r)}</h2>
          <p class="advice-reason">${esc(reasonFor(r))}</p>
          <div class="arrival-block">
            <div><span>Estimated Arrival</span><strong>${range(r)}</strong></div>
            <div class="arrival-goal"><span>Latest Allowed</span><strong>${preferences.deadline}</strong></div>
          </div>
          <div class="trip-facts">
            <span>${icon(isShuttle ? 'bus' : 'train')}<strong>${r.min} - ${r.max} Min</strong> Transit</span>
            <span><strong>${r.walk} Min</strong> Walk</span>
            <span>${isShuttle ? 'Guaranteed Reserved Seat' : 'No Transfers'}</span>
          </div>
          <div class="buffer-note ${r.late ? 'risk' : ''}">
            ${r.late ? `${r.late} Min Past Target Deadline` : `${result.deadline - r.arrivalMax} Min Safety Margin Before Deadline`}
          </div>
          <button class="primary full-width ${isShuttle ? 'purple-btn' : ''}" data-action="start" data-route="${r.id}" ${r.blocked || r.walkExceeded ? 'disabled' : ''}>
            ${icon('arrow')} Start This Commute
          </button>
        </div>
      </article>
    `;
  }

  function crowdLabel(level) {
    const bars = level === 'High' ? 3 : level === 'Moderate' ? 2 : 1;
    return `
      <span class="crowd crowd-${level.toLowerCase()}">
        <span class="crowd-bars" aria-hidden="true">${[1, 2, 3].map(n => `<i class="${n <= bars ? 'filled' : ''}"></i>`).join('')}</span>
        <strong>${level} Crowding</strong>
      </span>
    `;
  }

  // Route Comparison Options
  function comparison() {
    const current = shownRoute();
    return `
      <section class="route-options" aria-labelledby="compare-title">
        <div class="section-heading">
          <h2 id="compare-title">All Transit Options</h2>
          <span class="meta">Door To Door</span>
        </div>
        <div class="route-option-list">
          ${result.routes.map(r => {
            const isSelected = r.id === current?.id;
            const isShuttle = r.id === 'shuttle';
            const badgeClass = isShuttle ? 'shuttle' : r.id;
            return `
              <button class="route-option ${isSelected ? 'selected' : ''}" data-action="select-route" data-route="${r.id}" aria-pressed="${isSelected}">
                <div class="route-option-top">
                  <span class="line-badge ${badgeClass}">${r.code}</span>
                  <strong>${esc(r.name)}</strong>
                  ${r.id === result.recommendation?.id ? '<span class="route-tag">★ Recommended</span>' : ''}
                </div>
                <div class="route-option-times">
                  <strong>${r.blocked ? 'Unavailable' : range(r)}</strong>
                  <span class="route-duration-pill ${isSelected ? 'coral' : ''}">${r.min} - ${r.max} Min</span>
                </div>
                <div class="route-option-details">
                  <span>Leave <strong>${E.clock(r.leave)}</strong> · <strong>${r.walk} Min</strong> Walk</span>
                  <span>${isShuttle ? 'Express Highway' : r.late ? 'At Risk' : 'On Schedule'}</span>
                </div>
                ${crowdLabel(r.crowd)}
              </button>
            `;
          }).join('')}
        </div>
      </section>
    `;
  }

  // Service Conditions Card
  function conditionsCard() {
    const r = shownRoute();
    const rows = [
      ['train', 'MRT Rail Status', 'Live Transit Monitoring Active Across Singapore.'],
      ['bus', 'Commercial Shuttle Status', 'Highway Express Buses Operating Normally.'],
      ['rain', 'Weather Nowcast', preferences.shelter ? 'Sheltered Walkways Prioritized.' : 'Clear Conditions Along Pedestrian Path.'],
      ['people', `${r?.crowd || 'Moderate'} Passenger Density`, 'Real - Time Boarding Status Clean.']
    ];

    return `
      <section class="card conditions-card">
        <div class="card-heading">
          <h2>Commute Conditions</h2>
          <button class="text-button" data-action="refresh" ${feedLoading ? 'disabled' : ''}>
            ${icon('arrow')} ${feedLoading ? 'Checking…' : 'Refresh'}
          </button>
        </div>
        <ul class="conditions">
          ${rows.map(([i, t, d]) => `
            <li>
              <span class="condition-icon">${icon(i)}</span>
              <div>
                <h3>${esc(t)}</h3>
                <p>${esc(d)}</p>
              </div>
            </li>
          `).join('')}
        </ul>
      </section>
    `;
  }

  // Commute Summary Card
  function commuteSummaryCard() {
    return `
      <article class="card card-pad">
        <div class="card-heading">
          <h2>Active Agenda: ${esc(preferences.name || 'Home To Work')}</h2>
          <button class="text-button" data-action="edit">${icon('pin')} Edit Agenda</button>
        </div>
        <div class="trip-endpoints">
          <div><span>From</span><strong>${esc(result.origin.name)}</strong></div>
          ${icon('arrow')}
          <div><span>To</span><strong>${esc(result.destination.name)}</strong></div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 14px; font-weight: 700;">
          <span>Leave <strong>${preferences.departure}</strong></span>
          <span>Latest Allowed Arrival <strong>${preferences.deadline}</strong></span>
        </div>
      </article>
    `;
  }

  // Render Full UI
  function render() {
    const mapState = map ? { center: map.getCenter(), zoom: map.getZoom() } : null;
    if (map) { map.remove(); map = null; }

    $('#today-view').innerHTML = `
      ${agendaTabs()}
      <div class="journey-layout">
        ${mapCard()}
        <div class="journey-main-row">
          ${recommendation()}
          <div style="display: flex; flex-direction: column; gap: 20px;">
            ${comparison()}
            ${conditionsCard()}
          </div>
        </div>
      </div>
    `;

    $('#commute-view').innerHTML = `
      <div class="settings-layout">
        ${agendaTabs()}
        ${commuteSummaryCard()}
        <article class="card card-pad">
          <div class="card-heading">
            <h2>Preferences & Accessibility</h2>
            <button class="text-button" data-action="edit">${icon('pin')} Edit</button>
          </div>
          <div class="setting-row">
            <div><strong>Latest Allowed Arrival</strong><p>Hard Arrival Deadline With Safety Cushion.</p></div>
            <span class="setting-value">${preferences.deadline} (${preferences.buffer} Min Buffer)</span>
          </div>
          <div class="setting-row">
            <div><strong>Stair - Free Access</strong><p>Avoid Stairs, Use Lifts, Escalators & Ramps.</p></div>
            <span class="setting-value">${preferences.stepFree ? 'Enabled' : 'Off'}</span>
          </div>
          <div class="setting-row">
            <div><strong>Rain - Sheltered Paths</strong><p>Prefer Covered Walkways & Underpasses.</p></div>
            <span class="setting-value">${preferences.shelter ? 'Enabled' : 'No Preference'}</span>
          </div>
          <div class="setting-row">
            <div><strong>Travel Priority</strong><p>Algorithm Optimization Criterion.</p></div>
            <span class="setting-value">${{ reliable: 'Fastest & Reliable', walking: 'Less Walking', comfort: 'Quiet & Low Crowding' }[preferences.priority] || 'Reliable'}</span>
          </div>
          <div class="setting-row">
            <div><strong>Outside - App Notifications</strong><p>Receive Lockscreen & System Step Directions.</p></div>
            <button class="secondary" data-action="notify">${notifying ? 'Enabled' : 'Enable'}</button>
          </div>
          <div class="setting-row">
            <div><strong>Verify Notifications</strong><p>Send An Instant Outside - App Test Notification.</p></div>
            <button class="primary" data-action="test-push">${icon('bell')} Send Test Notification</button>
          </div>
        </article>
      </div>
    `;

    $('#updates-view').innerHTML = `
      <div class="settings-layout">
        <article class="card card-pad">
          <div class="card-heading">
            <h2>Commute Notifications</h2>
            <span class="meta">Live Session</span>
          </div>
          ${updates.length ? updates.map(u => `
            <article class="setting-row">
              <div>
                <strong>${esc(u.title)}</strong>
                <p>${esc(u.text)}</p>
              </div>
              <time class="meta">${new Date(u.date).toLocaleTimeString('en-SG', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit' })}</time>
            </article>
          `).join('') : `
            <div style="text-align: center; padding: 30px 10px; color: var(--muted);">
              ${icon('check')}
              <h3 style="margin-top: 10px;">All Quiet · No Disruption</h3>
              <p style="font-size: 0.875rem;">Timely Commute Updates And Push Directions Will Appear Here.</p>
            </div>
          `}
        </article>
        ${updates.length ? '<button class="text-button" data-action="clear">Clear History</button>' : ''}
      </div>
    `;

    $('#header-agenda-name').textContent = preferences.name || 'Home To Work';
    $('#update-count').textContent = updates.length;
    $('#update-count').hidden = !updates.length;

    showView(view, false);

    if (view === 'today') {
      mountMap();
      if (mapState && !picking) map.setView(mapState.center, mapState.zoom, { animate: false });
    }
  }

  function showView(next, focus = true) {
    view = next;
    ['today', 'commute', 'updates'].forEach(v => $('#' + v + '-view').hidden = v !== next);
    document.querySelectorAll('[data-nav]').forEach(el => {
      const on = el.dataset.nav === next;
      el.classList.toggle('active', on);
      if (on) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    });

    $('#page-title').textContent = {
      today: active ? 'Commute In Progress' : 'Your Next Journey',
      commute: 'My Commute Profiles',
      updates: 'Commute Notifications'
    }[next];

    $('#eyebrow').textContent = next === 'today' ? prettyDate() + ' · SINGAPORE' : 'SMARTCOMM';
    $('#page-description').textContent = {
      today: '',
      commute: 'Manage Different Agendas, Deadlines And Accessibility Options.',
      updates: 'Real - Time Commute Notifications And Disruptions.'
    }[next];

    if (focus) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      $('#main').focus({ preventScroll: true });
      if (next === 'today') {
        if (!map) mountMap();
        else map.invalidateSize();
      }
    }
  }

  // Mount Leaflet Map With Real Singapore Base Tiles
  function mountMap() {
    const el = document.getElementById('journey-map');
    if (!window.L || !el) return;

    map = L.map('journey-map', {
      preferCanvas: true,
      scrollWheelZoom: false,
      attributionControl: true,
      minZoom: 10,
      maxZoom: 18
    }).setView([1.33, 103.88], 12);

    map.attributionControl.setPrefix(false);
    map.attributionControl.addAttribution('<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap Contributors</a>');

    // Add High-Resolution OpenStreetMap Tiles for Singapore
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap Contributors'
    }).addTo(map);

    // Draw Polylines and Markers for all available routes
    for (const r of result.routes) {
      const isShuttle = r.id === 'shuttle';
      const color = isShuttle ? '#7c3aed' : r.id === 'ewl' ? '#217344' : '#2457a6';
      const isCurrent = r.id === shownRoute()?.id;

      if (r.geo?.rail?.geometry) {
        L.polyline(r.geo.rail.geometry, {
          color,
          weight: isCurrent ? 6 : 3.5,
          opacity: isCurrent ? 0.95 : 0.65
        }).bindPopup(`${esc(r.name)} · ${range(r)}`).addTo(map);
      }

      if (r.geo?.access?.geometry) {
        L.polyline(r.geo.access.geometry, { color, weight: 3.5, dashArray: '3 6' }).addTo(map);
      }
      if (r.geo?.egress?.geometry) {
        L.polyline(r.geo.egress.geometry, { color, weight: 3.5, dashArray: '3 6' }).addTo(map);
      }

      // Stop markers
      if (r.geo?.rail?.stops) {
        r.geo.rail.stops.forEach((s, idx) => {
          const isTerminus = idx === 0 || idx === r.geo.rail.stops.length - 1;
          L.circleMarker(s.coord, {
            radius: isTerminus ? 5 : 3.5,
            color,
            weight: 2,
            fillColor: '#ffffff',
            fillOpacity: 1
          }).bindTooltip(`${esc(s.name)}`, { permanent: isTerminus }).addTo(map);
        });
      }
    }

    // Origin and Destination Circle Markers
    if (result.origin?.coord) {
      L.circleMarker(result.origin.coord, {
        radius: 8,
        color: '#ffffff',
        weight: 3,
        fillColor: '#f07a75',
        fillOpacity: 1
      }).bindTooltip(`Start: ${esc(result.origin.name)}`, { permanent: false }).addTo(map);
    }

    if (result.destination?.coord) {
      L.circleMarker(result.destination.coord, {
        radius: 8,
        color: '#ffffff',
        weight: 3,
        fillColor: '#15171c',
        fillOpacity: 1
      }).bindTooltip(`Destination: ${esc(result.destination.name)}`, { permanent: false }).addTo(map);
    }

    focusMap(mapFocus);
  }

  function focusMap(kind) {
    mapFocus = kind;
    document.querySelectorAll('[data-action="map-focus"]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.focus === kind)));
    if (!map) return;
    const r = shownRoute() || result.routes[0];
    let coords = kind === 'origin' ? r.geo.access.geometry : kind === 'destination' ? r.geo.egress.geometry : result.routes.flatMap(r => r.geo.geometry);
    if (!coords || !coords.length) coords = [[1.354, 103.942], [1.2845, 103.851]];
    map.fitBounds(L.latLngBounds(coords), { padding: [24, 24], maxZoom: kind === 'all' ? 13 : 16, animate: false });
  }

  function openModal(title, html) {
    $('#dialog-title').textContent = toTitle(title);
    $('#dialog-body').innerHTML = html;
    if (!$('#dialog').open) $('#dialog').showModal();
  }

  function closeModal() {
    $('#dialog').close();
  }

  // Edit Preferences & Accessibility Dialog
  function editDialog() {
    const opts = (items, value) => Object.entries(items).map(([key, v]) => `<option value="${key}" ${key === value ? 'selected' : ''}>${esc(v.name || v)}</option>`).join('');
    const formHtml = `
      <form id="preferences-form">
        <div class="form-grid">
          <div class="field wide">
            <label for="agenda-name">Agenda Profile Name</label>
            <input type="text" id="agenda-name" name="name" value="${esc(preferences.name || 'Home To Work')}" required>
          </div>
          <div class="field">
            <label for="origin">Start Location (From)</label>
            <select name="origin" id="origin">${opts(E.origins, preferences.origin)}</select>
          </div>
          <div class="field">
            <label for="destination">Destination (To)</label>
            <select name="destination" id="destination">${opts(E.destinations, preferences.destination)}</select>
          </div>
          <div class="field">
            <label for="departure">Usually Leave At</label>
            <input type="time" id="departure" name="departure" value="${preferences.departure}" required>
          </div>
          <div class="field">
            <label for="deadline">Latest Allowed Arrival</label>
            <input type="time" id="deadline" name="deadline" value="${preferences.deadline}" required>
          </div>
          <div class="field">
            <label for="earliest">Earliest Allowed Departure</label>
            <input type="time" id="earliest" name="earliest" value="${preferences.earliest}" required>
          </div>
          <div class="field">
            <label for="buffer">Safety Arrival Buffer</label>
            <select id="buffer" name="buffer">
              ${[0, 5, 10, 15, 20, 25].map(n => `<option value="${n}" ${n === preferences.buffer ? 'selected' : ''}>${n} Minutes</option>`).join('')}
            </select>
          </div>
          <div class="field wide">
            <label for="priority">Optimization Priority</label>
            <select id="priority" name="priority">
              <option value="reliable" ${preferences.priority === 'reliable' ? 'selected' : ''}>Fastest & Most Reliable Arrival</option>
              <option value="walking" ${preferences.priority === 'walking' ? 'selected' : ''}>Less Walking (Shorter Footpath)</option>
              <option value="comfort" ${preferences.priority === 'comfort' ? 'selected' : ''}>Quiet & Low Crowding</option>
            </select>
          </div>
          <div class="preference-section-header">Accessibility & Paths</div>
          <label class="check-row">
            <input type="checkbox" name="stepFree" ${preferences.stepFree ? 'checked' : ''}>
            <span>Stair - Free Access (Lifts, Escalators & Ramps)</span>
          </label>
          <label class="check-row">
            <input type="checkbox" name="shelter" ${preferences.shelter ? 'checked' : ''}>
            <span>Rain - Sheltered Paths (Covered Walkways)</span>
          </label>
        </div>
        <p class="form-error" id="form-error" role="alert"></p>
        <button type="submit" class="primary full-width" style="margin-top: 18px;">
          ${icon('check')} Save Agenda Changes
        </button>
      </form>
    `;
    openModal('Edit Commute Agenda', formHtml);

    $('#preferences-form').addEventListener('submit', event => {
      event.preventDefault();
      const d = Object.fromEntries(new FormData(event.currentTarget));
      d.shelter = !!d.shelter;
      d.stepFree = !!d.stepFree;
      d.buffer = Number(d.buffer);
      try {
        const next = E.validate({ ...preferences, ...d });
        preferences = next;
        saveAgendas();
        clearActive();
        selectedRoute = null;
        closeModal();
        recalc();
        toast('Commute Agenda Settings Updated!');
      } catch (e) {
        $('#form-error').textContent = e.message;
      }
    });
  }

  async function refresh() {
    if (feedLoading) return;
    feedLoading = true; feedError = '';
    document.querySelectorAll('[data-action="refresh"]').forEach(el => {
      el.disabled = true;
      el.textContent = 'Checking…';
    });
    try {
      const response = await fetch('/api/conditions', { cache: 'no-store', signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error('Live Feeds Unavailable.');
      const data = await response.json();
      snapshot = data;
      try { localStorage.setItem('smartcomm.lastFeeds', JSON.stringify(data)); } catch {}
    } catch {
      feedError = 'Cached Conditions In Use.';
      if (snapshot) for (const feed of [snapshot.weather, snapshot.rail, ...Object.values(snapshot.crowd || {}), ...Object.values(snapshot.forecast || {})]) if (feed) feed.status = 'stale';
    } finally {
      feedLoading = false;
      recalc();
      toast('Live Transit Status Refreshed.');
    }
  }

  // Switch Commute Agenda
  function switchAgenda(agendaId) {
    if (!agendas[agendaId]) return;
    activeAgendaId = agendaId;
    preferences = { ...E.defaults, ...agendas[agendaId] };
    clearActive();
    selectedRoute = null;
    saveAgendas();
    recalc();
    toast(`Switched To ${agendas[agendaId].name}`);
  }

  // Event Listeners
  document.addEventListener('click', async event => {
    const nav = event.target.closest('[data-nav]');
    if (nav) { showView(nav.dataset.nav); return; }
    if (event.target.closest('.brand')) { event.preventDefault(); showView('today'); return; }

    const el = event.target.closest('[data-action]');
    if (!el) return;
    const { action, route, agenda, focus } = el.dataset;

    if (action === 'switch-agenda') switchAgenda(agenda);
    if (action === 'quick-agenda') {
      const ids = Object.keys(agendas);
      const nextIdx = (ids.indexOf(activeAgendaId) + 1) % ids.length;
      switchAgenda(ids[nextIdx]);
    }
    if (action === 'select-route') {
      selectedRoute = route;
      render();
      focusMap(mapFocus);
      toast(`Selected ${route === 'shuttle' ? 'Express Shuttle Bus' : route === 'ewl' ? 'East - West Line' : 'Downtown Line'}.`);
    }
    if (action === 'edit') editDialog();
    if (action === 'map-focus') focusMap(focus);
    if (action === 'recenter-map') focusMap('all');
    if (action === 'refresh') refresh();
    if (action === 'dismiss-push') $('#push-notification-banner').hidden = true;

    // Start Commute with Outside-App Notification
    if (action === 'start') {
      const chosen = result.routes.find(r => r.id === route) || result.recommendation;
      if (!chosen || chosen.blocked || chosen.walkExceeded) return;
      active = {
        version: 1,
        route: chosen.id,
        step: 0,
        startedAt: new Date().toISOString(),
        calculatedAt: result.calculatedAt,
        preferences: { ...preferences },
        scenario,
        snapshot: result.snapshot
      };
      activePlan = result;
      persistActive();
      render();
      focusMap('origin');

      // Send initial step notification
      const initialSteps = E.steps(result, chosen);
      sendOutsideNotification(
        `Commute Started · ${chosen.name}`,
        `Step 1 Of 4: ${initialSteps[0].title}. ${initialSteps[0].detail}`
      );
      toast('Commute Started · Outside - App Step Directions Active');
    }

    // Advance Step with Outside-App Notification
    if (action === 'advance') {
      if (!active) return;
      active.step++;
      const r = shownRoute();
      const allSteps = E.steps(result, r);

      if (active.step > 3) {
        clearActive();
        sendOutsideNotification(
          'Commute Completed!',
          `You Have Arrived At ${result.destination.short} On Schedule.`
        );
        recalc(false);
        toast('Commute Completed! Have A Wonderful Day.');
      } else {
        persistActive();
        render();
        focusMap(active.step >= 2 ? 'destination' : 'all');
        const nextStep = allSteps[active.step];
        sendOutsideNotification(
          `Step ${active.step + 1} Of 4 · ${r.code}`,
          `${nextStep.title}: ${nextStep.detail}`
        );
        toast(`Step ${active.step + 1} Of 4: ${nextStep.title}`);
      }
    }

    if (action === 'send-step-push') {
      if (!active) return;
      const r = shownRoute();
      const allSteps = E.steps(result, r);
      const nextStep = allSteps[active.step];
      sendOutsideNotification(
        `Step ${active.step + 1} Of 4 · ${r.code}`,
        `${nextStep.title}: ${nextStep.detail}`
      );
      toast('Step Notification Resent.');
    }

    if (action === 'end') {
      clearActive();
      selectedRoute = null;
      recalc(false);
      toast('Commute Ended.');
    }

    if (action === 'notify') {
      if (!('Notification' in window)) {
        toast('Browser Does Not Support Native Notifications.');
        return;
      }
      const perm = await Notification.requestPermission();
      notifying = perm === 'granted';
      render();
      if (notifying) {
        sendOutsideNotification('SmartComm Notifications Enabled', 'You Will Receive Outside - App Commute Steps.');
        toast('Notifications Enabled!');
      } else {
        toast('Notifications Not Granted.');
      }
    }

    if (action === 'test-push') {
      if ('Notification' in window && Notification.permission !== 'granted') {
        await Notification.requestPermission();
      }
      sendOutsideNotification(
        'SmartComm · Outside - App Alert',
        `Step 1 Of 4: Leave At ${preferences.departure}. Head To ${result.origin.short}.`
      );
      toast('Outside - App Test Notification Sent!');
    }

    if (action === 'clear') {
      updates = [];
      render();
    }
  });

  $('#close-dialog').addEventListener('click', closeModal);
  $('#dialog').addEventListener('click', e => {
    if (e.target === $('#dialog')) {
      const r = e.target.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeModal();
    }
  });

  window.addEventListener('offline', () => toast('Offline Mode · Cached Routes Available'));
  window.addEventListener('online', () => { if (scenario === 'live') refresh(); });
  window.addEventListener('hashchange', () => {
    const h = window.location.hash.replace('#', '');
    if (['today', 'commute', 'updates'].includes(h)) showView(h);
  });

  // Init
  if (!active && (preferences.journeyDate < E.dateSG() || preferences.journeyDate === E.dateSG() && E.minutes(preferences.deadline) <= E.nowSG())) {
    preferences = { ...preferences, journeyDate: E.dateSG(new Date(Date.now() + (E.minutes(preferences.deadline) <= E.nowSG() ? 86400000 : 0))) };
    saveAgendas();
  }

  if (!recalc(false)) {
    preferences = { ...E.defaults, ...agendas.home_work };
    recalc(false);
  }

  if (scenario === 'live') refresh();
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
