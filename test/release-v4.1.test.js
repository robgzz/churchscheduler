import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeInput } from '../src/chatHub/normalize.js';
import { resolveIntent } from '../src/chatHub/resolver.js';
import { authorize } from '../src/chatHub/policy.js';
import { parseDateFromText } from '../src/chatHub/dates.js';

const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('V4.1 Chat Hub resolves everyday Spanish assignment questions deterministically',()=>{
  const n=normalizeInput('Oye, ¿qué me toca a mí este domingo?');
  const r=resolveIntent(n,{isAdmin:false});
  assert.equal(r.id,'assignments.mine');
  assert.ok(r.confidence>=0.55);
});

test('V4.1 corrects bounded typos for announcement queries',()=>{
  const n=normalizeInput('Donde va a ser la proxima confrqternidad?');
  assert.match(n.normalized,/confraternidad/);
  assert.equal(resolveIntent(n,{isAdmin:false}).id,'announcements.query');
});

test('V4.1 recognizes parent pickup code recovery',()=>{
  const r=resolveIntent(normalizeInput('Olvide mi codigo para recoger a mi hija'),{isAdmin:false});
  assert.equal(r.id,'children.pickupCode');
});

test('V4.1 recognizes admin bulletin upload and protects it by capability',()=>{
  const r=resolveIntent(normalizeInput('Sube el boletin de esta semana'),{isAdmin:true});
  assert.equal(r.id,'admin.bulletinUpload');
  assert.equal(authorize({member:{groups:['members'],adminAccess:false}},'admin'),false);
  assert.equal(authorize({member:{groups:['members'],adminAccess:true}},'admin'),true);
});

test('V4.1 understands Spanish date references without AI',()=>{
  assert.equal(parseDateFromText('el 22 de septiembre',{todayISO:'2026-09-11',timezone:'America/Chicago'}),'2026-09-22');
});

test('V4.1 Chat Hub is a server-enforced optional module',()=>{
  const registry=read('src/modules/registry.js'),route=read('src/routes/chatHub.js'),server=read('src/server.js');
  assert.match(registry,/id:'chatHub'.*defaultEnabled:true/);
  assert.match(route,/requireModule\('chatHub'\)/);
  assert.match(server,/app\.use\('\/api\/chat',chatHubRouter\)/);
});

test('V4.1 enables visible voice input while keeping deterministic message processing',()=>{
  const server=read('src/server.js'),app=read('public/assets/app.js');
  assert.match(server,/microphone=\(self\)/);
  assert.match(app,/SpeechRecognition\|\|window\.webkitSpeechRecognition/);
  assert.match(app,/pointerdown/);
  assert.match(app,/Press and hold to speak|Mantén presionado para hablar/);
});

test('V4.1 protects pickup codes at rest and never stores plaintext in check-in records',()=>{
  const member=read('src/routes/member.js'),vault=read('src/security/pickupCodeVault.js');
  assert.match(member,/pickupCodeEncrypted:encryptPickupCode\(pickupCode\)/);
  assert.match(member,/pickupCodeHash,pickupCodeEncrypted/);
  assert.match(vault,/aes-256-gcm/);
  assert.match(vault,/PICKUP_CODE_FORBIDDEN/);
});

test('V4.1 infrastructure includes Chat Hub tables and pickup key secret',()=>{
  const bicep=read('infra/main.bicep');
  assert.match(bicep,/'ChatSessions'/);
  assert.match(bicep,/'ChatUnknowns'/);
  assert.match(bicep,/pickupCodeEncryptionKey/);
  assert.match(bicep,/CHILD_PICKUP_CODE_ENCRYPTION_KEY/);
});

test('V4.1 UI exposes Chat Hub in nav, home, floating action and admin module icon',()=>{
  const app=read('public/assets/app.js'),admin=read('public/assets/admin.js'),css=read('public/assets/styles.css');
  assert.match(app,/id:'chat'.*Chat Hub/);
  assert.match(app,/chat-hub-fab/);
  assert.match(app,/chat-home-card/);
  assert.match(admin,/chatHub:'💬'/);
  assert.match(css,/\.chat-mic-btn/);
});
