const test=require('node:test'),assert=require('node:assert/strict');
const G=require('../dist/geo.js'),E=require('../dist/planner.js');
const {normalizeRail,normalizeWeather,normalizeCrowd}=require('../lib/feeds.cjs');
test('OSM geometry contains walking at both ends and an actual rail path',()=>{
  const p=E.plan(E.defaults,'delay'),r=p.recommendation;
  assert.ok(r.geo.access.geometry.length>10);assert.ok(r.geo.egress.geometry.length>10);
  assert.ok(r.geo.rail.geometry.length>30);assert.ok(r.geo.rail.metres>15000);
  assert.deepEqual(r.geo.access.geometry[0],p.origin.coord);
  assert.deepEqual(r.geo.egress.geometry.at(-1),p.destination.coord);
  assert.ok(r.geo.access.entrance.ref);assert.ok(r.geo.egress.entrance.ref);
});
test('new endpoints generate different connected walking geometry',()=>{
  const a=E.plan(E.defaults),b=E.plan({...E.defaults,origin:'avenue',destination:'marina'});
  assert.notDeepEqual(a.routes[0].geo.access.geometry,b.routes[0].geo.access.geometry);
  assert.notDeepEqual(a.routes[0].geo.egress.geometry,b.routes[0].geo.egress.geometry);
});
test('unmapped points and disconnected paths fail instead of drawing invented routes',()=>{
  assert.throws(()=>G.candidate('ewl',[1.4,103.7],[1.2845,103.851]));
  assert.throws(()=>G.candidate('ewl',[1.3557,103.9463],[1.2845,103.851]));
});
test('closure outside its effective hours does not block the rail route',()=>{
  const p=E.plan({...E.defaults,earliest:'10:15',departure:'10:30',deadline:'12:00'},'planned');
  assert.equal(p.routes[0].blocked,false);assert.equal(p.routes[0].affectedSegments.length,0);
});
test('closure uses affected-section traversal and the calculated departure',()=>{
  const after=E.plan({...E.defaults,earliest:'09:50',departure:'09:50',deadline:'11:30'},'planned').routes[0];
  assert.equal(after.blocked,false,'The affected section is reached after the closure ends.');
  const earlier=E.plan({...E.defaults,earliest:'09:00',departure:'10:00',deadline:'10:40'},'planned').routes[0];
  assert.ok(earlier.leave<600);
  assert.equal(earlier.blocked,true,'Leaving earlier to meet the deadline overlaps the closure.');
});
test('opposite direction and unrelated stations do not affect Rachel',()=>{
  const rail=G.network.rail.ewl;
  assert.equal(E.applies({Stations:'EW8,EW9',Direction:'towards Tuas Link'},rail),true);
  assert.equal(E.applies({Stations:'EW8,EW9',Direction:'towards Pasir Ris'},rail),false);
  assert.equal(E.applies({Stations:'NS1,NS2',Direction:'Both'},rail),false);
});
test('official alert parser preserves nested segments and separate messages',()=>{
  const raw={value:{Status:2,AffectedSegments:[{Line:'EWL',Stations:'EW8,EW9',Direction:'Both',FreePublicBus:'EW8',FreeMRTShuttle:'EW8,EW9'}],Message:[{Content:'Test advisory',CreatedDate:'2026-09-18T07:00:00+08:00'}]}};
  const parsed=normalizeRail(raw);assert.equal(parsed.AffectedSegments[0].FreePublicBus,'EW8');assert.equal(parsed.Message[0].Content,'Test advisory');
  assert.throws(()=>normalizeRail({value:{Status:2}}));
});
test('unknown crowding is retained, and weather validity is extracted',()=>{
  assert.equal(normalizeCrowd({value:[{Station:'EW2',CrowdLevel:'NA'}]})[0].CrowdLevel,'NA');
  const w=normalizeWeather({data:{items:[{valid_period:{start:'a',end:'b'},forecasts:[{area:'City',forecast:'Heavy Rain'},{area:'Tampines',forecast:'Showers'},{area:'Tuas',forecast:'Fair'}]}]}});
  assert.equal(w.validStart,'a');assert.equal(w.forecasts.length,2);
});
test('stale or future-dated conditions never masquerade as current travel information',()=>{
  const now=Date.parse('2026-09-18T07:20:00+08:00'),p={...E.defaults,journeyDate:'2026-09-18'};
  const rail={status:'ok',fetchedAt:new Date(now).toISOString(),ttlMs:60000,data:{Status:2,AffectedSegments:[{Line:'EWL',Direction:'Both',Stations:'EW8,EW9'}],Message:[]}};
  assert.equal(E.liveEffect({rail},p,G.network.rail.ewl,now).blocked,true);
  assert.equal(E.liveEffect({rail:{...rail,status:'stale'}},p,G.network.rail.ewl,now).blocked,false);
  assert.equal(E.liveEffect({rail},{...p,journeyDate:'2026-09-19'},G.network.rail.ewl,now).railKnown,false);
});
