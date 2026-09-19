(function(root){
  'use strict';
  const Geo=typeof module!=='undefined'&&module.exports?require('./geo.js'):root.SmartCommGeo;
  const dateSG=(now=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const nowSG=(now=new Date())=>minutes(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Singapore',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now));
  const journeyDate=dateSG(new Date(Date.now()+(nowSG()>440?86400000:0)));
  const origins={
    central:{name:'Tampines Central 1',short:'Tampines Central',coord:[1.354,103.942]},
    avenue:{name:'Tampines Avenue 4',short:'Tampines Ave 4',coord:[1.35,103.945]},
    raffles:{name:'One Raffles Place',short:'One Raffles Place',coord:[1.2845,103.851]},
    marina:{name:'Marina Bay Financial Centre',short:'Marina Bay',coord:[1.27955,103.8543]},
    yewtee:{name:'Yew Tee Grandparents Home',short:'Yew Tee',coord:[1.3973,103.7475]}
  };
  const destinations={
    raffles:{name:'One Raffles Place',short:'One Raffles Place',coord:[1.2845,103.851]},
    marina:{name:'Marina Bay Financial Centre',short:'Marina Bay',coord:[1.27955,103.8543]},
    central:{name:'Tampines Central 1',short:'Tampines Central',coord:[1.354,103.942]},
    avenue:{name:'Tampines Avenue 4',short:'Tampines Ave 4',coord:[1.35,103.945]},
    yewtee:{name:'Yew Tee Grandparents Home',short:'Yew Tee',coord:[1.3973,103.7475]}
  };
  const agendas={
    home_work:{
      id:'home_work',
      name:'Home To Work',
      tag:'Weekday Commute',
      days:'Mon - Fri',
      origin:'central',
      destination:'raffles',
      departure:'07:40',
      earliest:'07:20',
      deadline:'08:45',
      buffer:10,
      maxWalk:25,
      priority:'reliable',
      shelter:true,
      stepFree:true
    },
    work_home:{
      id:'work_home',
      name:'Work To Home',
      tag:'Evening Commute',
      days:'Mon - Fri',
      origin:'raffles',
      destination:'central',
      departure:'18:15',
      earliest:'18:00',
      deadline:'19:15',
      buffer:10,
      maxWalk:25,
      priority:'reliable',
      shelter:true,
      stepFree:true
    },
    weekend_yewtee:{
      id:'weekend_yewtee',
      name:'Weekend Grandparents',
      tag:'Weekend Family Visit',
      days:'Sat - Sun',
      origin:'central',
      destination:'yewtee',
      departure:'10:00',
      earliest:'09:30',
      deadline:'11:15',
      buffer:15,
      maxWalk:30,
      priority:'comfort',
      shelter:true,
      stepFree:true
    }
  };
  const defaults=Object.freeze({
    agenda:'home_work',
    origin:'central',
    destination:'raffles',
    journeyDate,
    departure:'07:40',
    earliest:'07:20',
    deadline:'08:45',
    buffer:5,
    maxWalk:25,
    priority:'reliable',
    shelter:false,
    stepFree:false,
    monitoring:true
  });
  const scenarios={
    normal:{name:'Normal Service Replay',description:'Replay: Both Rail Routes Are Operating Normally.',rail:'Normal Service In Replay',railDetail:'No Injected Disruption.',weather:'Dry Weather',weatherDetail:'Replay Condition.',crowd:'Moderate',crowdDetail:'Replay Station Crowding.'},
    delay:{name:'EWL Disruption Replay',description:'Replay: A City - Bound EWL Delay Affects Paya Lebar - Bugis.',rail:'EWL Delay · Replay',railDetail:'Paya Lebar - Bugis, Towards Tuas Link. Assumed 15 - 25 Extra Minutes.',weather:'Dry Weather',weatherDetail:'Replay Condition.',crowd:'High On EWL',crowdDetail:'Additional Boarding Allowance Is Included.'},
    crowd:{name:'Crowding Replay',description:'Replay: High EWL Crowding Increases Boarding Allowance.',rail:'Both Lines Operating',railDetail:'Replay: No Closure.',weather:'Dry Weather',weatherDetail:'Replay Condition.',crowd:'High On EWL',crowdDetail:'DTL Crowding Is Moderate In This Replay.'},
    rain:{name:'Heavy Rain Replay',description:'Replay: Rain Slows Exposed Walking Legs.',rail:'Both Lines Operating',railDetail:'Replay: No Closure.',weather:'Heavy Rain',weatherDetail:'Applied To Uncovered Walking Paths.',crowd:'Moderate',crowdDetail:'Replay Station Crowding.'},
    planned:{name:'Planned Closure Replay',description:'Replay: Scheduled EWL Maintenance Window.',rail:'Scheduled EWL Closure',railDetail:'Replay Effective Window: 05:30 - 10:00 On Selected Date.',weather:'Unknown',weatherDetail:'Future Weather Is Not Assumed.',crowd:'Unknown',crowdDetail:'No Crowd Forecast Available.'},
    offline:{name:'Offline Replay',description:'Offline Replay: Cached Routes Remain Available.',rail:'Unknown',railDetail:'Offline; No Current Verification.',weather:'Unknown',weatherDetail:'Offline; No Current Verification.',crowd:'Unknown',crowdDetail:'Offline; No Current Verification.'},
    live:{name:'Official Feeds',description:'Live Official Transit Feeds (LTA DataMall & Data.gov.sg).',rail:'Checking Official Feeds',railDetail:'Live Station Status.',weather:'Checking Weather',weatherDetail:'Official 2 - Hour Nowcast.',crowd:'Live Crowding',crowdDetail:'Live Platform Density.'}
  };
  function minutes(v){const m=/^(\d{2}):(\d{2})$/.exec(v);if(!m||+m[1]>23||+m[2]>59)throw new Error('Enter A Valid Time.');return +m[1]*60+ +m[2];}
  function clock(v){v=Math.round(v);return String(Math.floor(v/60)%24).padStart(2,'0')+':'+String(v%60).padStart(2,'0');}
  function validate(input){
    const p={...defaults,...input};
    if((!origins[p.origin]&&p.origin!=='custom')||(!destinations[p.destination]&&p.destination!=='custom'))throw new Error('Choose A Supported Place Or A Point On The Map.');
    if(p.origin==='custom'&&!Geo.inBounds(p.originCoord,'origin'))throw new Error('Choose A Start Point Within Singapore.');
    if(p.destination==='custom'&&!Geo.inBounds(p.destinationCoord,'destination'))throw new Error('Choose A Destination Within Singapore.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(p.journeyDate)||Number.isNaN(Date.parse(p.journeyDate+'T00:00:00+08:00'))||dateSG(new Date(p.journeyDate+'T00:00:00+08:00'))!==p.journeyDate)throw new Error('Choose A Valid Journey Date.');
    const a=minutes(p.earliest),b=minutes(p.departure),c=minutes(p.deadline);
    if(a>b||b>=c)throw new Error('Earliest Departure Must Be At Or Before Usual Departure, And Arrival Must Be Later.');
    if(a<330||c>1410)throw new Error('This Planner Covers Journeys From 05:30 - 23:30.');
    p.buffer=Number(p.buffer);p.maxWalk=Number(p.maxWalk);
    if(!Number.isInteger(p.buffer)||p.buffer<0||p.buffer>30)throw new Error('Use An Arrival Buffer From 0 - 30 Minutes.');
    if(!Number.isInteger(p.maxWalk)||p.maxWalk<5||p.maxWalk>60)throw new Error('Use A Walking Limit From 5 - 60 Minutes.');
    if(!['reliable','walking','comfort'].includes(p.priority))throw new Error('Choose A Valid Travel Priority.');
    p.shelter=!!p.shelter;p.stepFree=!!p.stepFree;p.monitoring=!!p.monitoring;return p;
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
    const wet=rainValid&&snapshot.weather.data.forecasts.some(f=>['Tampines','City','Choa Chu Kang'].includes(f.area)&&/rain|showers|thunder/i.test(f.forecast));
    const line=rail.stops[0].code.startsWith('EW')?'ewl':'dtl',boardingAt=departure+accessMinutes*60000;
    const matching=feed=>fresh(feed)?(feed.data||[]).filter(r=>r.Station===rail.stops[0].code&&Date.parse(r.StartTime)<=boardingAt&&Date.parse(r.EndTime)>boardingAt&&['l','m','h'].includes(r.CrowdLevel)):[];
    let rows=imminent?matching(snapshot?.crowd?.[line]):[],crowdSource=rows.length?'observation':'unknown';
    if(!rows.length){rows=matching(snapshot?.forecast?.[line]);if(rows.length)crowdSource='forecast';}
    const levels=rows.map(r=>r.CrowdLevel),crowd=levels.includes('h')?'High':levels.includes('m')?'Moderate':levels.includes('l')?'Low':'Unknown';
    return {blocked:segments.length>0,segments,rain:!!wet,crowd,crowdSource,boardingAt:new Date(boardingAt).toISOString(),uncertain:!railFresh||crowd==='Unknown',railKnown:railFresh,weatherKnown:!!rainValid};
  }
  function plan(input,scenarioId='normal',snapshot=null,now=Date.now()){
    const p=validate(input);if(!scenarios[scenarioId])throw new Error('Unknown Scenario.');
    const origin=p.origin==='custom'?{name:'Selected Start Location',short:'Start Location',coord:p.originCoord}:origins[p.origin];
    const destination=p.destination==='custom'?{name:'Selected Destination',short:'Destination',coord:p.destinationCoord}:destinations[p.destination];
    const preferred=minutes(p.departure),deadline=minutes(p.deadline),target=deadline-p.buffer;
    const today=dateSG(new Date(now)),scenarioClock=scenarioId==='live'?(p.journeyDate===today?nowSG(new Date(now)):0):Math.min(440,minutes(p.earliest));
    if(scenarioId==='live'&&(p.journeyDate<today||p.journeyDate===today&&deadline<=scenarioClock))throw new Error('This Arrival Deadline Has Passed. Choose A Future Time Or Date.');
    const earliest=Math.max(minutes(p.earliest),scenarioClock);
    const isYewTee=destination.coord[1]<103.80||destination.coord[0]>1.38;
    const routeIds=isYewTee?['dtl','shuttle']:['ewl','dtl','shuttle'];

    const routes=routeIds.map(id=>{
      const geo=Geo.candidate(id,origin.coord,destination.coord,p.shelter);
      const isShuttle=id==='shuttle',isEwl=id==='ewl';

      if(isShuttle){
        const baseRide=isYewTee?36:32;
        const leave=Math.max(earliest,preferred);
        const min=geo.walk+baseRide+2;
        const max=geo.walk+baseRide+6;
        const late=Math.max(0,leave+max-deadline);
        const score=late*100+Math.max(0,leave+max-target)*15+max+(p.priority==='comfort'?-8:0)+(p.priority==='walking'?geo.walk*2:0)+6;
        return {
          id:'shuttle',
          name:geo.rail.name,
          code:'SHUTTLE',
          station:geo.rail.stops.at(-1).name,
          type:'bus',
          geo,
          walk:geo.walk,
          ride:baseRide,
          min,
          max,
          leave,
          arrivalMin:leave+min,
          arrivalMax:leave+max,
          usualArrivalMin:preferred+min,
          usualArrivalMax:preferred+max,
          late,
          blocked:false,
          walkExceeded:geo.walk>p.maxWalk,
          crowd:'Low',
          score,
          rain:0,
          delay:0,
          boarding:1,
          boardingMax:3,
          affectedSegments:[],
          live:null,
          baselineMax:max,
          explanation:'Direct Highway Express Via ECP · Non - Government Commercial Shuttle Bus · Guaranteed Seat'
        };
      }

      const baseRide=Math.ceil(geo.rail.metres/1000/(isEwl?42:39)*60+(geo.rail.stops.length-2)*0.45);
      function evaluate(departureOverride){
        const live=scenarioId==='live'?liveEffect(snapshot,{...p,departure:clock(departureOverride)},geo.rail,now,geo.access.minutes+2):null;
        const crowd=live?live.crowd:['offline','planned'].includes(scenarioId)?'Unknown':isEwl&&['crowd','delay'].includes(scenarioId)?'High':'Moderate';
        const rainOn=scenarioId==='rain'||live?.rain,rain=rainOn?Math.ceil((geo.access.exposed+geo.egress.exposed)/75*0.35):0;
        const delay=isEwl&&scenarioId==='delay'?15:0,boardingMin=crowd==='High'?5:2,boardingMax=crowd==='High'?14:crowd==='Unknown'?12:7;
        const min=geo.walk+baseRide+boardingMin+4+rain+delay;
        const max=geo.walk+Math.ceil(baseRide*1.15)+boardingMax+4+rain+(delay?25:0)+(live?.uncertain?3:0);
        const latest=Math.floor((target-max)/5)*5,leave=departureOverride??Math.max(earliest,Math.min(preferred,latest)),late=Math.max(0,leave+max-deadline);
        let railElapsed=0;
        const plannedBlocked=scenarioId==='planned'&&isEwl&&geo.rail.segments.some(s=>{
          const duration=s.metres/1000/42*60+0.45;
          const entry=leave+geo.access.minutes+2+boardingMin+railElapsed;
          const exit=leave+geo.access.minutes+2+boardingMax+(railElapsed+duration)*1.15;
          railElapsed+=duration;
          return ['EW8','EW9','EW10','EW11'].includes(s.from)&&entry<600&&exit>330;
        }),blocked=plannedBlocked||!!live?.blocked;
        const affectedSegments=geo.rail.segments.filter(s=>(isEwl&&(scenarioId==='delay'||plannedBlocked)&&['EW8','EW9','EW10','EW11'].includes(s.from))||live?.segments.some(a=>String(a.Stations).split(/[,;\s]+/).includes(s.from)&&String(a.Stations).split(/[,;\s]+/).includes(s.to)));
        const score=late*100+Math.max(0,leave+max-target)*20+Math.max(0,preferred-leave)*1.4+max+(p.priority==='walking'?geo.walk*3:0)+(p.priority==='comfort'&&crowd==='High'?35:0)+(isEwl?0:3);
        return {
          id,
          name:geo.rail.name||(isEwl?'East - West Line':'Downtown Line'),
          code:isEwl?'EWL':'DTL',
          station:geo.rail.stops.at(-1).name,
          type:'train',
          geo,
          walk:geo.walk,
          ride:baseRide,
          min,
          max,
          leave,
          arrivalMin:leave+min,
          arrivalMax:leave+max,
          usualArrivalMin:preferred+min,
          usualArrivalMax:preferred+max,
          late,
          blocked,
          walkExceeded:geo.walk>p.maxWalk,
          crowd,
          score,
          rain,
          delay,
          boarding:boardingMin,
          boardingMax,
          affectedSegments,
          live,
          baselineMax:max-(delay?25:0)-rain-(crowd==='High'?7:0),
          explanation:live&&!live.railKnown?'Current Rail Conditions Do Not Cover This Journey. Extra Uncertainty Is Included.':blocked?'Affected Section Excluded From Recommendations.':rainOn?'Rain Allowance Follows The Exposed Parts Of The Walking Route.':crowd==='High'?'Extra Boarding Time For High Crowding.':'Door - To - Door Route With Accurate Transit Timing.'
        };
      }
      if(scenarioId!=='live')return evaluate();
      const departures=new Set([earliest,Math.max(earliest,preferred)]);
      for(let t=Math.ceil(earliest/5)*5;t<=preferred;t+=5)departures.add(t);
      return [...departures].map(evaluate).sort((a,b)=>Number(a.blocked)-Number(b.blocked)||a.score-b.score)[0];
    });

    const viable=routes.filter(r=>!r.blocked&&!r.walkExceeded).sort((a,b)=>a.score-b.score),recommendation=viable[0]||null;
    const changed=!!recommendation&&(recommendation.id!=='ewl'||recommendation.leave!==preferred||recommendation.late>0);
    const stale=scenarioId==='offline'||scenarioId==='live'&&routes.some(r=>r.live&&!r.live.railKnown);
    const actionable=scenarioId!=='live'||routes.some(r=>r.live&&(r.live.blocked||r.rain||r.crowd==='High'));
    return {preferences:p,scenarioId,scenario:{...scenarios[scenarioId]},origin,destination,routes,recommendation,deadline,preferred,target,changed,needsAlert:!!(p.monitoring&&scenarioId!=='offline'&&actionable&&(changed||!recommendation)),stale,snapshot,scenarioClock,calculatedAt:new Date(now).toISOString()};
  }
  function steps(result,route){
    const text=leg=>leg.directions.map(d=>`${d.name}${d.covered?' (Covered)':''}, ${d.metres} M`).join(' → ');
    if(route.id==='shuttle'){
      return [
        {title:'Walk To '+route.geo.access.entrance.name,detail:`${route.geo.access.metres} M · ${route.geo.access.minutes} Min Walk. Follow Covered Walkway.`,time:clock(route.leave),mode:'walk'},
        {title:'Board '+route.name,detail:`Board Express Highway Shuttle Towards ${route.geo.rail.direction}. Guaranteed Reserved Seat.`,time:clock(route.leave+route.geo.access.minutes+1),mode:'bus'},
        {title:'Alight At '+route.geo.egress.entrance.name,detail:`Direct Highway Express Transit · About ${route.ride} Min. No Transfers.`,time:'No transfers',mode:'bus'},
        {title:'Walk To '+result.destination.short,detail:`${route.geo.egress.metres} M · ${route.geo.egress.minutes} Min Walk.`,time:clock(route.arrivalMin)+' - '+clock(route.arrivalMax),mode:'walk'}
      ];
    }
    return [
      {title:'Walk To '+route.geo.access.entrance.name,detail:`${route.geo.access.metres} M · ${route.geo.access.minutes} Min Walk. ${text(route.geo.access)}.`,time:clock(route.leave),mode:'walk'},
      {title:'Board '+route.name,detail:`Follow Station Signs Towards ${route.geo.rail.direction}. Allow ${route.boarding} - ${route.boardingMax} Min Boarding Time.`,time:clock(route.leave+route.geo.access.minutes+2),mode:'train'},
      {title:'Alight At '+route.station,detail:`${route.geo.rail.stops.length-1} Stops · About ${route.ride+route.delay} Min In Train.`,time:'No transfers',mode:'train'},
      {title:'Exit '+(route.geo.egress.entrance.ref||'Station')+' · Walk To '+result.destination.short,detail:`${route.geo.egress.metres} M · ${route.geo.egress.minutes} Min Walk.`,time:clock(route.arrivalMin)+' - '+clock(route.arrivalMax),mode:'walk'}
    ];
  }
  const api={defaults,agendas,scenarios,origins,destinations,minutes,clock,validate,plan,steps,dateSG,nowSG,liveEffect,applies};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SmartCommEngine=api;
})(globalThis);
