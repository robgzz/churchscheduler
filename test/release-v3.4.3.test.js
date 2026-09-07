import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
test('v3.4.3 has native push device registration',()=>{const m=read('src/routes/member.js');assert.match(m,/push-devices/);const c=read('src/config.js');assert.match(c,/PushDevices/);});
test('v3.4.3 uses Firebase Admin and push logs',()=>{const p=read('src/communications/push.js');assert.match(p,/firebase-admin/);const s=read('src/communications/service.js');assert.match(s,/sendPush/);assert.match(s,/channel:'push'/);});
test('v3.4.3 frontend registers Capacitor push',()=>{const a=read('public/assets/app.js');assert.match(a,/PushNotifications/);assert.match(a,/requestPermissions/);assert.match(a,/\/api\/member\/push-devices/);});
test('v3.4.3 admin communications supports push test',()=>{const a=read('public/assets/admin.js');assert.match(a,/value="push"/);const o=read('src/routes/owner.js');assert.match(o,/channel==='push'/);});
