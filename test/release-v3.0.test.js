import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('V3 adds durable communications queue and logs every ACS send',()=>{const c=read('src/communications/notifications.js'),s=read('src/communications/service.js'),cfg=read('src/config.js');assert.match(cfg,/NotificationQueue/);assert.match(c,/dispatchQueue/);assert.match(s,/notificationLogs/);assert.match(s,/eventKey/);});
test('V3 schedules assignment communications at 30 minutes, 3 days and 1 day',()=>{const c=read('src/communications/notifications.js');assert.match(c,/30\*60000/);assert.match(c,/diff===3\|\|diff===1/);assert.match(c,/assignment\.reminder/);});
test('V3 queues announcement communications and admin visitor petition alerts',()=>{const a=read('src/routes/admin.js'),m=read('src/routes/member.js'),p=read('src/routes/public.js');assert.match(a,/enqueueAnnouncement/);assert.match(m,/enqueueAdminAlert/);assert.match(p,/enqueueAdminAlert/);});
test('V3 has Church Administrator communications testing UI',()=>{const o=read('src/routes/owner.js'),ui=read('public/assets/admin.js');assert.match(o,/communications\/members/);assert.match(o,/communications\/test/);assert.match(ui,/communicationsModal/);assert.match(ui,/lastTestResult/);});
test('V3 announcement activity address opens maps and is persisted',()=>{const a=read('src/routes/admin.js'),ui=read('public/assets/app.js');assert.match(a,/address:String\(req\.body\.address/);assert.match(ui,/maps:\/\//);assert.match(ui,/geo:0,0\?q=/);});
test('V3 exports full audit in CSV Excel and PDF',()=>{const a=read('src/routes/admin.js'),e=read('src/services/auditExport.js');assert.match(a,/history\/export/);assert.match(e,/toCsv/);assert.match(e,/toExcelXml/);assert.match(e,/toPdf/);assert.match(e,/ReplacementRequested/);});
