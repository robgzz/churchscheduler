import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { churchSchema } from '../src/chatHub/domain/schema.js';
import { churchCapabilities, capabilityCoverage } from '../src/chatHub/domain/capabilities.js';
import { compileDeterministic } from '../src/dce/compiler.js';
import { churchHubDomainPack } from '../src/chatHub/domainPack.js';
import { normalizeInput } from '../src/chatHub/normalize.js';
import { programReadyTrace, canAssignTrace } from '../src/chatHub/domain/reasoning.js';
import { ensureDiscourse, setExpectedResponse, expectedResponse, rememberEntity, resolveReference } from '../src/dce/core/discourse.js';
import { planFrame } from '../src/dce/queryPlanner.js';

test('V6 DCE 4 exposes typed church domain schema and relationships',()=>{
  assert.ok(churchSchema.entity('entity.member'));
  assert.ok(churchSchema.entity('entity.program'));
  assert.ok(churchSchema.relation('rel.eligible_for'));
  assert.ok(churchSchema.relation('rel.responsible_for'));
});

test('V6 capability registry covers all major Church Hub domains',()=>{
  const c=capabilityCoverage();
  assert.ok(c.total>=45);
  for(const d of ['worship','songs','publications','events','tasks','prayer','children','members','modules'])assert.ok(c.byDomain[d]>0,d);
  assert.ok(c.write>=10);
});

test('V6 semantic frame captures predicate, result type, ownership and scope',()=>{
  const frame=compileDeterministic({normalized:normalizeInput('Cuales son mis cantos?'),domainPack:churchHubDomainPack,context:{},actor:{isAdmin:false}});
  assert.equal(frame.intent,'songs.mine');
  assert.equal(frame.subject.scope,'self');
  assert.equal(frame.predicate,'selected_for');
  assert.ok(frame.resultType);
  const plan=planFrame(frame);
  assert.equal(plan.predicate,'selected_for');
  assert.ok(plan.algebra);
});

test('V6 semantic frame distinguishes missing song people projection',()=>{
  const frame=compileDeterministic({normalized:normalizeInput('¿Quién falta escoger cantos?'),domainPack:churchHubDomainPack,context:{},actor:{isAdmin:true}});
  assert.equal(frame.intent,'admin.pendingSongs');
  assert.deepEqual(frame.projection,['person']);
});

test('V6 discourse keeps typed expected responses and typed references',()=>{
  const state={context:{}};ensureDiscourse(state);setExpectedResponse(state,{type:'entity_reference',entityType:'administrator'});
  assert.equal(expectedResponse(state).entityType,'administrator');
  rememberEntity(state,{type:'member',id:'m1',name:'Roberto'});rememberEntity(state,{type:'service',id:'s1',name:'Worship'});
  assert.equal(resolveReference(state,'member').id,'m1');
});

test('V6 rule engine produces proof-style readiness and eligibility traces',()=>{
  const r=programReadyTrace({openAssignments:1,missingSongs:0});
  assert.equal(r.passed,false);assert.equal(r.reasons.find(x=>x.rule==='assignments.filled').passed,false);
  const e=canAssignTrace({active:true,serviceAvailable:true,eligible:false,unavailable:false,conflict:false});
  assert.equal(e.passed,false);assert.equal(e.reasons.find(x=>x.rule==='ministry.eligible').passed,false);
});

test('V6 security uses host-prefixed production cookie and idle session support',()=>{
  const sessions=fs.readFileSync(new URL('../src/auth/sessions.js',import.meta.url),'utf8');
  const config=fs.readFileSync(new URL('../src/config.js',import.meta.url),'utf8');
  assert.match(sessions,/__Host-westbury_session/);
  assert.match(sessions,/idleExpiresAt/);
  assert.match(config,/sessionIdleDays/);
});

test('V6 security adds persistent login throttle and Fetch Metadata defense',()=>{
  const auth=fs.readFileSync(new URL('../src/routes/auth.js',import.meta.url),'utf8');
  const csrf=fs.readFileSync(new URL('../src/security/csrf.js',import.meta.url),'utf8');
  const cfg=fs.readFileSync(new URL('../src/config.js',import.meta.url),'utf8');
  assert.match(auth,/checkLoginThrottle/);assert.match(auth,/recordLoginFailure/);
  assert.match(csrf,/Sec-Fetch-Site/);assert.match(cfg,/SecurityThrottle/);
});

test('V6 operations expose canonical version and deploy checks readiness',()=>{
  const server=fs.readFileSync(new URL('../src/server.js',import.meta.url),'utf8');
  const deploy=fs.readFileSync(new URL('../.github/workflows/deploy.yml',import.meta.url),'utf8');
  assert.match(server,/APP_VERSION/);assert.match(server,/SIGTERM/);assert.match(deploy,/readyz/);
});
