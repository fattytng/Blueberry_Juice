const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../dist/planner.js'),G=require('../dist/geo.js'),S=require('../dist/session.js');
const {normalizeCrowdForecast}=require('../lib/feeds.cjs');
const now=Date.parse('2026-09-18T07:20:00+08:00');
const feed=data=>({status:'ok',fetchedAt:new Date(now).toISOString(),ttlMs:3600000,data});
const row=(Station,CrowdLevel,start='07:30',end='08:00')=>({Station,CrowdLevel,StartTime:`2026-09-18T${start}:00+08:00`,EndTime:`2026-09-18T${end}:00+08:00`});
const prefs={...E.defaults,journeyDate:'2026-09-18'};
function memory(){const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};}

test('nested forecasts preserve dates and become half-hour intervals',()=>{
  const rows=normalizeCrowdForecast({value:[{Date:'2026-09-18T00:00:00+08:00',Stations:[{Station:'EW2',Interval:[{Start:'2026-09-18T07:30:00+08:00',CrowdLevel:'h'}]}]}]});
  assert.equal(rows[0].Station,'EW2');assert.equal(rows[0].CrowdLevel,'h');
  assert.equal(Date.parse(rows[0].EndTime)-Date.parse(rows[0].StartTime),1800000);
  assert.throws(()=>normalizeCrowdForecast({value:[{Stations:[{Interval:[{Start:'invalid'}]}]}]}));
});
test('crowding uses boarding-station arrival, not home departure or other stations',()=>{
  const snapshot={crowd:{ewl:feed([row('EW2','l'),row('EW8','h')])},forecast:{ewl:feed([row('EW2','m','08:00','08:30')])}};
  assert.equal(E.liveEffect(snapshot,prefs,G.network.rail.ewl,now,10).crowd,'Low');
  const later=E.liveEffect(snapshot,prefs,G.network.rail.ewl,now,20);
  assert.equal(later.crowd,'Moderate');assert.equal(later.crowdSource,'forecast');
});
test('forecasts only apply inside their dated window and never when stale',()=>{
  const snapshot={forecast:{ewl:feed([row('EW2','h')])}};
  assert.equal(E.liveEffect(snapshot,prefs,G.network.rail.ewl,now).crowdSource,'forecast');
  assert.equal(E.liveEffect(snapshot,{...prefs,journeyDate:'2026-09-19'},G.network.rail.ewl,now).crowd,'Unknown');
  snapshot.forecast.ewl.status='stale';
  assert.equal(E.liveEffect(snapshot,prefs,G.network.rail.ewl,now).crowd,'Unknown');
});
test('live planning rechecks crowding at the selected departure',()=>{
  const snapshot={rail:feed({Status:1,AffectedSegments:[],Message:[]}),forecast:{ewl:feed([row('EW2','h','07:30','08:00'),row('EW2','l','07:00','07:30')]),dtl:feed([row('DT32','m','07:00','08:30')])}};
  const plan=E.plan(prefs,'live',snapshot,now);
  for(const r of plan.routes){
    const expected=E.liveEffect(snapshot,{...prefs,departure:E.clock(r.leave)},r.geo.rail,now,r.geo.access.minutes+2);
    assert.equal(r.crowd,expected.crowd);
    assert.equal(r.live.boardingAt,expected.boardingAt);
    assert.ok(r.leave>=E.minutes(prefs.earliest));
  }
});
test('missing live data does not create an urgent disruption notification',()=>{
  assert.equal(E.plan(prefs,'live',null,now).needsAlert,false);
});
test('saved journey restores original advice and progress after deadline passes',()=>{
  const storage=memory();
  const plan=E.plan(prefs,'live',null,now);
  const record={version:1,preferences:prefs,scenario:'live',route:plan.recommendation.id,step:2,startedAt:new Date(now).toISOString(),calculatedAt:plan.calculatedAt,snapshot:null};
  assert.equal(S.persist(storage,record),true);
  const restored=S.restore(storage,now+3*3600000);
  assert.equal(restored.record.step,2);assert.equal(restored.plan.recommendation.leave,plan.recommendation.leave);
  assert.equal(S.restore(storage,now+19*3600000),null);
});
test('invalid saved progress is discarded and ending clears the saved journey',()=>{
  const storage=memory();S.persist(storage,{version:1,step:99});assert.equal(S.restore(storage,now),null);
  S.persist(storage,{version:1});assert.equal(S.persist(storage,null),true);assert.equal(S.restore(storage,now),null);
});
