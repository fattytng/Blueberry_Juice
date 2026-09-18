(function(root){
  'use strict';
  const Geo=typeof module!=='undefined'&&module.exports?require('./geo.js'):root.SmartCommGeo;
  const dateSG=(now=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const nowSG=(now=new Date())=>minutes(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Singapore',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now));
  const journeyDate=dateSG(new Date(Date.now()+(nowSG()>440?86400000:0)));
  const origins={central:{name:'Tampines Central 1',short:'Tampines Central 1',coord:[1.354,103.942]},avenue:{name:'Tampines Avenue 4',short:'Tampines Avenue 4',coord:[1.35,103.945]}};
  const destinations={raffles:{name:'One Raffles Place',short:'One Raffles Place',coord:[1.2845,103.851]},marina:{name:'Marina Bay Financial Centre',short:'Marina Bay Financial Centre',coord:[1.27955,103.8543]}};
  const defaults=Object.freeze({origin:'central',destination:'raffles',journeyDate,departure:'07:40',earliest:'07:20',deadline:'08:45',buffer:5,maxWalk:25,priority:'reliable',shelter:false,monitoring:true});
  const scenarios={
    normal:{name:'Normal service replay',description:'Replay: both rail routes are operating normally.',rail:'Normal service in replay',railDetail:'No injected disruption.',weather:'Dry weather',weatherDetail:'Replay condition.',crowd:'Moderate',crowdDetail:'Replay station crowding.'},
    delay:{name:'EWL disruption replay',description:'Replay: a city-bound EWL delay affects Paya Lebar–Bugis. Compare a route that avoids it.',rail:'EWL delay · replay',railDetail:'Paya Lebar–Bugis, towards Tuas Link. Assumed 15–25 extra minutes.',weather:'Dry weather',weatherDetail:'Replay condition.',crowd:'High on EWL',crowdDetail:'Additional boarding allowance is included.'},
    crowd:{name:'Crowding replay',description:'Replay: high EWL crowding increases the boarding allowance. Your priority changes the trade-off.',rail:'Both lines operating',railDetail:'Replay: no closure.',weather:'Dry weather',weatherDetail:'Replay condition.',crowd:'High on EWL',crowdDetail:'DTL crowding is moderate in this replay.'},
    rain:{name:'Heavy rain replay',description:'Replay: rain slows exposed walking legs. Sheltered OSM paths receive preference when requested.',rail:'Both lines operating',railDetail:'Replay: no closure.',weather:'Heavy rain',weatherDetail:'Applied to uncovered and unclassified OSM walking edges.',crowd:'Moderate',crowdDetail:'Replay station crowding.'},
    planned:{name:'Planned closure replay',description:'Replay: the EWL affected section is closed from 05:30 to 10:00 on your selected travel date.',rail:'Scheduled EWL closure',railDetail:'Replay effective window: 05:30–10:00 on the selected date.',weather:'Unknown',weatherDetail:'Future weather is not assumed.',crowd:'Unknown',crowdDetail:'No crowd forecast is available for this replay.'},
    offline:{name:'Offline replay',description:'Offline replay: cached OSM routes remain available. Current service conditions are unknown.',rail:'Unknown',railDetail:'Offline; no current verification.',weather:'Unknown',weatherDetail:'Offline; no current verification.',crowd:'Unknown',crowdDetail:'Offline; no current verification.'},
    live:{name:'Official feeds',description:'Current official feeds are applied only when their time windows match your journey.',rail:'Checking official feeds',railDetail:'Availability and source times appear below.',weather:'Checking weather',weatherDetail:'Official data.gov.sg nowcast.',crowd:'Unknown',crowdDetail:'LTA DataMall configuration is required.'}
  };
  function minutes(v){const m=/^(\d{2}):(\d{2})$/.exec(v);if(!m||+m[1]>23||+m[2]>59)throw new Error('Enter a valid time.');return +m[1]*60+ +m[2];}
  function clock(v){v=Math.round(v);return String(Math.floor(v/60)%24).padStart(2,'0')+':'+String(v%60).padStart(2,'0');}
  function validate(input){
    const p={...defaults,...input};
    if((!origins[p.origin]&&p.origin!=='custom')||(!destinations[p.destination]&&p.destination!=='custom'))throw new Error('Choose a supported place or a point on the map.');
    if(p.origin==='custom'&&!Geo.inBounds(p.originCoord,'origin'))throw new Error('Choose a start in the Tampines coverage area.');
    if(p.destination==='custom'&&!Geo.inBounds(p.destinationCoord,'destination'))throw new Error('Choose a destination in the CBD coverage area.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(p.journeyDate)||Number.isNaN(Date.parse(p.journeyDate+'T00:00:00+08:00'))||dateSG(new Date(p.journeyDate+'T00:00:00+08:00'))!==p.journeyDate)throw new Error('Choose a valid journey date.');
    const a=minutes(p.earliest),b=minutes(p.departure),c=minutes(p.deadline);
    if(a>b||b>=c)throw new Error('Earliest departure must be at or before your usual departure, and arrival must be later on the same day.');
    if(a<330||c>1410)throw new Error('This planner covers journeys from 05:30 to 23:30; overnight service is not modelled.');
    p.buffer=Number(p.buffer);p.maxWalk=Number(p.maxWalk);
    if(!Number.isInteger(p.buffer)||p.buffer<0||p.buffer>20)throw new Error('Use an arrival buffer from 0 to 20 minutes.');
    if(!Number.isInteger(p.maxWalk)||p.maxWalk<5||p.maxWalk>60)throw new Error('Use a walking limit from 5 to 60 minutes.');
    if(!['reliable','walking','comfort'].includes(p.priority))throw new Error('Choose a valid travel priority.');
    p.shelter=!!p.shelter;p.monitoring=!!p.monitoring;return p;
  }
  function applies(segment,rail){
    const codes=String(segment.Stations||'').split(/[,;\s]+/).filter(Boolean),ours=new Set(rail.stops.map(s=>s.code));
    if(!codes.some(c=>ours.has(c)))return false;
    const direction=String(segment.Direction||'').toLowerCase();
    return direction==='both'||direction.includes(rail.direction.toLowerCase());
  }
  function liveEffect(snapshot,p,rail,now=Date.now(),accessMinutes=0){
    const departure=Date.parse(p.journeyDate+'T'+p.departure+':00+08:00'),imminent=departure>=now-60000&&departure<=now+3600000;
    const fresh=feed=>feed?.status==='ok'&&now-Date.parse(feed.fetchedAt)>=0&&now-Date.parse(feed.fetchedAt)<feed.ttlMs;
    const railFresh=fresh(snapshot?.rail)&&imminent&&!(snapshot.rail.data.Status===2&&!snapshot.rail.data.AffectedSegments?.length);
    const segments=railFresh?(snapshot.rail.data.AffectedSegments||[]).filter(s=>applies(s,rail)):[];
    const rainValid=fresh(snapshot?.weather)&&departure>=Date.parse(snapshot.weather.data.validStart)&&departure<=Date.parse(snapshot.weather.data.validEnd);
    const wet=rainValid&&snapshot.weather.data.forecasts.some(f=>['Tampines','City'].includes(f.area)&&/rain|showers|thunder/i.test(f.forecast));
    const line=rail.stops[0].code.startsWith('EW')?'ewl':'dtl',boardingAt=departure+accessMinutes*60000;
    const matching=feed=>fresh(feed)?(feed.data||[]).filter(r=>r.Station===rail.stops[0].code&&Date.parse(r.StartTime)<=boardingAt&&Date.parse(r.EndTime)>boardingAt&&['l','m','h'].includes(r.CrowdLevel)):[];
    let rows=imminent?matching(snapshot?.crowd?.[line]):[],crowdSource=rows.length?'observation':'unknown';
    if(!rows.length){rows=matching(snapshot?.forecast?.[line]);if(rows.length)crowdSource='forecast';}
    const levels=rows.map(r=>r.CrowdLevel),crowd=levels.includes('h')?'High':levels.includes('m')?'Moderate':levels.includes('l')?'Low':'Unknown';
    return {blocked:segments.length>0,segments,rain:!!wet,crowd,crowdSource,boardingAt:new Date(boardingAt).toISOString(),uncertain:!railFresh||crowd==='Unknown',railKnown:railFresh,weatherKnown:!!rainValid};
  }
  function plan(input,scenarioId='normal',snapshot=null,now=Date.now()){
    const p=validate(input);if(!scenarios[scenarioId])throw new Error('Unknown scenario.');
    const origin=p.origin==='custom'?{name:'Selected Tampines start',short:'Your start',coord:p.originCoord}:origins[p.origin];
    const destination=p.destination==='custom'?{name:'Selected CBD destination',short:'Your destination',coord:p.destinationCoord}:destinations[p.destination];
    const preferred=minutes(p.departure),deadline=minutes(p.deadline),target=deadline-p.buffer;
    const today=dateSG(new Date(now)),scenarioClock=scenarioId==='live'?(p.journeyDate===today?nowSG(new Date(now)):0):Math.min(440,minutes(p.earliest));
    if(scenarioId==='live'&&(p.journeyDate<today||p.journeyDate===today&&deadline<=scenarioClock))throw new Error('This arrival deadline has passed. Choose a future time or date.');
    const earliest=Math.max(minutes(p.earliest),scenarioClock);
    const routes=['ewl','dtl'].map(id=>{
      const geo=Geo.candidate(id,origin.coord,destination.coord,p.shelter),isEwl=id==='ewl';
      const baseRide=Math.ceil(geo.rail.metres/1000/(isEwl?42:39)*60+(geo.rail.stops.length-2)*.45);
      function evaluate(departureOverride){
      const live=scenarioId==='live'?liveEffect(snapshot,{...p,departure:clock(departureOverride)},geo.rail,now,geo.access.minutes+2):null;
      const crowd=live?live.crowd:['offline','planned'].includes(scenarioId)?'Unknown':isEwl&&['crowd','delay'].includes(scenarioId)?'High':'Moderate';
      const rainOn=scenarioId==='rain'||live?.rain,rain=rainOn?Math.ceil((geo.access.exposed+geo.egress.exposed)/75*.35):0;
      const delay=isEwl&&scenarioId==='delay'?15:0,boardingMin=crowd==='High'?5:2,boardingMax=crowd==='High'?14:crowd==='Unknown'?12:7;
      const min=geo.walk+baseRide+boardingMin+4+rain+delay;
      const max=geo.walk+Math.ceil(baseRide*1.15)+boardingMax+4+rain+(delay?25:0)+(live?.uncertain?3:0);
      const latest=Math.floor((target-max)/5)*5,leave=departureOverride??Math.max(earliest,Math.min(preferred,latest)),late=Math.max(0,leave+max-deadline);
      // Compare the closure with the estimated traversal window, including walking
      // and boarding before the train reaches the affected section.
      let railElapsed=0;
      const plannedBlocked=scenarioId==='planned'&&isEwl&&geo.rail.segments.some(s=>{
        const duration=s.metres/1000/42*60+.45;
        const entry=leave+geo.access.minutes+2+boardingMin+railElapsed;
        const exit=leave+geo.access.minutes+2+boardingMax+(railElapsed+duration)*1.15;
        railElapsed+=duration;
        return ['EW8','EW9','EW10','EW11'].includes(s.from)&&entry<600&&exit>330;
      }),blocked=plannedBlocked||!!live?.blocked;
      const affectedSegments=geo.rail.segments.filter(s=>(isEwl&&(scenarioId==='delay'||plannedBlocked)&&['EW8','EW9','EW10','EW11'].includes(s.from))||live?.segments.some(a=>String(a.Stations).split(/[,;\s]+/).includes(s.from)&&String(a.Stations).split(/[,;\s]+/).includes(s.to)));
      const score=late*100+Math.max(0,leave+max-target)*20+Math.max(0,preferred-leave)*1.4+max+(p.priority==='walking'?geo.walk*3:0)+(p.priority==='comfort'&&crowd==='High'?35:0)+(isEwl?0:3);
      return {id,name:isEwl?'East–West Line':'Downtown Line',code:isEwl?'EWL':'DTL',station:isEwl?'Raffles Place':'Downtown',geo,walk:geo.walk,ride:baseRide,min,max,leave,arrivalMin:leave+min,arrivalMax:leave+max,usualArrivalMin:preferred+min,usualArrivalMax:preferred+max,late,blocked,walkExceeded:geo.walk>p.maxWalk,crowd,score,rain,delay,boarding:boardingMin,boardingMax,affectedSegments,live,baselineMax:max-(delay?25:0)-rain-(crowd==='High'?7:0),explanation:live&&!live.railKnown?'Current rail conditions do not cover this journey. Extra uncertainty is included.':blocked?'Affected section excluded from recommendations.':rainOn?'Rain allowance follows the exposed parts of the walking route.':crowd==='High'?'Extra boarding time for high crowding.':'OSM walking distance, rail distance, stops and waiting time are included.'};
      }
      if(scenarioId!=='live')return evaluate();
      const departures=new Set([earliest,Math.max(earliest,preferred)]);
      for(let t=Math.ceil(earliest/5)*5;t<=preferred;t+=5)departures.add(t);
      return [...departures].map(evaluate).sort((a,b)=>Number(a.blocked)-Number(b.blocked)||a.score-b.score)[0];
    });
    const viable=routes.filter(r=>!r.blocked&&!r.walkExceeded).sort((a,b)=>a.score-b.score),recommendation=viable[0]||null;
    const changed=!!recommendation&&(recommendation.id!=='ewl'||recommendation.leave!==preferred||recommendation.late>0);
    const stale=scenarioId==='offline'||scenarioId==='live'&&routes.some(r=>!r.live.railKnown);
    const actionable=scenarioId!=='live'||routes.some(r=>r.live.blocked||r.rain||r.crowd==='High');
    return {preferences:p,scenarioId,scenario:{...scenarios[scenarioId]},origin,destination,routes,recommendation,deadline,preferred,target,changed,needsAlert:!!(p.monitoring&&scenarioId!=='offline'&&actionable&&(changed||!recommendation)),stale,snapshot,scenarioClock,calculatedAt:new Date(now).toISOString()};
  }
  function steps(result,route){
    const text=leg=>leg.directions.map(d=>`${d.name}${d.covered?' (covered)':''}, ${d.metres} m`).join(' → ');
    return [
      {title:'Walk to Tampines MRT · Exit '+route.geo.access.entrance.ref,detail:`${route.geo.access.metres} m · ${route.geo.access.minutes} min. ${text(route.geo.access)}.`,time:clock(route.leave),mode:'walk'},
      {title:'Board the '+route.name,detail:`Follow station signs towards ${route.geo.rail.direction}. Allow ${route.boarding}–${route.boardingMax} min to board, plus platform access.`,time:clock(route.leave+route.geo.access.minutes+2),mode:'train'},
      {title:'Alight at '+route.station,detail:`${route.geo.rail.stops.length-1} stops · about ${route.ride+route.delay} min in the train. ${route.geo.rail.stops.slice(1).map(s=>s.name).join(' → ')}.`,time:'No transfers',mode:'train'},
      {title:'Exit '+route.geo.egress.entrance.ref+' · walk to '+result.destination.short,detail:`${route.geo.egress.metres} m · ${route.geo.egress.minutes} min. ${text(route.geo.egress)}.`,time:clock(route.arrivalMin)+'–'+clock(route.arrivalMax),mode:'walk'}
    ];
  }
  const api={defaults,scenarios,origins,destinations,minutes,clock,validate,plan,steps,dateSG,nowSG,liveEffect,applies};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SmartCommEngine=api;
})(globalThis);
