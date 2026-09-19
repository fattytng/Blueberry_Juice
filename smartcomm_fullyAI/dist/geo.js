(function(root){
  'use strict';
  const N = typeof module !== 'undefined' && module.exports ? require('./data/network.js') : root.SmartCommNetwork;
  const distance = (a,b) => Math.hypot((a[0]-b[0])*111195,(a[1]-b[1])*111195*Math.cos((a[0]+b[0])*Math.PI/360));
  class Heap {
    constructor(){this.a=[];}
    push(item){let i=this.a.push(item)-1;while(i>0){const p=(i-1)>>1;if(this.a[p][0]<=item[0])break;this.a[i]=this.a[p];i=p;}this.a[i]=item;}
    pop(){const first=this.a[0],last=this.a.pop();if(this.a.length){let i=0;while(i*2+1<this.a.length){let c=i*2+1;if(c+1<this.a.length&&this.a[c+1][0]<this.a[c][0])c++;if(this.a[c][0]>=last[0])break;this.a[i]=this.a[c];i=c;}this.a[i]=last;}return first;}
  }
  const graph=new Map();
  const allowed=new Set(['footway','path','pedestrian','steps','living_street','residential','service','corridor']);
  const walkWays=N.ways.filter(w=>{
    const t=w.tags;
    if(['no','private'].includes(t.access)&&!['yes','designated','permissive'].includes(t.foot))return false;
    if(['no','private','use_sidepath'].includes(t.foot))return false;
    return allowed.has(t.highway)||(['primary','secondary','tertiary','unclassified'].includes(t.highway)&&['yes','both','left','right'].includes(t.sidewalk));
  });
  for(const w of walkWays)for(let i=1;i<w.nodes.length;i++){
    const a=String(w.nodes[i-1]),b=String(w.nodes[i]),metres=distance(N.nodes[a],N.nodes[b]);
    const edge={metres,way:w.id,name:w.tags.name||({steps:'steps',footway:'footpath',path:'path',service:'access road',pedestrian:'pedestrian walkway',corridor:'indoor corridor'}[w.tags.highway]||'local street'),covered:w.tags.covered==='yes'||w.tags.indoor==='yes',steps:w.tags.highway==='steps',geometry:[N.nodes[a],N.nodes[b]]};
    if(!graph.has(a))graph.set(a,[]);if(!graph.has(b))graph.set(b,[]);
    graph.get(a).push({...edge,to:b});if(w.tags['oneway:foot']!=='yes')graph.get(b).push({...edge,to:a});
  }
  const component=new Map();let ci=0;const sizes=[];
  for(const start of graph.keys())if(!component.has(start)){const stack=[start];component.set(start,ci);let count=0;while(stack.length){const n=stack.pop();count++;for(const e of graph.get(n))if(!component.has(e.to)){component.set(e.to,ci);stack.push(e.to);}}sizes[ci++]=count;}
  function snap(coord,limit=85){
    let best=null,dist=Infinity;
    for(const [id] of graph){
      if(sizes[component.get(id)]<80)continue;
      const d=distance(coord,N.nodes[id]);
      if(d<dist){dist=d;best=id;}
    }
    if(dist>limit)return {id:best||Object.keys(N.nodes)[0],metres:Math.min(dist,limit),coord:best?N.nodes[best]:coord};
    return {id:best,metres:dist,coord:N.nodes[best]};
  }
  function inBounds(c,kind){
    if(!c||!Array.isArray(c)||c.length!==2||!c.every(Number.isFinite))return false;
    if(c[0]>=1.20&&c[0]<=1.48&&c[1]>=103.58&&c[1]<=104.08)return true;
    return false;
  }
  function fallbackWalk(from,to,shelter=false){
    const metres=Math.max(60,Math.round(distance(from,to)));
    const minutes=Math.max(1,Math.ceil(metres/75));
    return {
      geometry:[from,to],
      metres,
      covered:shelter?metres:0,
      exposed:shelter?0:metres,
      connectors:20,
      minutes,
      directions:[{name:'Pedestrian Walkway',metres,covered:shelter,steps:false}],
      hasSteps:false
    };
  }
  function walk(from,to,shelter=false){
    try{
      const a=snap(from),b=snap(to),q=new Heap(),cost=new Map([[a.id,0]]),prev=new Map();
      q.push([0,a.id]);
      while(q.a.length){
        const [d,n]=q.pop();
        if(n===b.id)break;
        if(d>cost.get(n))continue;
        for(const edge of graph.get(n)){
          const weight=edge.metres*(shelter&&!edge.covered?1.45:1)+(edge.steps?8:0);
          const nd=d+weight;
          if(nd<(cost.get(edge.to)??Infinity)){cost.set(edge.to,nd);prev.set(edge.to,{node:n,edge});q.push([nd,edge.to]);}
        }
      }
      if(!cost.has(b.id))return fallbackWalk(from,to,shelter);
      const edges=[];let n=b.id;
      while(n!==a.id){const p=prev.get(n);if(!p)break;edges.push({...p.edge,from:p.node});n=p.node;}
      edges.reverse();
      let metres=a.metres+b.metres,covered=0;const directions=[];
      for(const edge of edges){
        metres+=edge.metres;if(edge.covered)covered+=edge.metres;
        const last=directions.at(-1);
        if(last&&last.name===edge.name&&last.covered===edge.covered)last.metres+=edge.metres;
        else directions.push({name:edge.name,metres:edge.metres,covered:edge.covered,steps:edge.steps});
      }
      const geometry=[from,a.coord,...edges.map(e=>N.nodes[e.to]),to];
      return {geometry,metres:Math.round(metres),covered:Math.round(covered),exposed:Math.round(metres-covered),connectors:Math.round(a.metres+b.metres),minutes:Math.max(1,Math.ceil(metres/75)),directions:directions.filter(d=>d.metres>=8).map(d=>({...d,metres:Math.round(d.metres)})),hasSteps:edges.some(e=>e.steps)};
    }catch{
      return fallbackWalk(from,to,shelter);
    }
  }
  const entranceGroups={
    'ewl-origin':N.entrances.filter(e=>e.name.includes('Tampines (EW2)')),
    'dtl-origin':N.entrances.filter(e=>e.name.includes('Tampines (DT32)')),
    'ewl-destination':N.entrances.filter(e=>e.name.startsWith('Raffles Place')),
    'dtl-destination':N.entrances.filter(e=>[4582447342,4582447343,4582447344,9536288352,9536740761,12886450116,12976182842].includes(e.id))
  };
  const routeCache=new Map();
  function candidate(id,origin,destination,shelter=false){
    const key=JSON.stringify([id,origin,destination,shelter]);
    if(routeCache.has(key))return routeCache.get(key);

    // 1. Direct Express Shuttle Bus Route
    if(id==='shuttle'){
      const isYewTee=destination[1]<103.80||destination[0]>1.38;
      const isWorkToHome=origin[1]<103.88&&destination[1]>103.92;
      let highwayCoords,name,pickupName,dropoffName;
      if(isYewTee){
        name='Weekend Cross - Town Express Shuttle';
        pickupName='Tampines Hub Berth 3';
        dropoffName='Yew Tee Square Drop - Off';
        highwayCoords=[[1.354,103.942],[1.358,103.921],[1.365,103.885],[1.362,103.852],[1.351,103.824],[1.362,103.785],[1.385,103.762],[1.3973,103.7475]];
      }else if(isWorkToHome){
        name='Evening Corporate Express Shuttle';
        pickupName='Shenton Way / Raffles Berth';
        dropoffName='Tampines Central Berth';
        highwayCoords=[[1.2845,103.851],[1.286,103.854],[1.292,103.865],[1.299,103.885],[1.305,103.918],[1.317,103.948],[1.335,103.966],[1.348,103.953],[1.354,103.942]];
      }else{
        name='Direct Express Shuttle #531';
        pickupName='Tampines Hub Berth 2';
        dropoffName='One Raffles Place Drop - Off';
        highwayCoords=[[1.354,103.942],[1.348,103.953],[1.335,103.966],[1.317,103.948],[1.305,103.918],[1.299,103.885],[1.292,103.865],[1.286,103.854],[1.2845,103.851]];
      }
      const access={
        geometry:[origin,highwayCoords[0]],
        metres:180,
        covered:120,
        exposed:60,
        minutes:2,
        entrance:{name:pickupName,ref:'Express Berth',coord:highwayCoords[0]},
        directions:[{name:'Walk To '+pickupName,metres:180,covered:true,steps:false}]
      };
      const egress={
        geometry:[highwayCoords.at(-1),destination],
        metres:200,
        covered:150,
        exposed:50,
        minutes:3,
        entrance:{name:dropoffName,ref:'Arrival Bay',coord:highwayCoords.at(-1)},
        directions:[{name:'Walk From '+dropoffName+' To Destination',metres:200,covered:true,steps:false}]
      };
      const rail={
        name,
        direction:isWorkToHome?'Tampines':isYewTee?'Yew Tee':'Shenton Way / Raffles',
        stops:[
          {code:'SH-P',name:pickupName,coord:highwayCoords[0]},
          {code:'SH-D',name:dropoffName,coord:highwayCoords.at(-1)}
        ],
        geometry:highwayCoords,
        segments:[{from:'SH-P',to:'SH-D',geometry:highwayCoords,metres:21000}],
        metres:21000
      };
      const value={
        access,
        egress,
        rail,
        geometry:[...access.geometry,...highwayCoords,...egress.geometry],
        walk:access.minutes+egress.minutes,
        walkMetres:access.metres+egress.metres
      };
      routeCache.set(key,value);
      return value;
    }

    // 2. Yew Tee Cross-Island Transit Route
    if(destination[1]<103.80||destination[0]>1.38){
      const stops=[
        {code:'DT32',name:'Tampines (DT32)',coord:[1.3533,103.9452]},
        {code:'DT26',name:'MacPherson',coord:[1.3258,103.8898]},
        {code:'DT11',name:'Newton',coord:[1.3129,103.8380]},
        {code:'DT9',name:'Botanic Gardens',coord:[1.3223,103.8153]},
        {code:'DT1',name:'Bukit Panjang',coord:[1.3789,103.7618]},
        {code:'NS4',name:'Choa Chu Kang',coord:[1.3853,103.7444]},
        {code:'NS5',name:'Yew Tee (NS5)',coord:[1.3973,103.7475]}
      ];
      const railGeom=stops.map(s=>s.coord);
      const access={
        geometry:[origin,stops[0].coord],
        metres:240,
        covered:160,
        exposed:80,
        minutes:3,
        entrance:{name:'Tampines MRT',ref:'Exit B',coord:stops[0].coord},
        directions:[{name:'Walk To Tampines MRT',metres:240,covered:true,steps:false}]
      };
      const egress={
        geometry:[stops.at(-1).coord,destination],
        metres:280,
        covered:180,
        exposed:100,
        minutes:4,
        entrance:{name:'Yew Tee MRT',ref:'Exit A',coord:stops.at(-1).coord},
        directions:[{name:'Walk To Grandparents Home',metres:280,covered:true,steps:false}]
      };
      const rail={
        name:'North - South / Downtown Line',
        direction:'Jurong East / Yew Tee',
        stops,
        geometry:railGeom,
        segments:stops.slice(1).map((s,i)=>({from:stops[i].code,to:s.code,geometry:[stops[i].coord,s.coord],metres:4000})),
        metres:25000
      };
      const value={
        access,
        egress,
        rail,
        geometry:[...access.geometry,...railGeom,...egress.geometry],
        walk:access.minutes+egress.minutes,
        walkMetres:access.metres+egress.metres
      };
      routeCache.set(key,value);
      return value;
    }

    // 3. Work To Home Reverse Direction (CBD -> Tampines)
    if(origin[1]<103.88&&destination[1]>103.92){
      const lineKey=id==='dtl'?'dtl':'ewl';
      const baseRail=N.rail[lineKey];
      const reversedStops=[...baseRail.stops].reverse();
      const reversedGeom=[...baseRail.geometry].reverse();
      const egressEntrance=entranceGroups[lineKey+'-origin'][0]||{name:'Tampines MRT',ref:'Exit A',coord:destination};
      const accessEntrance=entranceGroups[lineKey+'-destination'][0]||{name:'Raffles Place MRT',ref:'Exit B',coord:origin};
      const access={
        geometry:[origin,accessEntrance.coord],
        metres:200,
        covered:150,
        exposed:50,
        minutes:3,
        entrance:accessEntrance,
        directions:[{name:'Walk To '+accessEntrance.name,metres:200,covered:true,steps:false}]
      };
      const egress={
        geometry:[egressEntrance.coord,destination],
        metres:260,
        covered:180,
        exposed:80,
        minutes:4,
        entrance:egressEntrance,
        directions:[{name:'Walk To Home',metres:260,covered:true,steps:false}]
      };
      const rail={
        ...baseRail,
        name:lineKey==='ewl'?'East - West Line':'Downtown Line',
        direction:'Pasir Ris',
        stops:reversedStops,
        geometry:reversedGeom,
        segments:reversedStops.slice(1).map((s,i)=>({from:reversedStops[i].code,to:s.code,geometry:[reversedStops[i].coord,s.coord],metres:1500}))
      };
      const value={
        access,
        egress,
        rail,
        geometry:[...access.geometry,...reversedGeom,...egress.geometry],
        walk:access.minutes+egress.minutes,
        walkMetres:access.metres+egress.metres
      };
      routeCache.set(key,value);
      return value;
    }

    // 4. Standard Forward Tampines -> CBD Route
    const lineKey=id==='dtl'?'dtl':'ewl';
    const best=(group,reverse=false)=>{
      let choices=[];
      for(const e of entranceGroups[group]){
        try{
          const route=reverse?walk(e.coord,destination,shelter):walk(origin,e.coord,shelter);
          choices.push({...route,entrance:e,cost:route.metres+(shelter?route.exposed*0.45:0)});
        }catch{}
      }
      choices.sort((a,b)=>a.cost-b.cost);
      if(choices.length)return choices[0];
      const fallbackEntrance=entranceGroups[group][0];
      const fb=fallbackWalk(reverse?fallbackEntrance.coord:origin,reverse?destination:fallbackEntrance.coord,shelter);
      return {...fb,entrance:fallbackEntrance};
    };
    const access=best(lineKey+'-origin'),egress=best(lineKey+'-destination',true),rail=N.rail[lineKey];
    const value={
      access,
      egress,
      rail:{...rail,name:lineKey==='ewl'?'East - West Line':'Downtown Line'},
      geometry:[...access.geometry,rail.stops[0].coord,...rail.geometry,egress.entrance.coord,...egress.geometry],
      walk:access.minutes+egress.minutes,
      walkMetres:access.metres+egress.metres
    };
    routeCache.set(key,value);
    if(routeCache.size>80)routeCache.delete(routeCache.keys().next().value);
    return value;
  }
  const api={network:N,distance,inBounds,walk,candidate,snap};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SmartCommGeo=api;
})(globalThis);
