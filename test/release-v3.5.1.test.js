import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('V3.5.1 fixes admin bilingual helper used by People and Settings',()=>{
  const admin=read('public/assets/admin.js');
  assert.match(admin,/const l=\(en,es\)=>locale\(\)==='en'\?en:es/);
  assert.match(admin,/Leadership Reports/);
  assert.match(admin,/Children's Check-in/);
});

test('V3.5.1 adds nursery toddler worker roles and caregiver portal',()=>{
  const admin=read('public/assets/admin.js'),app=read('public/assets/app.js'),member=read('src/routes/member.js');
  assert.match(admin,/childrenWorkerRoles/);
  assert.match(admin,/Nursery worker/);
  assert.match(admin,/Toddler worker/);
  assert.match(app,/renderChildCarePortal/);
  assert.match(member,/children-worker\/check-ins\/\:id\/alert/);
});

test('V3.5.1 child profiles include gender care area and special instructions',()=>{
  const app=read('public/assets/app.js'),member=read('src/routes/member.js'),report=read('src/services/reporting.js');
  assert.match(app,/Special instructions for caregivers/);
  assert.match(app,/name="gender"/);
  assert.match(app,/name="careArea"/);
  assert.match(member,/specialInstructions/);
  assert.match(report,/ParentAlerts/);
});
