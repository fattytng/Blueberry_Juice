"""Build a bounded, reproducible OSM graph from cached official API responses.

Input filenames: /private/tmp/smartcomm-{tampines,cbd,ewl,dtl}.osm.
Run only when refreshing the checked-in extract, not on every page load.
"""
import json, math, heapq, shutil
import xml.etree.ElementTree as ET
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
def tags(el): return {t.attrib['k']: t.attrib['v'] for t in el.findall('tag')}
def distance(a, b):
    dy=(a[0]-b[0])*111195; dx=(a[1]-b[1])*111195*math.cos(math.radians((a[0]+b[0])/2))
    return math.hypot(dx,dy)

nodes, ways, features, entrances = {}, {}, [], []
for area in ['tampines','cbd']:
    tree=ET.parse('/private/tmp/smartcomm-'+area+'.osm').getroot()
    local={int(n.attrib['id']):[float(n.attrib['lat']),float(n.attrib['lon'])] for n in tree.findall('node')}
    nodes.update(local)
    for w in tree.findall('way'):
        t=tags(w); ids=[int(n.attrib['ref']) for n in w.findall('nd')]
        if not all(i in local for i in ids): continue
        if t.get('highway'):
            ways[int(w.attrib['id'])]={'id':int(w.attrib['id']), 'nodes':ids, 'tags':{k:v for k,v in t.items() if k in ['highway','name','foot','access','covered','indoor','level','sidewalk','bridge','tunnel','wheelchair','oneway:foot','lit']}}
        if t.get('building') or t.get('natural')=='water' or t.get('leisure')=='park':
            features.append({'type':'Feature','properties':{'kind':'water' if t.get('natural')=='water' else 'park' if t.get('leisure')=='park' else 'building','name':t.get('name','')},'geometry':{'type':'Polygon','coordinates':[[[local[i][1],local[i][0]] for i in ids]]}})
    for n in tree.findall('node'):
        t=tags(n)
        if t.get('railway')=='subway_entrance':
            entrances.append({'id':int(n.attrib['id']), 'coord':local[int(n.attrib['id'])], 'name':t.get('name',''), 'ref':t.get('ref','')})

rail={}
for line,relid,startname,endname in [('ewl','2312796','Tampines','Raffles Place'),('dtl','7981642','Tampines (DT32)','Downtown')]:
    tree=ET.parse('/private/tmp/smartcomm-'+line+'.osm').getroot()
    ns={int(n.attrib['id']):[float(n.attrib['lat']),float(n.attrib['lon'])] for n in tree.findall('node')}
    nt={int(n.attrib['id']):tags(n) for n in tree.findall('node')}
    ws={int(w.attrib['id']):[int(n.attrib['ref']) for n in w.findall('nd')] for w in tree.findall('way')}
    rel=next(r for r in tree.findall('relation') if r.attrib['id']==relid)
    stops=[{'id':int(m.attrib['ref']),'name':nt[int(m.attrib['ref'])].get('name',''),'coord':ns[int(m.attrib['ref'])]} for m in rel.findall('member') if m.attrib['type']=='node' and m.attrib['role'].startswith('stop') and int(m.attrib['ref']) in ns]
    for i,s in enumerate(stops): s['code']=('EW'+str(i+1)) if line=='ewl' else 'DT'+str(35-i)
    si=next(i for i,s in enumerate(stops) if s['name']==startname); ei=next(i for i,s in enumerate(stops) if s['name']==endname)
    stops=stops[si:ei+1]
    graph={}
    for m in rel.findall('member'):
        if m.attrib['type']!='way' or m.attrib['role'] not in ['', 'forward','backward']: continue
        ids=ws.get(int(m.attrib['ref']),[])
        for a,b in zip(ids,ids[1:]):
            if a not in ns or b not in ns:continue
            d=distance(ns[a],ns[b]); graph.setdefault(a,[]).append((b,d)); graph.setdefault(b,[]).append((a,d))
    def nearest(c):return min(graph,key=lambda i:distance(c,ns[i]))
    def path(a,b):
        a=nearest(a);b=nearest(b);q=[(0,a)];cost={a:0};prev={}
        while q:
            d,n=heapq.heappop(q)
            if n==b:break
            if d>cost[n]:continue
            for nxt,w in graph[n]:
                if d+w<cost.get(nxt,float('inf')):cost[nxt]=d+w;prev[nxt]=n;heapq.heappush(q,(d+w,nxt))
        if b not in cost:raise ValueError('Rail geometry disconnected')
        ids=[b]
        while ids[-1]!=a:ids.append(prev[ids[-1]])
        return [ns[i] for i in reversed(ids)],round(cost[b])
    geometry=[];segments=[];total=0
    for a,b in zip(stops,stops[1:]):
        coords,metres=path(a['coord'],b['coord']);geometry.extend(coords if not geometry else coords[1:]);total+=metres
        segments.append({'from':a['code'],'to':b['code'],'geometry':coords,'metres':metres})
    rail[line]={'relation':relid,'stops':stops,'geometry':geometry,'segments':segments,'metres':total,'direction':'Tuas Link' if line=='ewl' else 'Bukit Panjang'}

used={i for w in ways.values() for i in w['nodes']}
data={'metadata':{'downloadedAt':datetime.now(timezone.utc).isoformat(),'source':'OpenStreetMap API 0.6','license':'ODbL 1.0','attribution':'© OpenStreetMap contributors','bounds':{'origin':[1.348,103.94,1.358,103.95],'destination':[1.275,103.844,1.289,103.858]},'urls':['https://www.openstreetmap.org/api/0.6/map?bbox=103.94,1.348,103.95,1.358','https://www.openstreetmap.org/api/0.6/map?bbox=103.844,1.275,103.858,1.289','https://www.openstreetmap.org/api/0.6/relation/2312796/full','https://www.openstreetmap.org/api/0.6/relation/7981642/full']},'nodes':{str(i):nodes[i] for i in used},'ways':list(ways.values()),'features':features,'entrances':entrances,'rail':rail}
(ROOT/'dist/data/network.js').write_text('/* OSM data: ODbL 1.0; see SOURCES.md. */\n(function(r){const d='+json.dumps(data,separators=(',',':'))+';if(typeof module!=="undefined"&&module.exports)module.exports=d;else r.SmartCommNetwork=d;})(globalThis);\n')
vendor=ROOT/'dist/vendor/leaflet';vendor.mkdir(parents=True,exist_ok=True)
for name in ['leaflet.js','leaflet.js.map','leaflet.css','images']:
    src=ROOT/'node_modules/leaflet/dist'/name;dst=vendor/name
    if src.is_dir():shutil.copytree(src,dst,dirs_exist_ok=True)
    else:shutil.copy2(src,dst)
shutil.copy2(ROOT/'node_modules/leaflet/LICENSE',vendor/'LICENSE')
print(json.dumps({'walkNodes':len(used),'ways':len(ways),'polygons':len(features),'railMetres':{k:v['metres'] for k,v in rail.items()},'bytes':(ROOT/'dist/data/network.js').stat().st_size}))
