import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeInput } from '../src/chatHub/normalize.js';
import { resolveIntent } from '../src/chatHub/resolver.js';

const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('V4.3 recognizes member creation/account language for admins',()=>{
  for(const phrase of ['Quiero agregar un miembro.','Crear una cuenta de miembro.','Nuevo miembro']){
    const r=resolveIntent(normalizeInput(phrase),{isAdmin:true});
    assert.equal(r.id,'admin.memberCreate');assert.equal(r.ambiguous,false);
  }
  assert.equal(normalizeInput('Crear una cuenta de miembro.').normalized.includes('cuantas'),false);
});

test('V4.3 recognizes prayer list and creation requests',()=>{
  assert.equal(resolveIntent(normalizeInput('Crear una petición.'),{isAdmin:false}).id,'prayer.create');
  assert.equal(resolveIntent(normalizeInput('Qué peticiones hay?'),{isAdmin:false}).id,'prayer.list');
  assert.equal(resolveIntent(normalizeInput('Muéstrame todas las peticiones actuales.'),{isAdmin:true}).id,'admin.prayer.list');
});

test('V4.3 keeps Church Administrator access valid on the admin client and Chat policy',()=>{
  assert.match(read('public/assets/admin.js'),/state\.me\.member\?\.churchAdministrator/);
  assert.match(read('src/chatHub/policy.js'),/member\?\.churchAdministrator===true/);
});

test('V4.3 bottom navigation is horizontally scrollable on narrow phones',()=>{
  const css=read('public/assets/styles.css');
  assert.match(css,/\.bottom-nav\{[^}]*overflow-x:auto/s);
  assert.match(css,/\.nav-btn\{[^}]*flex:0 0 72px/s);
});

test('V4.3 prayer requests expire after fourteen days and owners can delete expired requests',()=>{
  const member=read('src/routes/member.js');
  assert.match(member,/PETITION_RETENTION_DAYS=14/);
  assert.match(member,/memberRouter\.delete\('\/petitions\/:id'/);
  assert.match(member,/PETITION_DELETE_NOT_YET_AVAILABLE/);
});

test('V4.3 offers secure alternate child pickup verification',()=>{
  const member=read('src/routes/member.js');
  assert.match(member,/parent-verification/);
  assert.match(member,/parent_verification/);
  assert.match(member,/photo_id/);
  assert.match(member,/PHOTO_ID_CONFIRMATION_REQUIRED/);
});

test('V4.3 places planned absence after assignment status on Home',()=>{
  const app=read('public/assets/app.js');
  assert.match(app,/\$\{next\}\$\{state\.me\?unavailabilityCard\(\):''\}/);
});

test('V4.3 Chat Hub includes deterministic admin writes and RSVP actions',()=>{
  const handlers=read('src/chatHub/handlers.js');
  for(const token of ['memberCreatePending','prayerCreatePending','scheduleGenerateStart','rsvpStart','moduleToggleStart','parentVerification'])assert.ok(handlers.includes(token),token);
});
