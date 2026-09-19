(function(root){
  'use strict';
  const Geo = typeof module !== 'undefined' && module.exports ? require('./geo.js') : root.SmartCommGeo;
  const dateSG = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const nowSG = (now = new Date()) => minutes(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now));
  const journeyDate = dateSG(new Date(Date.now() + (nowSG() > 440 ? 86400000 : 0)));

  const origins = {
    central: { name: 'Tampines Central 1', short: 'Tampines Central 1', coord: [1.354, 103.942] },
    avenue: { name: 'Tampines Avenue 4', short: 'Tampines Avenue 4', coord: [1.35, 103.945] }
  };
  const destinations = {
    raffles: { name: 'One Raffles Place', short: 'One Raffles Place', coord: [1.2845, 103.851] },
    marina: { name: 'Marina Bay Financial Centre', short: 'Marina Bay Financial Centre', coord: [1.27955, 103.8543] }
  };

  const personas = {
    rachel: {
      id: 'rachel',
      name: 'Rachel',
      tagline: 'Fixed Schedule Commuter',
      icon: '⚡',
  // Route profiles replace personas — each represents a journey agenda
  const routeProfiles = [
    {
      id: 'home_work',
      label: 'Home → Work',
      icon: '🏠',
      days: 'Mon - Fri',
      origin: 'central',
      destination: 'raffles',
      departure: '07:40',
      earliest: '07:20',
      deadline: '08:45',
      latestAllowed: '08:45',
      buffer: 5,
      maxWalk: 25,
      priority: 'reliable',
      shelter: false,
      stepFree: false,
      walkSpeed: 75
      walkSpeed: 75,
      monitoring: true
    },
    arjun: {
      id: 'arjun',
      name: 'Arjun',
      tagline: 'Comfort & Weather Flexible',
      icon: '🍃',
      origin: 'central',
      destination: 'marina',
      departure: '07:45',
      earliest: '07:15',
      deadline: '08:50',
      buffer: 5,
      maxWalk: 30,
    {
      id: 'work_home',
      label: 'Work → Home',
      icon: '💼',
      days: 'Mon - Fri',
      origin: 'raffles',
      destination: 'central',
      departure: '18:00',
      earliest: '17:30',
      deadline: '19:30',
      latestAllowed: '19:30',
      buffer: 10,
      maxWalk: 25,
      priority: 'comfort',
      shelter: true,
      shelter: false,
      stepFree: false,
      walkSpeed: 75
      walkSpeed: 75,
      monitoring: true
    },
    mdmLim: {
      id: 'mdmLim',
      name: 'Mdm Lim',
      tagline: 'Accessible & Step-Free',
      icon: '♿',
    {
      id: 'weekend_visit',
      label: 'Weekend',
      icon: '🌿',
      days: 'Sat - Sun',
      origin: 'central',
      destination: 'raffles',
      departure: '07:30',
      earliest: '07:00',
      deadline: '08:45',
      departure: '10:00',
      earliest: '09:30',
      deadline: '11:30',
      latestAllowed: '11:30',
      buffer: 10,
      maxWalk: 30,
      priority: 'walking',
      shelter: true,
      stepFree: true,
      walkSpeed: 50
      priority: 'comfort',
      shelter: false,
      stepFree: false,
      walkSpeed: 75,
      monitoring: false
    }
  ];

  // Backward-compat personas alias (maps to routeProfiles)
  const personas = {
    rachel: { ...routeProfiles[0], name: 'Rachel', tagline: 'Fixed Schedule Commuter' },
    arjun:  { ...routeProfiles[1], name: 'Arjun',  tagline: 'Comfort & Weather Flexible' },
    mdmLim: { ...routeProfiles[2], name: 'Mdm Lim', tagline: 'Accessible & Step-Free' }
  };

  const defaults = Object.freeze({
    origin: 'central',
    destination: 'raffles',
    journeyDate,
    departure: '07:40',
    earliest: '07:20',
    deadline: '08:45',
    latestAllowed: '08:45',
    buffer: 5,
    maxWalk: 25,
    priority: 'reliable',
    shelter: false,
    stepFree: false,
    walkSpeed: 75,
    persona: 'rachel',
    activeProfile: 'home_work',
    monitoring: true
  });

  const scenarios = {
    normal: {
      name: 'Normal Service Replay',
      description: 'Replay: Both Rail Routes Are Operating Normally.',
      rail: 'Normal Service In Replay',
      railDetail: 'No Injected Disruption.',
      weather: 'Dry Weather',
      weatherDetail: 'Replay Condition.',
      crowd: 'Moderate',
      crowdDetail: 'Replay Station Crowding.'
    },
    delay: {
      name: 'EWL Disruption Replay',
      description: 'Replay: City-Bound EWL Delay Affects Paya Lebar - Bugis. Alternative Recommended.',
      rail: 'EWL Delay · Replay',
      railDetail: 'Paya Lebar - Bugis, Towards Tuas Link. Assumed 15 - 25 Extra Minutes.',
      weather: 'Dry Weather',
      weatherDetail: 'Replay Condition.',
      crowd: 'High On EWL',
      crowdDetail: 'Additional Boarding Allowance Is Included.'
    },
    crowd: {
      name: 'Crowding Replay',
      description: 'Replay: High EWL Crowding Increases Boarding Allowance.',
      rail: 'Both Lines Operating',
      railDetail: 'Replay: No Closure.',
      weather: 'Dry Weather',
      weatherDetail: 'Replay Condition.',
      crowd: 'High On EWL',
      crowdDetail: 'DTL Crowding Is Moderate In This Replay.'
    },
    rain: {
      name: 'Heavy Rain Replay',
      description: 'Replay: Rain Slows Exposed Walking Legs. Sheltered Paths Favoured.',
      rail: 'Both Lines Operating',
      railDetail: 'Replay: No Closure.',
      weather: 'Heavy Rain',
      weatherDetail: 'Applied To Uncovered Walking Paths.',
      crowd: 'Moderate',
      crowdDetail: 'Replay Station Crowding.'
    },
    planned: {
      name: 'Planned Closure Replay',
      description: 'Replay: Scheduled EWL Maintenance Closure During Commute Window.',
      rail: 'Scheduled EWL Closure',
      railDetail: 'Replay Window: 05:30 - 10:00 On Selected Date.',
      weather: 'Unknown',
      weatherDetail: 'Future Weather Is Not Assumed.',
      crowd: 'Unknown',
      crowdDetail: 'No Crowd Forecast For This Replay.'
    },
    offline: {
      name: 'Offline Replay',
      description: 'Offline: Cached OSM Routes Available. Service Conditions Unknown.',
      description: 'Offline: Cached Routes Available. Service Conditions Unknown.',
      rail: 'Unknown',
      railDetail: 'Offline; No Current Verification.',
      weather: 'Unknown',
      weatherDetail: 'Offline; No Current Verification.',
      crowd: 'Unknown',
      crowdDetail: 'Offline; No Current Verification.'
    },
    live: {
      name: 'Official Feeds',
      description: 'Current Official Feeds Applied When Time Windows Match.',
      rail: 'Checking Official Feeds',
      railDetail: 'Live Status From LTA DataMall.',
      weather: 'Checking Weather',
      weatherDetail: 'Official 2-Hour Forecast From Data.Gov.Sg.',
      crowd: 'Unknown',
      crowdDetail: 'LTA DataMall Configuration Required.'
    }
  };

  function minutes(v){
    const m = /^(\d{2}):(\d{2})$/.exec(v);
    if (!m || +m[1] > 23 || +m[2] > 59) throw new Error('Enter A Valid Time.');
    return +m[1] * 60 + +m[2];
  }

  function clock(v){
    v = Math.round(v);
    return String(Math.floor(v / 60) % 24).padStart(2, '0') + ':' + String(v % 60).padStart(2, '0');
  }

  function validate(input){
    const p = { ...defaults, ...input };
    if ((!origins[p.origin] && p.origin !== 'custom') || (!destinations[p.destination] && p.destination !== 'custom'))
      throw new Error('Choose A Supported Place Or A Point On The Map.');
    if (p.origin === 'custom' && !Geo.inBounds(p.originCoord, 'origin'))
      throw new Error('Choose A Start In The Tampines Coverage Area.');
    if (p.destination === 'custom' && !Geo.inBounds(p.destinationCoord, 'destination'))
      throw new Error('Choose A Destination In The CBD Coverage Area.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.journeyDate) || Number.isNaN(Date.parse(p.journeyDate + 'T00:00:00+08:00')) || dateSG(new Date(p.journeyDate + 'T00:00:00+08:00')) !== p.journeyDate)
      throw new Error('Choose A Valid Journey Date.');
    const a = minutes(p.earliest), b = minutes(p.departure), c = minutes(p.deadline);
    if (a > b || b >= c)
      throw new Error('Earliest Departure Must Be At Or Before Your Usual Departure, And Arrival Must Be Later On The Same Day.');
    if (a < 330 || c > 1410)
      throw new Error('This Planner Covers Journeys From 05:30 To 23:30; Overnight Service Is Not Modelled.');
    p.buffer = Number(p.buffer);
    p.maxWalk = Number(p.maxWalk);
    if (!Number.isInteger(p.buffer) || p.buffer < 0 || p.buffer > 20)
      throw new Error('Use An Arrival Buffer From 0 To 20 Minutes.');
    if (!Number.isInteger(p.maxWalk) || p.maxWalk < 5 || p.maxWalk > 60)
      throw new Error('Use A Walking Limit From 5 To 60 Minutes.');
    if (!['reliable', 'walking', 'comfort'].includes(p.priority))
      throw new Error('Choose A Valid Travel Priority.');
    p.shelter = !!p.shelter;
    p.stepFree = !!p.stepFree;
    p.walkSpeed = Number(p.walkSpeed) || (p.stepFree ? 50 : 75);
    p.persona = String(p.persona || 'rachel');
    p.activeProfile = String(p.activeProfile || 'home_work');
    // latestAllowed defaults to deadline if not set
    if (!p.latestAllowed) p.latestAllowed = p.deadline;
    p.monitoring = !!p.monitoring;
    return p;
  }

  function applies(segment, rail){
    const codes = String(segment.Stations || '').split(/[,;\s]+/).filter(Boolean);
    const ours = new Set(rail.stops.map(s => s.code));
    if (!codes.some(c => ours.has(c))) return false;
    const direction = String(segment.Direction || '').toLowerCase();
    return direction === 'both' || direction.includes(rail.direction.toLowerCase());
  }

  function liveEffect(snapshot, p, rail, now = Date.now(), accessMinutes = 0){
    const departure = Date.parse(p.journeyDate + 'T' + p.departure + ':00+08:00');
    const imminent = departure >= now - 60000 && departure <= now + 3600000;
    const fresh = feed => feed?.status === 'ok' && now - Date.parse(feed.fetchedAt) >= 0 && now - Date.parse(feed.fetchedAt) < feed.ttlMs;
    const railFresh = fresh(snapshot?.rail) && imminent && !(snapshot.rail.data.Status === 2 && !snapshot.rail.data.AffectedSegments?.length);
    const segments = railFresh ? (snapshot.rail.data.AffectedSegments || []).filter(s => applies(s, rail)) : [];
    const rainValid = fresh(snapshot?.weather) && departure >= Date.parse(snapshot.weather.data.validStart) && departure <= Date.parse(snapshot.weather.data.validEnd);
    const wet = rainValid && snapshot.weather.data.forecasts.some(f => ['Tampines', 'City'].includes(f.area) && /rain|showers|thunder/i.test(f.forecast));
    const line = rail.stops[0].code.startsWith('EW') ? 'ewl' : 'dtl';
    const boardingAt = departure + accessMinutes * 60000;
    const matching = feed => fresh(feed) ? (feed.data || []).filter(r => r.Station === rail.stops[0].code && Date.parse(r.StartTime) <= boardingAt && Date.parse(r.EndTime) > boardingAt && ['l', 'm', 'h'].includes(r.CrowdLevel)) : [];
    let rows = imminent ? matching(snapshot?.crowd?.[line]) : [];
    let crowdSource = rows.length ? 'observation' : 'unknown';
    if (!rows.length) {
      rows = matching(snapshot?.forecast?.[line]);
      if (rows.length) crowdSource = 'forecast';
    }
    const levels = rows.map(r => r.CrowdLevel);
    const crowd = levels.includes('h') ? 'High' : levels.includes('m') ? 'Moderate' : levels.includes('l') ? 'Low' : 'Unknown';
    return {
      blocked: segments.length > 0,
      segments,
      rain: !!wet,
      crowd,
      crowdSource,
      boardingAt: new Date(boardingAt).toISOString(),
      uncertain: !railFresh || crowd === 'Unknown',
      railKnown: railFresh,
      weatherKnown: !!rainValid
    };
  }

  function plan(input, scenarioId = 'normal', snapshot = null, now = Date.now()){
    const p = validate(input);
    if (!scenarios[scenarioId]) throw new Error('Unknown Scenario.');
    const origin = p.origin === 'custom' ? { name: 'Selected Tampines Start', short: 'Your Start', coord: p.originCoord } : origins[p.origin];
    const destination = p.destination === 'custom' ? { name: 'Selected CBD Destination', short: 'Your Destination', coord: p.destinationCoord } : destinations[p.destination];
    const preferred = minutes(p.departure), deadline = minutes(p.deadline), target = deadline - p.buffer;
    const today = dateSG(new Date(now));
    const scenarioClock = scenarioId === 'live' ? (p.journeyDate === today ? nowSG(new Date(now)) : 0) : Math.min(440, minutes(p.earliest));
    if (scenarioId === 'live' && (p.journeyDate < today || (p.journeyDate === today && deadline <= scenarioClock)))
      throw new Error('This Arrival Deadline Has Passed. Choose A Future Time Or Date.');
    const earliest = Math.max(minutes(p.earliest), scenarioClock);

    const routes = ['ewl', 'dtl'].map(id => {
      const geo = Geo.candidate(id, origin.coord, destination.coord, p.shelter, p.stepFree, p.walkSpeed);
      const isEwl = id === 'ewl';
      const baseRide = Math.ceil(geo.rail.metres / 1000 / (isEwl ? 42 : 39) * 60 + (geo.rail.stops.length - 2) * 0.45);

      function evaluate(departureOverride){
        const live = scenarioId === 'live' ? liveEffect(snapshot, { ...p, departure: clock(departureOverride) }, geo.rail, now, geo.access.minutes + 2) : null;
        const crowd = live ? live.crowd : ['offline', 'planned'].includes(scenarioId) ? 'Unknown' : isEwl && ['crowd', 'delay'].includes(scenarioId) ? 'High' : 'Moderate';
        const rainOn = scenarioId === 'rain' || live?.rain;
        const rain = rainOn ? Math.ceil((geo.access.exposed + geo.egress.exposed) / p.walkSpeed * 0.35) : 0;
        const delay = isEwl && scenarioId === 'delay' ? 15 : 0;
        const boardingMin = crowd === 'High' ? 5 : 2;
        const boardingMax = crowd === 'High' ? 14 : crowd === 'Unknown' ? 12 : 7;
        const min = geo.walk + baseRide + boardingMin + 4 + rain + delay;
        const max = geo.walk + Math.ceil(baseRide * 1.15) + boardingMax + 4 + rain + (delay ? 25 : 0) + (live?.uncertain ? 3 : 0);
        const latest = Math.floor((target - max) / 5) * 5;
        const leave = departureOverride ?? Math.max(earliest, Math.min(preferred, latest));
        const late = Math.max(0, leave + max - deadline);

        let railElapsed = 0;
        const plannedBlocked = scenarioId === 'planned' && isEwl && geo.rail.segments.some(s => {
          const duration = s.metres / 1000 / 42 * 60 + 0.45;
          const entry = leave + geo.access.minutes + 2 + boardingMin + railElapsed;
          const exit = leave + geo.access.minutes + 2 + boardingMax + (railElapsed + duration) * 1.15;
          railElapsed += duration;
          return ['EW8', 'EW9', 'EW10', 'EW11'].includes(s.from) && entry < 600 && exit > 330;
        });
        const blocked = plannedBlocked || !!live?.blocked;
        const affectedSegments = geo.rail.segments.filter(s =>
          (isEwl && (scenarioId === 'delay' || plannedBlocked) && ['EW8', 'EW9', 'EW10', 'EW11'].includes(s.from)) ||
          live?.segments.some(a => String(a.Stations).split(/[,;\s]+/).includes(s.from) && String(a.Stations).split(/[,;\s]+/).includes(s.to))
        );
        const score = late * 100 + Math.max(0, leave + max - target) * 20 + Math.max(0, preferred - leave) * 1.4 + max +
          (p.priority === 'walking' ? geo.walk * 3 : 0) + (p.priority === 'comfort' && crowd === 'High' ? 35 : 0) +
          (p.stepFree && geo.hasSteps ? 200 : 0) + (isEwl ? 0 : 3);

        const explanation = live && !live.railKnown ? 'Current Rail Conditions Unverified. Extra Buffer Added.' :
          blocked ? 'Affected Rail Stretch Excluded. Bypass Selected.' :
          rainOn ? 'Rain Allowance Applied To Exposed Paths.' :
          crowd === 'High' ? 'High Station Crowding. Extra Boarding Buffer Included.' :
          p.stepFree ? 'Step-Free Paths Prioritised. Stairs Bypassed.' :
          p.stepFree ? 'Lift-Accessible Paths Selected. Stairs Bypassed.' :
          'Optimal Route Based On Walking, Rail Speed And Schedule Buffer.';

        return {
          id,
          name: isEwl ? 'East–West Line' : 'Downtown Line',
          code: isEwl ? 'EWL' : 'DTL',
          station: isEwl ? 'Raffles Place' : 'Downtown',
          geo,
          walk: geo.walk,
          ride: baseRide,
          min,
          max,
          leave,
          arrivalMin: leave + min,
          arrivalMax: leave + max,
          usualArrivalMin: preferred + min,
          usualArrivalMax: preferred + max,
          late,
          blocked,
          walkExceeded: geo.walk > p.maxWalk,
          crowd,
          score,
          rain,
          delay,
          boarding: boardingMin,
          boardingMax,
          affectedSegments,
          live,
          hasSteps: geo.hasSteps,
          stepFree: p.stepFree,
          baselineMax: max - (delay ? 25 : 0) - rain - (crowd === 'High' ? 7 : 0),
          explanation
        };
      }

      if (scenarioId !== 'live') return evaluate();
      const departures = new Set([earliest, Math.max(earliest, preferred)]);
      for (let t = Math.ceil(earliest / 5) * 5; t <= preferred; t += 5) departures.add(t);
      return [...departures].map(evaluate).sort((a, b) => Number(a.blocked) - Number(b.blocked) || a.score - b.score)[0];
    });

    const viable = routes.filter(r => !r.blocked && !r.walkExceeded).sort((a, b) => a.score - b.score);
    const recommendation = viable[0] || null;
    const changed = !!recommendation && (recommendation.id !== 'ewl' || recommendation.leave !== preferred || recommendation.late > 0);
    const stale = scenarioId === 'offline' || (scenarioId === 'live' && routes.some(r => !r.live.railKnown));
    const actionable = scenarioId !== 'live' || routes.some(r => r.live.blocked || r.rain || r.crowd === 'High');

    return {
      preferences: p,
      scenarioId,
      scenario: { ...scenarios[scenarioId] },
      routeProfiles,
      personas,
      origin,
      destination,
      routes,
      recommendation,
      deadline,
      preferred,
      target,
      changed,
      needsAlert: !!(p.monitoring && scenarioId !== 'offline' && actionable && (changed || !recommendation)),
      stale,
      snapshot,
      scenarioClock,
      calculatedAt: new Date(now).toISOString()
    };
  }

  function steps(result, route){
    const text = leg => leg.directions.map(d => `${d.name}${d.covered ? ' (Covered)' : ''}, ${d.metres} M`).join(' ➔ ');
    return [
      {
        title: 'Walk To Tampines MRT · Exit ' + route.geo.access.entrance.ref,
        detail: `${route.geo.access.metres} M · ${route.geo.access.minutes} Min. ${text(route.geo.access)}.`,
        time: clock(route.leave),
        mode: 'walk'
      },
      {
        title: 'Board ' + route.name,
        detail: `Head Towards Platform Signposted For ${route.geo.rail.direction}. Boarding Allowance: ${route.boarding} - ${route.boardingMax} Min.`,
        time: clock(route.leave + route.geo.access.minutes + 2),
        mode: 'train'
      },
      {
        title: 'Alight At ' + route.station,
        detail: `${route.geo.rail.stops.length - 1} Stops · ${route.ride + route.delay} Min In Train. ${route.geo.rail.stops.slice(1).map(s => s.name).join(' ➔ ')}.`,
        time: 'No transfers',
        time: 'No Transfers',
        mode: 'train'
      },
      {
        title: 'Exit ' + route.geo.egress.entrance.ref + ' · Walk To ' + result.destination.short,
        detail: `${route.geo.egress.metres} M · ${route.geo.egress.minutes} Min. ${text(route.geo.egress)}.`,
        time: clock(route.arrivalMin) + ' - ' + clock(route.arrivalMax),
        mode: 'walk'
      }
    ];
  }

  const api = { defaults, scenarios, personas, origins, destinations, minutes, clock, validate, plan, steps, dateSG, nowSG, liveEffect, applies };
  const api = { defaults, scenarios, routeProfiles, personas, origins, destinations, minutes, clock, validate, plan, steps, dateSG, nowSG, liveEffect, applies };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SmartCommEngine = api;
})(globalThis);
