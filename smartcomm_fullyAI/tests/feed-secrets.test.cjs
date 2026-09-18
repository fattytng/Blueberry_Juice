const test=require('node:test'),assert=require('node:assert/strict');
const {conditions}=require('../lib/feeds.cjs');

test('feed failures do not return credentials from request errors',async()=>{
  const original=global.fetch,secret='test-only-account-key';
  global.fetch=async()=>{throw new Error('Request failed with AccountKey: '+secret);};
  try {
    const result=await conditions(secret);
    assert.equal(JSON.stringify(result).includes(secret),false);
    assert.equal(result.rail.status,'unavailable');
    assert.equal(result.rail.message,'Source could not be refreshed');
    assert.equal(result.crowd.ewl.status,'unavailable');
    assert.equal(result.crowd.dtl.status,'unavailable');
  } finally {global.fetch=original;}
});
