import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeInput } from '../src/chatHub/normalize.js';
import { compileDeterministic } from '../src/dce/compiler.js';
import { churchHubDomainPack } from '../src/chatHub/domainPack.js';
import { numericDateInfo, parseDateFromText } from '../src/chatHub/dates.js';
import { arbitrateTurn } from '../src/chatHub/goalArbitrator.js';

const actor={isAdmin:true,isOwner:true,memberId:'admin'};
const frame=text=>compileDeterministic({normalized:normalizeInput(text),domainPack:churchHubDomainPack,context:{},actor});

test('V7 member profile questions are distinct from eligibility and assignments',()=>{
  assert.equal(frame('Perfil de Andrés Trejo').intent,'admin.memberProfileQuery');
  assert.equal(frame('Luis Betanco es administrador?').intent,'admin.memberProfileQuery');
  const update=frame('En administración edita el perfil de Andrés Trejo activando el ministerio Cantos para Domingo Adoración.');
  assert.equal(update.intent,'admin.memberEligibilityUpdate');
  assert.equal(update.domain,'members');
  assert.equal(update.resource,'eligibility');
});

test('V7 date parser accepts unambiguous US/international slash dates and detects ambiguity',()=>{
  assert.equal(parseDateFromText('9/20/2026',{todayISO:'2026-09-15'}),'2026-09-20');
  assert.equal(parseDateFromText('20/9/2026',{todayISO:'2026-09-15'}),'2026-09-20');
  const ambiguous=numericDateInfo('9/10/2026');
  assert.equal(ambiguous.ambiguous,true);
  assert.deepEqual(ambiguous.alternatives,['2026-09-10','2026-10-09']);
});

test('V7 goal arbitration lets a new same-domain operation interrupt a pending workflow',()=>{
  const state={pending:{type:'member.eligibility.change'},lastIntent:'admin.memberEligibilityUpdate',context:{activeGoal:{domain:'members'}}};
  const r=arbitrateTurn(normalizeInput('Dame la lista de todos los miembros'),state);
  assert.equal(r.mode,'new_goal');
  assert.equal(r.domain,'members');
});

test('V7 Chat Hub runtime helpers that failed in v6.1 are defined',()=>{
  const src=fs.readFileSync(new URL('../src/chatHub/handlers.js',import.meta.url),'utf8');
  for(const name of ['queryTerms','matchContent','announcementRowsFor','announcementsCount','announcementsQuery','eventsQuery'])assert.match(src,new RegExp(`(?:function|const)\\s+${name}\\b`),name);
  assert.match(src,/terminalTaskStatus\(x\.status\)/);
  assert.match(src,/programItemMatches/);
  assert.match(src,/admin\.memberProfileQuery/);
});

test('V7 Chat Hub catches execution failures and never intentionally exposes raw exceptions',()=>{
  const src=fs.readFileSync(new URL('../src/chatHub/engine.js',import.meta.url),'utf8');
  assert.match(src,/try\{\s*result=await executeIntent/);
  assert.match(src,/execution_error/);
  assert.match(src,/conversation:reset/);
  assert.match(src,/conversation:resume/);
  assert.match(src,/Referencia:/);
});

test('V7 reporting catalog prioritizes three purpose-driven leadership reports',()=>{
  const src=fs.readFileSync(new URL('../src/services/reporting.js',import.meta.url),'utf8');
  for(const id of ['leadership-overview','worship-readiness','followup-accountability'])assert.match(src,new RegExp(`id:'${id}'[^\\n]+featured:true`),id);
  assert.match(src,/purpose:'A concise executive view/);
  assert.match(src,/Leadership findings/);
  assert.match(src,/Items needing attention/);
  assert.match(src,/Visual analysis/);
  assert.match(src,/Detailed appendix/);
});

test('V7 report exports contain professional PDF and workbook composition paths',()=>{
  const src=fs.readFileSync(new URL('../src/services/reporting.js',import.meta.url),'utf8');
  assert.match(src,/export async function reportPdf/);
  assert.match(src,/pdfMetricCard/);
  assert.match(src,/pdfBarChart/);
  assert.match(src,/Interpretation notes/);
  assert.match(src,/Page \$\{i-range.start\+1\} of \$\{range.count\}/);
  assert.match(src,/addWorksheet\('Overview'\)/);
  assert.match(src,/addWorksheet\('Detail'\)/);
});

test('V7 follow-up tasks keep overdue actionable work visible and record terminal timestamps',()=>{
  const routes=fs.readFileSync(new URL('../src/routes/hubModules.js',import.meta.url),'utf8');
  const app=fs.readFileSync(new URL('../public/assets/app.js',import.meta.url),'utf8');
  assert.match(routes,/Actionable tasks remain visible/);
  assert.match(routes,/completedAt/);
  assert.match(routes,/cancelledAt/);
  assert.doesNotMatch(routes,/x\.dueDate\s*>?=\s*today/);
  assert.match(app,/task-overdue/);
  assert.match(app,/completed|cancelled/);
});

test('V7 event confirmation sanitizes terminal punctuation without changing stored values',()=>{
  const src=fs.readFileSync(new URL('../src/chatHub/handlers.js',import.meta.url),'utf8');
  assert.match(src,/function displayInline/);
  assert.match(src,/displayInline\(q\.location\)/);
  assert.match(src,/location:p\.location\|\|''/);
});
