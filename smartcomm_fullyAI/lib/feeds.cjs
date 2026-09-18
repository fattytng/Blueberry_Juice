const CACHE = new Map();
const INFLIGHT = new Map();
function normalizeRail(json) {
  let record = json.value ?? json;
  if (Array.isArray(record)) record = record[0];
  if (!record || ![1,2].includes(Number(record.Status)) || !Array.isArray(record.AffectedSegments) || !Array.isArray(record.Message)) throw new Error('Unexpected TrainServiceAlerts schema');
  return { Status: Number(record.Status), AffectedSegments: record.AffectedSegments.map(s => ({ Line:String(s.Line||''), Direction:String(s.Direction||''), Stations:String(s.Stations||''), FreePublicBus:String(s.FreePublicBus||''), FreeMRTShuttle:String(s.FreeMRTShuttle||''), MRTShuttleDirection:String(s.MRTShuttleDirection||'') })), Message:record.Message.map(m=>({Content:String(m.Content||''),CreatedDate:String(m.CreatedDate||'')})) };
}
function normalizeWeather(json) {
  const r=json.data?.items?.[0];
  if (!r?.valid_period || !Array.isArray(r.forecasts)) throw new Error('Unexpected weather schema');
  return { issuedAt:r.update_timestamp||r.timestamp, validStart:r.valid_period.start, validEnd:r.valid_period.end, forecasts:r.forecasts.filter(f=>['Tampines','City'].includes(f.area)).map(f=>({area:f.area,forecast:f.forecast})) };
}
function normalizeCrowd(json) {
  if(!Array.isArray(json.value)) throw new Error('Unexpected crowd schema');
  return json.value.map(r=>({Station:String(r.Station||''),StartTime:String(r.StartTime||''),EndTime:String(r.EndTime||''),CrowdLevel:['l','m','h'].includes(r.CrowdLevel)?r.CrowdLevel:'NA'}));
}
function normalizeCrowdForecast(json) {
  if(!Array.isArray(json.value))throw new Error('Unexpected crowd forecast schema');
  return json.value.flatMap(day=>{
    if(!Array.isArray(day.Stations))throw new Error('Unexpected forecast stations');
    return day.Stations.flatMap(station=>{
      if(!Array.isArray(station.Interval))throw new Error('Unexpected forecast intervals');
      return station.Interval.map(interval=>{
        const start=Date.parse(interval.Start);
        if(!Number.isFinite(start))throw new Error('Unexpected forecast time');
        return {Station:String(station.Station||''),StartTime:new Date(start).toISOString(),EndTime:new Date(start+1800000).toISOString(),CrowdLevel:['l','m','h'].includes(interval.CrowdLevel)?interval.CrowdLevel:'NA'};
      });
    });
  });
}
async function fetchFeed(name,url,ttlMs,normalize,key) {
  const old=CACHE.get(name);
  if(old&&Date.now()-Date.parse(old.fetchedAt)<ttlMs) return old;
  if(INFLIGHT.has(name)) return INFLIGHT.get(name);
  const task=(async()=>{
    try {
      const response=await fetch(url,{headers:{Accept:'application/json',...(key?{AccountKey:key}:{})},signal:AbortSignal.timeout(10000)});
      if(!response.ok){const error=new Error('Source request failed');error.httpStatus=response.status;throw error;}
      const record={status:'ok',source:url,fetchedAt:new Date().toISOString(),ttlMs,data:normalize(await response.json())};
      CACHE.set(name,record);return record;
    } catch(error) {
      // Retain provenance, but never relabel stale data as a successful refresh.
      // Never expose raw exceptions: request libraries can include credentials
      // or request headers in error messages.
      const message=error?.name==='TimeoutError'?'Source timed out':Number.isInteger(error?.httpStatus)?'Source returned HTTP '+error.httpStatus:'Source could not be refreshed';
      return {status:old?'stale':'unavailable',source:url,fetchedAt:old?.fetchedAt||null,ttlMs,data:old?.data||null,message};
    } finally {INFLIGHT.delete(name);}
  })();
  INFLIGHT.set(name,task);return task;
}
async function conditions(key=process.env.LTA_ACCOUNT_KEY) {
  const base='https://datamall2.mytransport.sg/ltaodataservice/';
  const absent={status:'not_configured',fetchedAt:null,ttlMs:0,data:null,message:'Set LTA_ACCOUNT_KEY on the server to enable this official feed.'};
  const [weather,rail,ewl,dtl,forecastEwl,forecastDtl]=await Promise.all([
    fetchFeed('weather','https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast',120000,normalizeWeather),
    key?fetchFeed('rail',base+'TrainServiceAlerts',60000,normalizeRail,key):absent,
    key?fetchFeed('crowd-ewl',base+'PCDRealTime?TrainLine=EWL',600000,normalizeCrowd,key):absent,
    key?fetchFeed('crowd-dtl',base+'PCDRealTime?TrainLine=DTL',600000,normalizeCrowd,key):absent,
    key?fetchFeed('forecast-ewl',base+'PCDForecast?TrainLine=EWL',3600000,normalizeCrowdForecast,key):absent,
    key?fetchFeed('forecast-dtl',base+'PCDForecast?TrainLine=DTL',3600000,normalizeCrowdForecast,key):absent
  ]);
  return {generatedAt:new Date().toISOString(),weather,rail,crowd:{ewl,dtl},forecast:{ewl:forecastEwl,dtl:forecastDtl}};
}
module.exports={conditions,normalizeRail,normalizeWeather,normalizeCrowd,normalizeCrowdForecast};
