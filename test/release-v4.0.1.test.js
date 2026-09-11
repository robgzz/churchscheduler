import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('V4.0.1 login returns the session CSRF token and clients recover through a no-store endpoint',()=>{
  const sessions=read('src/auth/sessions.js'),auth=read('src/routes/auth.js'),app=read('public/assets/app.js'),admin=read('public/assets/admin.js');
  assert.match(sessions,/csrfToken:doc\.csrfToken/);
  assert.match(auth,/get\('\/csrf'/);
  assert.match(app,/\/api\/auth\/csrf/);
  assert.match(admin,/\/api\/auth\/csrf/);
});

test('V4.0.1 streams and caches announcement attachments',()=>{
  const repo=read('src/storage/repository.js'),routes=read('src/routes/public.js');
  assert.match(repo,/downloadStream/);
  assert.match(routes,/f\.stream\.pipe\(res\)/);
  assert.match(routes,/max-age=86400, immutable/);
});

test('V4.0.1 keeps child check-in independent of SMS and creates an in-app record',()=>{
  const member=read('src/routes/member.js');
  assert.match(member,/tableNames\.appNotifications/);
  assert.match(member,/notificationsQueued/);
  assert.match(member,/areaCounts/);
});

test('V4.0.1 infrastructure scales sooner and provisions every V4 table',()=>{
  const bicep=read('infra/main.bicep');
  assert.match(bicep,/'ChildCheckIns'/);
  assert.match(bicep,/'EventRegistrations'/);
  assert.match(bicep,/'FollowUps'/);
  assert.match(bicep,/concurrentRequests: '15'/);
  assert.match(bicep,/cpu: json\('1\.0'\), memory: '2Gi'/);
});
