import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeInput } from '../src/chatHub/normalize.js';
import { resolveIntent } from '../src/chatHub/resolver.js';

const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const resolve=(q,isAdmin=false)=>resolveIntent(normalizeInput(q),{isAdmin});

test('V4.6 admin root cause is fixed without settings monkey patches',()=>{
  const admin=read('public/assets/admin.js');
  assert.equal((admin.match(/async function settings\(\)/g)||[]).length,1);
  assert.doesNotMatch(admin,/settingsBase=settings/);
  assert.doesNotMatch(admin,/childrenAdminModalBase=/);
  assert.doesNotMatch(admin,/reportsModalBase=/);
  assert.match(admin,/id="module-settings"/);
});

test('V4.6 deterministic chat resolves reported natural-language failures',()=>{
  const cases=[
    ['quien va a dar la clase del domingo?','program.query'],
    ['Quien le toca cantar el domingo?','program.query'],
    ['hay confraternidad?','announcements.query'],
    ['en el mes de septiembre ha participado Eduardo Ayala?','program.participation'],
    ['donde es el siguiente evento?','events.query'],
    ['tengo peticiones?','prayer.mine'],
    ['nombres de mis niños?','children.status'],
    ['hay un perfil para antonio mendoza?','admin.memberSearch']
  ];
  for(const [q,id] of cases)assert.equal(resolve(q,true).id,id,q);
});

test('V4.6 protects common words and singing vocabulary from fuzzy corruption',()=>{
  assert.equal(normalizeInput('hay un perfil para antonio mendoza?').normalized,'hay un perfil para antonio mendoza');
  assert.match(normalizeInput('quien le toca cantar el domingo?').normalized,/cantar/);
});

test('V4.6 cache graph is fully versioned',()=>{
  assert.match(read('public/admin/index.html'),/admin-loader\.js\?v=\d+/);
  assert.match(read('public/assets/admin-loader.js'),/admin\.js\?v=\d+/);
  assert.match(read('public/assets/admin.js'),/i18n\.js\?v=\d+/);
  assert.match(read('public/service-worker.js'),/v\d+/);
});
