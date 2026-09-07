import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('V3.4 clients recover once from stale CSRF tokens',()=>{
  const app=read('public/assets/app.js'),admin=read('public/assets/admin.js');
  for(const src of [app,admin]){
    assert.match(src,/CSRF_FAILED/);
    assert.match(src,/\/api\/auth\/me/);
    assert.match(src,/api\(url,opt,false\)/);
  }
});

test('V3.4 member requests can be accepted or rejected and create member profiles',()=>{
  const routes=read('src/routes/admin.js'),ui=read('public/assets/admin.js');
  assert.match(routes,/member-access\/:id\/approve/);
  assert.match(routes,/member-access\/:id\/reject/);
  assert.match(routes,/groups:\['members'\]/);
  assert.match(ui,/data-access-approve/);
  assert.match(ui,/data-access-reject/);
});

test('V3.4 exports members as CSV Excel and PDF',()=>{
  const routes=read('src/routes/admin.js'),ui=read('public/assets/admin.js');
  assert.match(routes,/\/people\/export/);
  assert.match(routes,/format==='csv'/);
  assert.match(routes,/format==='pdf'/);
  assert.match(ui,/people\/export\?format=excel/);
});

test('V3.4 audit export is operationally detailed',()=>{
  const audit=read('src/services/auditExport.js');
  for(const field of ['ServiceTime','AssignmentKey','ParticipationStatus','SchedulerScore','OriginalMember','CurrentMember','ReplacementRequested','Songs']) assert.match(audit,new RegExp(field));
});

test('V3.4 infrastructure keeps a warm replica and adds probes and burst scaling',()=>{
  const infra=read('infra/main.bicep'),deploy=read('.github/workflows/deploy.yml');
  assert.match(infra,/param minReplicas int = 1/);
  assert.match(infra,/param maxReplicas int = 6/);
  assert.match(infra,/type: 'Startup'/);
  assert.match(infra,/type: 'Liveness'/);
  assert.match(infra,/type: 'Readiness'/);
  assert.match(infra,/concurrentRequests: '25'/);
  assert.match(deploy,/--min-replicas 1/);
  assert.match(deploy,/--scale-rule-http-concurrency 25/);
});
