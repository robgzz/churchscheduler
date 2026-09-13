import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeInput } from '../src/chatHub/normalize.js';
import { compileDeterministic } from '../src/dce/compiler.js';
import { churchHubDomainPack } from '../src/chatHub/domainPack.js';
import { arbitrateTurn, suspendGoal, resumeSuspendedGoal } from '../src/chatHub/goalArbitrator.js';
import { assistancePlan } from '../src/chatHub/assistancePlanner.js';
import { parseDateFromText } from '../src/chatHub/dates.js';

const actor={isAdmin:true,isOwner:false};
const frame=q=>compileDeterministic({normalized:normalizeInput(q),domainPack:churchHubDomainPack,context:{},actor});

test('V5.6 DCE distinguishes missing song selections from selecting my own songs',()=>{
  const f=frame('¿Quién falta escoger cantos?');
  assert.equal(f.intent,'admin.pendingSongs');
  assert.deepEqual(f.projection,['person']);
  assert.notEqual(assistancePlan('¿Quién falta escoger cantos?',{},actor)?.intent,'songs.select');
});

test('V5.6 DCE distinguishes selected songs, song status, history, and library search',()=>{
  assert.equal(frame('Cuales son mis cantos?').intent,'songs.mine');
  assert.equal(frame('Dime los cantos que escogi.').intent,'songs.mine');
  assert.equal(frame('Ya estan elegidos mis cantos?').intent,'songs.status');
  assert.equal(frame('Mis cantos anteriores').intent,'songs.history');
  assert.equal(frame('Busca el canto 141').intent,'songs.search');
});

test('V5.6 DCE self possession wins over generic program lookup',()=>{
  const f=frame('Que asignaciones tengo?');
  assert.equal(f.intent,'assignments.mine');
  assert.equal(f.subject.scope,'self');
});

test('V5.6 church ontology understands communion language and previous Sunday',()=>{
  const f=frame('Quien oro en la cena el domingo pasado?');
  assert.equal(f.intent,'program.query');
  assert.equal(f.filters.role,'communion');
  assert.equal(f.filters.serviceType,'sunday_worship');
  assert.deepEqual(f.projection,['person']);
  assert.equal(parseDateFromText('domingo pasado',{todayISO:'2026-09-12'}),'2026-09-06');
});

test('V5.6 goal arbitration prevents sticky administrator workflow from swallowing tasks',()=>{
  const state={pending:null,lastIntent:'admin.programAdminSet',context:{activeGoal:{procedureId:'program_admin.change',status:'collecting_admin',expectedSlot:'administrator',options:[{id:'m1',name:'Manuel Rodriguez'}]}}};
  assert.equal(arbitrateTurn(normalizeInput('Manuel Rodriguez'),state).mode,'continue');
  assert.equal(arbitrateTurn(normalizeInput('Que tareas tengo?'),state).mode,'new_goal');
  assert.equal(arbitrateTurn(normalizeInput('Dime los cantos que escogi'),state).mode,'new_goal');
});

test('V5.6 pending confirmations are interruptible by explicit unrelated questions',()=>{
  const state={pending:{type:'program_admin.confirm',memberId:'m1'},lastIntent:'admin.programAdminSet',context:{activeGoal:{procedureId:'program_admin.change'}}};
  assert.equal(arbitrateTurn(normalizeInput('si'),state).mode,'confirmation');
  assert.equal(arbitrateTurn(normalizeInput('que tareas tengo'),state).mode,'new_goal');
});

test('V5.6 goal stack can suspend and resume a prior workflow',()=>{
  const state={pending:{type:'program_admin.confirm',memberId:'m1'},lastIntent:'admin.programAdminSet',context:{activeGoal:{procedureId:'program_admin.change'}}};
  suspendGoal(state,'test');
  assert.equal(state.pending,null);
  assert.equal(state.context.suspendedGoals.length,1);
  assert.equal(resumeSuspendedGoal(state),true);
  assert.equal(state.pending.type,'program_admin.confirm');
});

test('V5.6 frames expose multidimensional deterministic confidence',()=>{
  const f=frame('Quien va a predicar el domingo?');
  assert.equal(f.confidenceByComponent.speechAct,1);
  assert.equal(f.confidenceByComponent.domain,1);
  assert.equal(f.confidenceByComponent.resource,1);
  assert.equal(f.confidenceByComponent.entity,1);
});
import { graphFor } from '../src/chatHub/capabilityGraph.js';
import { programReadinessTrace } from '../src/chatHub/ruleTrace.js';

test('V5.6 capability graph exposes deterministic affordances for Songs',()=>{
  const g=graphFor('songs');
  assert.ok(g.read.includes('songs.mine'));
  assert.ok(g.write.includes('songs.select'));
  assert.ok(g.actionsEs.some(x=>/historial/i.test(x)));
});

test('V5.6 rule trace explains program readiness from business-state facts',()=>{
  const t=programReadinessTrace({readiness:{ready:false,openAssignments:2,missingSongs:1}});
  assert.equal(t.passed,false);
  assert.deepEqual(t.reasons.filter(x=>!x.passed).map(x=>x.type),['openAssignments','missingSongs']);
});
