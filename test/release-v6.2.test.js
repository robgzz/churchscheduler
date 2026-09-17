import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('V6.2 administrator module invokes its canonical bootstrap exactly once',()=>{
  const admin=read('public/assets/admin.js');
  const calls=[...admin.matchAll(/\binit\(\);/g)];
  assert.equal(calls.length,1);
  assert.match(admin,/async function init\(\)/);
});

test('V6.2 removes Chat Hub from bottom tray while preserving floating access',()=>{
  const app=read('public/assets/app.js');
  assert.doesNotMatch(app,/items\.push\(\{id:'chat',ico:'💬'/);
  assert.match(app,/function ensureChatFab\(\)/);
  assert.match(app,/function injectChatHome\(\)/);
});

test('V6.2 native push registers the actual Capacitor platform',()=>{
  const app=read('public/assets/app.js');
  assert.match(app,/cap\.getPlatform\?\.\(\)/);
  assert.doesNotMatch(app,/platform:'android',deviceName/);
});

test('V6.2 backend supports iOS APNs and Android FCM independently',()=>{
  const push=read('src/communications/push.js');
  assert.match(push,/\['android','ios'\]/);
  assert.match(push,/api\.push\.apple\.com/);
  assert.match(push,/api\.sandbox\.push\.apple\.com/);
  assert.match(push,/sendEachForMulticast/);
  assert.match(push,/apns-push-type/);
});

test('V6.2 declares Capacitor iOS and Westbury native identity',()=>{
  const pkg=JSON.parse(read('package.json'));
  const cap=JSON.parse(read('capacitor.config.json'));
  assert.equal(pkg.dependencies['@capacitor/ios'],'8.5.1');
  assert.equal(cap.appId,'com.exonuvia.westburychurchscheduler');
  assert.equal(cap.appName,'Westbury Church Hub');
});
