const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/planner.js');

test('normal commute stays quiet and keeps Rachel’s usual departure', () => {
  const p = E.plan(E.defaults, 'normal');
  assert.equal(p.recommendation.id, 'ewl');
  assert.equal(p.recommendation.leave, E.minutes('07:40'));
  assert.equal(p.needsAlert, false);
});
test('relevant disruption recommends a usable bypass within the deadline', () => {
  const p = E.plan(E.defaults, 'delay');
  assert.equal(p.recommendation.id, 'dtl');
  assert.ok(p.recommendation.arrivalMax <= p.deadline - E.defaults.buffer);
  assert.ok(p.recommendation.leave >= E.minutes(E.defaults.earliest));
  assert.equal(p.needsAlert, true);
});
test('arrival deadline is configurable and an impossible deadline is reported honestly', () => {
  const p = E.plan({ ...E.defaults, deadline: '08:00' }, 'delay');
  assert.ok(p.recommendation.late > 0);
  assert.equal(p.deadline, E.minutes('08:00'));
});
test('closed EWL is never recommended in a planned closure', () => {
  const p = E.plan(E.defaults, 'planned');
  assert.equal(p.routes.find(r => r.id === 'ewl').blocked, true);
  assert.equal(p.recommendation.id, 'dtl');
});
test('walking limits are constraints, never silently overridden', () => {
  const p = E.plan({ ...E.defaults, maxWalk: 5 }, 'normal');
  assert.equal(p.recommendation, null);
  assert.equal(p.needsAlert, true);
});
test('rain affects travel time, and shelter changes the rain allowance', () => {
  const dry = E.plan(E.defaults, 'normal');
  const wet = E.plan(E.defaults, 'rain');
  const sheltered = E.plan({ ...E.defaults, shelter: true }, 'rain');
  assert.ok(wet.routes[0].max > dry.routes[0].max);
  assert.ok(sheltered.routes[0].rain < wet.routes[0].rain);
  assert.ok(sheltered.routes[0].geo.access.exposed + sheltered.routes[0].geo.egress.exposed < wet.routes[0].geo.access.exposed + wet.routes[0].geo.egress.exposed);
});
test('crowding preference can change the recommendation', () => {
  assert.equal(E.plan(E.defaults, 'crowd').recommendation.id, 'ewl');
  assert.equal(E.plan({ ...E.defaults, priority: 'comfort' }, 'crowd').recommendation.id, 'dtl');
});
test('offline data is marked stale and never generates a new disruption alert', () => {
  const p = E.plan(E.defaults, 'offline');
  assert.equal(p.stale, true);
  assert.equal(p.needsAlert, false);
});
test('pausing alerts leaves route planning functional', () => {
  const p = E.plan({ ...E.defaults, monitoring: false }, 'delay');
  assert.equal(p.needsAlert, false);
  assert.equal(p.recommendation.id, 'dtl');
});
test('invalid schedules and unsupported endpoints fail deliberately', () => {
  assert.throws(() => E.plan({ ...E.defaults, earliest: '08:00' }));
  assert.throws(() => E.plan({ ...E.defaults, deadline: '25:00' }));
  assert.throws(() => E.plan({ ...E.defaults, origin: 'unknown' }));
  assert.throws(() => E.plan(E.defaults, 'unknown'));
});
test('no recommended departure is before the scenario clock or earliest permission', () => {
  for (const s of Object.keys(E.scenarios)) for (const deadline of ['08:00', '08:45', '10:00']) {
    const p = E.plan({ ...E.defaults, earliest: '06:00', deadline }, s);
    if (p.recommendation) {
      assert.ok(p.recommendation.leave >= p.scenarioClock);
      assert.ok(p.recommendation.leave >= E.minutes(p.preferences.earliest));
    }
  }
});
test('directions contain walking at both ends and no invented transfer', () => {
  const p = E.plan(E.defaults, 'delay');
  const steps = E.steps(p, p.recommendation);
  assert.equal(steps[0].mode, 'walk');
  assert.equal(steps.at(-1).mode, 'walk');
  assert.equal(steps[2].time, 'No transfers');
});
