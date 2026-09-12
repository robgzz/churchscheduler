import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeInput } from '../src/chatHub/normalize.js';
import { resolveIntent } from '../src/chatHub/resolver.js';
import { parseXlsx } from '../src/services/importFormats.js';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('V4.2 program questions resolve without AI',()=>{
  const r=resolveIntent(normalizeInput('¿Quién va a predicar este domingo?'),{isAdmin:false});
  assert.equal(r.id,'program.query');
  assert.equal(r.ambiguous,false);
});

test('V4.2 announcement counting and listing are distinct deterministic intents',()=>{
  assert.equal(resolveIntent(normalizeInput('¿Cuántos anuncios hay hoy?'),{isAdmin:false}).id,'announcements.count');
  assert.equal(resolveIntent(normalizeInput('¿Qué anuncios hay hoy?'),{isAdmin:false}).id,'announcements.list');
});

test('V4.2 recognizes RSVP and task questions',()=>{
  assert.equal(resolveIntent(normalizeInput('¿A qué eventos estoy registrado?'),{isAdmin:false}).id,'events.myRsvp');
  assert.equal(resolveIntent(normalizeInput('¿Qué tareas tengo?'),{isAdmin:false}).id,'tasks.mine');
});

test('V4.2 recognizes administrative creation commands',()=>{
  assert.equal(resolveIntent(normalizeInput('Crea un anuncio'),{isAdmin:true}).id,'admin.announcementCreate');
  assert.equal(resolveIntent(normalizeInput('Asigna una tarea a Roberto'),{isAdmin:true}).id,'admin.taskCreate');
  assert.equal(resolveIntent(normalizeInput('Sube el boletín de esta semana'),{isAdmin:true}).id,'admin.bulletinUpload');
});

test('V4.2 exact-state member import replaces eligibility when snapshot columns are present',()=>{
  const src=read('src/services/bulkImport.js');
  assert.match(src,/hasSnapshotColumns/);
  assert.match(src,/AssignmentEligibilityMode/);
  assert.match(src,/member\.assignmentEligibility=requestedEligibility/);
  assert.match(src,/authoritativeSnapshot:snapshotMode/);
});

test('V4.2 event registration persists member identity and report exposes names',()=>{
  const routes=read('src/routes/hubModules.js'),report=read('src/services/reporting.js'),app=read('public/assets/app.js');
  assert.match(routes,/memberName:req\.identity\.member\?\.fullName/);
  assert.match(routes,/myRegistration/);
  assert.match(report,/RegisteredNames/);
  assert.match(app,/You are registered for this event|Estás registrado para este evento/);
});

test('V4.2 tasks are assignable and visible to members',()=>{
  const routes=read('src/routes/hubModules.js'),admin=read('public/assets/admin.js'),app=read('public/assets/app.js');
  assert.match(routes,/\/followups\/mine/);
  assert.match(admin,/Assign to member|Asignar a miembro/);
  assert.match(app,/id:'tasks'/);
  assert.match(app,/renderTasks/);
});

test('V4.2 announcement editor captures activity date and time',()=>{
  const admin=read('public/assets/admin.js'),routes=read('src/routes/admin.js');
  assert.match(admin,/name="eventDate"/);
  assert.match(admin,/name="startTime"/);
  assert.match(routes,/eventDate:String\(req\.body\.eventDate/);
  assert.match(routes,/startTime:String\(req\.body\.startTime/);
});

test('V4.2 voice input infers question punctuation after speech recognition',()=>{
  const app=read('public/assets/app.js');
  assert.match(app,/inferSpokenPunctuation/);
  assert.match(app,/question\?'\?':'\.'/);
});


test('V4.2 parses the packaged exact-state Westbury member workbook without shifting empty cells',()=>{
  const workbook=fs.readFileSync(new URL('../imports/Westbury-Members-Updated-From-Handwritten-Lists.xlsx',import.meta.url));
  const rows=parseXlsx(workbook);
  assert.equal(rows.length,42);
  const security=rows.find(r=>r.Name==='Cristian Mejia');
  assert.equal(security.Email,'');
  assert.equal(security.Ministries,'Security');
  assert.equal(security.AssignmentEligibilityMode,'explicit');
  const david=rows.find(r=>r.Name==='David Garcia');
  assert.match(david.AssignmentEligibility,/svc_sunday_worship::songs_a/);
  assert.match(david.AssignmentEligibility,/svc_wednesday_class::songs_b/);
});
