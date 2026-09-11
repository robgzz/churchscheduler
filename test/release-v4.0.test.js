import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
test('V4 centralizes optional module state and enforcement',()=>{const registry=read('src/modules/registry.js'),owner=read('src/routes/owner.js'),publicRoute=read('src/routes/public.js');assert.match(registry,/moduleCatalog/);assert.match(registry,/requireModule/);assert.match(owner,/\/modules/);assert.match(publicRoute,/normalizedModules/);});
test('V4 makes pickup a caregiver-verified handoff',()=>{const member=read('src/routes/member.js'),app=read('public/assets/app.js');assert.match(member,/pickup_requested/);assert.match(member,/pickupCodeHash/);assert.match(member,/receivedByName/);assert.match(member,/children-worker\/check-ins\/\:id\/release/);assert.match(app,/Record physical handoff/);});
test('V4 validates reports and protects CSV cells',()=>{const report=read('src/services/reporting.js');assert.match(report,/Unknown report type/);assert.match(report,/PublishedAt/);assert.match(report,/IsPublished/);assert.match(report,/possiblyTruncated/);assert.match(report,/INVALID_DATE_RANGE/);});
test('V4 adds Events RSVP and Follow-up modules',()=>{const routes=read('src/routes/hubModules.js'),config=read('src/config.js');assert.match(routes,/eventRegistrations/);assert.match(routes,/followup\.created/);assert.match(config,/ChurchEvents/);assert.match(config,/FollowUps/);});
