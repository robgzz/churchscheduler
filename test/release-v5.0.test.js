import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeInput } from '../src/chatHub/normalize.js';
import { compileDeterministic } from '../src/dce/compiler.js';
import { planFrame } from '../src/dce/queryPlanner.js';
import { churchHubDomainPack } from '../src/chatHub/domainPack.js';

const compile=(q,{admin=true,owner=true,context={}}={})=>compileDeterministic({normalized:normalizeInput(q),domainPack:churchHubDomainPack,context,actor:{isAdmin:admin,isOwner:owner}});
const expectIntent=(q,id,opts)=>assert.equal(compile(q,opts).intent,id,q);

test('V5 DCE composes worship questions instead of depending on exact phrases',()=>{
  const cases=[
    ['¿Qué me toca?','assignments.mine'],['when do I serve?','assignments.mine'],['what me toca este domingo?','assignments.mine'],
    ['¿Quién va a predicar este domingo?','program.query'],['who is preaching this Sunday?','program.query'],['who predica este Sunday?','program.query'],
    ['¿Quién le toca cantar el domingo?','program.query'],['who has cantos este domingo?','program.query'],['quien tiene vigilancia Sunday?','program.query'],
    ['¿Quién va a dar la clase del domingo?','program.query'],['who teaches Wednesday class?','program.query'],['quien da la clase los proximos 3 miercoles?','program.query'],
    ['¿En septiembre ha participado Eduardo Ayala?','program.participation'],['did Eduardo Ayala serve in September?','program.participation']
  ];
  for(const [q,id] of cases)expectIntent(q,id);
});

test('V5 DCE handles church communications and activity discovery in both languages',()=>{
  const cases=[
    ['¿Cuántos anuncios hay hoy?','announcements.count'],['show me los anuncios','announcements.list'],['hay confraternidad?','announcements.query'],
    ['where is la confraternidad?','announcements.query'],['boletin de esta semana','bulletins.latest'],['latest bulletin','bulletins.latest'],
    ['¿dónde es el siguiente evento?','events.query'],['what events are coming up?','events.query'],['a que eventos estoy registrado?','events.myRsvp'],
    ['registrame al evento','events.register'],['cancel my rsvp','events.cancelRsvp']
  ];
  for(const [q,id] of cases)expectIntent(q,id);
});

test('V5 DCE resolves prayer tasks children and profile requests compositionally',()=>{
  const cases=[
    ['tengo peticiones?','prayer.mine'],['muestrame las peticiones','prayer.list'],['quiero crear una peticion','prayer.create'],['delete my prayer request','prayer.delete'],
    ['que tareas tengo?','tasks.mine'],['mark my task complete','tasks.complete'],['cancela mi tarea','tasks.cancel'],['hide this task','tasks.dismiss'],
    ['nombres de mis niños?','children.status'],['what children do I have?','children.status'],['no recuerdo el codigo de mi hija','children.parentVerification'],['quiero recoger a mi hijo','children.pickupRequest'],
    ['mi perfil','profile.mine'],['what is my phone?','profile.mine'],['mis notificaciones','notifications.mine']
  ];
  for(const [q,id] of cases)expectIntent(q,id,{admin:false,owner:false});
});

test('V5 DCE recognizes broad admin commands while leaving authorization separate',()=>{
  const cases=[
    ['crear un miembro','admin.memberCreate'],['create member account','admin.memberCreate'],['hay un perfil para Antonio Mendoza?','admin.memberSearch'],
    ['genera el programa','admin.scheduleGenerate'],['estado del programa','admin.programStatus'],['cantos pendientes','admin.pendingSongs'],
    ['sube el boletin','admin.bulletinUpload'],['crea un anuncio','admin.announcementCreate'],['create an event','admin.eventCreate'],['asigna una tarea','admin.taskCreate'],
    ['que reportes hay disponibles?','admin.reports.query'],['communication status','admin.communications.query'],['audit log','admin.audit.query'],
    ['show modules','admin.modules.query'],['desactiva eventos','admin.moduleToggle'],['enable prayer','admin.moduleToggle'],['visitantes','admin.visitors.query']
  ];
  for(const [q,id] of cases)expectIntent(q,id);
  assert.equal(compile('crear un miembro',{admin:false,owner:false}).intent,'unknown');
});

test('V5 DCE emits canonical frames and query plans',()=>{
  const f=compile('¿Quién da la clase los próximos 3 miércoles?');
  assert.equal(f.speechAct,'query'); assert.equal(f.operation,'get'); assert.equal(f.domain,'worship');
  assert.equal(f.filters.role,'class_teacher'); assert.equal(f.filters.serviceType,'wednesday_class');
  assert.equal(f.time.mode,'next_occurrences'); assert.equal(f.time.count,3); assert.deepEqual(f.projection,['person']);
  const plan=planFrame(f); assert.equal(plan.source.domain,'worship'); assert.equal(plan.limit,3); assert.equal(plan.mutations,false);
});

test('V5 DCE preserves conversational follow-up context structurally',()=>{
  const first=compile('¿Quién va a predicar este domingo?');
  const follow=compile('¿y la próxima semana?',{context:{lastFrame:first}});
  assert.equal(follow.intent,'program.query'); assert.equal(follow.domain,'worship'); assert.equal(follow.filters.role,'meditation');
  assert.equal(follow.time.mode,'range');
});

test('V5 normalizer is conservative and does not corrupt high-value church words',()=>{
  assert.match(normalizeInput('quien le toca cantar el domingo?').normalized,/cantar/);
  assert.match(normalizeInput('enable prayer').normalized,/^enable prayer$/);
  assert.equal(normalizeInput('confrqternidad').normalized,'confraternidad');
  assert.notEqual(normalizeInput('cantar').normalized,'cuantas');
});

test('V5 DCE architecture is model-free and app-adapter based',()=>{
  const compiler=fs.readFileSync(new URL('../src/dce/compiler.js',import.meta.url),'utf8');
  const pack=fs.readFileSync(new URL('../src/chatHub/domainPack.js',import.meta.url),'utf8');
  const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
  assert.match(compiler,/compileDeterministic/); assert.match(pack,/churchHubDomainPack/);
  assert.equal(Object.keys(pkg.dependencies).some(x=>/openai|anthropic|gemini|llm/i.test(x)),false);
});
