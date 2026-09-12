import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeInput } from '../src/chatHub/normalize.js';
import { resolveIntent } from '../src/chatHub/resolver.js';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const resolve=(q,isAdmin=false)=>resolveIntent(normalizeInput(q),{isAdmin});

test('V4.4 server recognizes a Church Administrator stored on the member profile as admin',()=>{
  const middleware=read('src/auth/middleware.js');
  assert.match(middleware,/member\?\.churchAdministrator === true/);
  const admin=read('public/assets/admin.js');
  assert.match(admin,/memberOwner=state\.me\.member\?\.churchAdministrator===true/);
});

test('V4.4 protects admin JS from stale PWA module graphs',()=>{
  const sw=read('public/service-worker.js'),server=read('src/server.js'),admin=read('public/assets/admin.js');
  assert.match(admin,/i18n\.js\?v=(?:4(?:5|6)0|500)/);
  assert.match(sw,/cache:'no-store'/);
  assert.match(sw,/url\.pathname\.endsWith\('\.js'\)/);
  assert.match(server,/no-cache, no-store, must-revalidate/);
});

test('V4.4 bottom nav is a true touch-scroll strip',()=>{
  const css=read('public/assets/styles.css');
  assert.match(css,/\.bottom-nav\{[^}]*overflow-x:auto!important[^}]*touch-action:pan-x!important/s);
  assert.match(css,/\.bottom-nav \.nav-btn\{[^}]*flex:0 0 72px!important/s);
  assert.match(css,/-webkit-overflow-scrolling:touch!important/);
});

test('V4.4 event/task member views expire by church-local date while retaining report records',()=>{
  const routes=read('src/routes/hubModules.js');
  assert.match(routes,/x\.dateISO>=today/);
  assert.match(routes,/x\.dueDate>=today/);
  assert.match(routes,/hiddenByMember:true/);
  assert.match(routes,/hiddenByAssignee:true/);
  assert.match(routes,/followup\.hidden_by_assignee/);
  assert.match(routes,/event\.hidden_by_member/);
});

test('V4.4 owners may delete their own prayer requests at any time',()=>{
  const member=read('src/routes/member.js'),chat=read('src/chatHub/handlers.js');
  assert.match(member,/memberRouter\.delete\('\/petitions\/:id'/);
  assert.match(member,/owners may delete their own petition at any time/);
  assert.match(chat,/case 'prayer\.delete'/);
});

test('V4.4 Church news separates one bulletin from announcements',()=>{
  const app=read('public/assets/app.js'),css=read('public/assets/styles.css');
  assert.match(app,/bulletin-feature/);
  assert.match(app,/church-news-hero/);
  assert.match(app,/kind==='bulletin'/);
  assert.match(app,/kind==='announcement'/);
  assert.match(css,/\.bulletin-feature/);
});

test('V4.4 Chat Hub resolves broad bilingual and Spanglish member language',()=>{
  const cases=[
    ['What me toca este domingo','assignments.mine'],
    ['Quien is preaching este domingo','program.query'],
    ['How many anuncios hay today','announcements.count'],
    ['Show me los anuncios','announcements.list'],
    ['Open mis tareas','navigation.open'],
    ['Cancel mi tarea','tasks.cancel'],
    ['Quita este evento de mi pantalla','events.dismiss'],
    ['Create una peticion','prayer.create'],
    ['Delete mi peticion','prayer.delete'],
    ['Show me my nursery roster','children.workerStatus'],
    ['Cuales son los servicios','services.query']
  ];
  for(const [q,id] of cases)assert.equal(resolve(q,false).id,id,q);
});

test('V4.4 Chat Hub resolves broad bilingual and Spanglish admin language',()=>{
  const cases=[
    ['Create un miembro','admin.memberCreate'],
    ['Upload el boletin','admin.bulletinUpload'],
    ['Create un anuncio','admin.announcementCreate'],
    ['Create un evento','admin.eventCreate'],
    ['Assign tarea a Roberto','admin.taskCreate'],
    ['Show peticiones privadas','admin.prayer.list'],
    ['Abre reportes','admin.reports.query'],
    ['Estado de comunicaciones','admin.communications.query'],
    ['Audit log','admin.audit.query'],
    ['Enable chat hub','admin.moduleToggle'],
    ['Open admin console','admin.console']
  ];
  for(const [q,id] of cases)assert.equal(resolve(q,true).id,id,q);
});

test('V4.4 Chat Hub keeps admin writes permission-gated and module-scoped',()=>{
  const policy=read('src/chatHub/policy.js'),engine=read('src/chatHub/engine.js');
  assert.match(policy,/capability==='admin'/);
  assert.match(policy,/capability==='owner'/);
  assert.match(engine,/admin\.memberCreate/);
  assert.match(engine,/admin\.moduleToggle/);
  assert.match(engine,/moduleState/);
});
