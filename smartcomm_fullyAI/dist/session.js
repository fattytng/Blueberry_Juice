(function(root){
  'use strict';
  const E=typeof module!=='undefined'&&module.exports?require('./planner.js'):root.SmartCommEngine;
  const KEY='smartcomm.activeJourney';
  function restore(storage,now=Date.now()){
    try{
      const record=JSON.parse(storage.getItem(KEY)||'null');
      if(!record)return null;
      const started=Date.parse(record.startedAt);
      if(record.version!==1||!Number.isFinite(started)||now-started<0||now-started>18*3600000||!['ewl','dtl','shuttle'].includes(record.route)||!Number.isInteger(record.step)||record.step<0||record.step>3)throw new Error('Invalid saved journey');
      const calculated=Date.parse(record.calculatedAt||record.startedAt);
      if(!Number.isFinite(calculated)||calculated>started||started-calculated>3600000)throw new Error('Invalid plan time');
      const plan=E.plan(record.preferences,record.scenario,record.snapshot,calculated);
      const route=plan.routes.find(r=>r.id===record.route);
      if(!route||route.blocked||route.walkExceeded)throw new Error('Invalid saved route');
      return {record,plan};
    }catch{try{storage.removeItem(KEY);}catch{}return null;}
  }
  function persist(storage,record){try{if(record)storage.setItem(KEY,JSON.stringify(record));else storage.removeItem(KEY);return true;}catch{return false;}}
  const api={restore,persist};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SmartCommSession=api;
})(globalThis);
