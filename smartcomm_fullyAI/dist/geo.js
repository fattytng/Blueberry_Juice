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
  // Keep endpoint snapping on a substantial connected public pedestrian network.
  const component=new Map();let ci=0;const sizes=[];
  for(const start of graph.keys())if(!component.has(start)){const stack=[start];component.set(start,ci);let count=0;while(stack.length){const n=stack.pop();count++;for(const e of graph.get(n))if(!component.has(e.to)){component.set(e.to,ci);stack.push(e.to);}}sizes[ci++]=count;}
  function snap(coord,limit=85){let best=null,dist=Infinity;for(const [id] of graph){if(sizes[component.get(id)]<80)continue;const d=distance(coord,N.nodes[id]);if(d<dist){dist=d;best=id;}}if(dist>limit)throw new Error('That point is too far from a connected OSM footpath. Choose a nearby street entrance.');return {id:best,metres:dist,coord:N.nodes[best]};}
  function inBounds(c,kind){const [s,w,n,e]=N.metadata.bounds[kind];return Array.isArray(c)&&c.length===2&&c.every(Number.isFinite)&&c[0]>=s&&c[0]<=n&&c[1]>=w&&c[1]<=e;}
  function walk(from,to,shelter=false){
    const a=snap(from),b=snap(to),q=new Heap(),cost=new Map([[a.id,0]]),prev=new Map();q.push([0,a.id]);
    while(q.a.length){const [d,n]=q.pop();if(n===b.id)break;if(d>cost.get(n))continue;for(const edge of graph.get(n)){const weight=edge.metres*(shelter&&!edge.covered?1.45:1)+(edge.steps?8:0);const nd=d+weight;if(nd<(cost.get(edge.to)??Infinity)){cost.set(edge.to,nd);prev.set(edge.to,{node:n,edge});q.push([nd,edge.to]);}}}
    if(!cost.has(b.id))throw new Error('OSM has no connected walking route between those points. Choose a nearby public entrance.');
    const edges=[];let n=b.id;while(n!==a.id){const p=prev.get(n);edges.push({...p.edge,from:p.node});n=p.node;}edges.reverse();
    let metres=a.metres+b.metres,covered=0;const directions=[];
    for(const edge of edges){metres+=edge.metres;if(edge.covered)covered+=edge.metres;const last=directions.at(-1);if(last&&last.name===edge.name&&last.covered===edge.covered)last.metres+=edge.metres;else directions.push({name:edge.name,metres:edge.metres,covered:edge.covered,steps:edge.steps});}
    const geometry=[from,a.coord,...edges.map(e=>N.nodes[e.to]),to];
    return {geometry,metres:Math.round(metres),covered:Math.round(covered),exposed:Math.round(metres-covered),connectors:Math.round(a.metres+b.metres),minutes:Math.max(1,Math.ceil(metres/75)),directions:directions.filter(d=>d.metres>=8).map(d=>({...d,metres:Math.round(d.metres)})),hasSteps:edges.some(e=>e.steps)};
  }
  const entranceGroups={
    'ewl-origin':N.entrances.filter(e=>e.name.includes('Tampines (EW2)')),
    'dtl-origin':N.entrances.filter(e=>e.name.includes('Tampines (DT32)')),
    'ewl-destination':N.entrances.filter(e=>e.name.startsWith('Raffles Place')),
    'dtl-destination':N.entrances.filter(e=>[4582447342,4582447343,4582447344,9536288352,9536740761,12886450116,12976182842].includes(e.id))
  };
  const routeCache=new Map();
  function candidate(id,origin,destination,shelter=false){
    const key=JSON.stringify([id,origin,destination,shelter]);if(routeCache.has(key))return routeCache.get(key);
    if(!inBounds(origin,'origin')||!inBounds(destination,'destination'))throw new Error('This build covers Tampines Central to the Raffles Place / Marina Bay area. Choose points inside the shaded coverage areas.');
    const best=(group,reverse=false)=>{let choices=[];for(const e of entranceGroups[group]){try{const route=reverse?walk(e.coord,destination,shelter):walk(origin,e.coord,shelter);choices.push({...route,entrance:e,cost:route.metres+(shelter?route.exposed*.45:0)});}catch{}}choices.sort((a,b)=>a.cost-b.cost);if(!choices.length)throw new Error('A connected public walking route to a station entrance is not available in this extract.');return choices[0];};
    const access=best(id+'-origin'),egress=best(id+'-destination',true),rail=N.rail[id];
    const value={access,egress,rail,geometry:[...access.geometry,rail.stops[0].coord,...rail.geometry,egress.entrance.coord,...egress.geometry],walk:access.minutes+egress.minutes,walkMetres:access.metres+egress.metres};
    routeCache.set(key,value);if(routeCache.size>60)routeCache.delete(routeCache.keys().next().value);return value;
  }
  const api={network:N,distance,inBounds,walk,candidate,snap};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SmartCommGeo=api;
})(globalThis);
