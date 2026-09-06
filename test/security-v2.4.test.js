import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('V2.4 server enables CSP and CSRF middleware',()=>{
  const s=fs.readFileSync(new URL('../src/server.js',import.meta.url),'utf8');
  assert.match(s,/contentSecurityPolicy/);
  assert.match(s,/requireCsrf/);
  assert.match(s,/sameOriginWrite/);
});
test('tenant id is server-bound',()=>{
  const s=fs.readFileSync(new URL('../src/auth/middleware.js',import.meta.url),'utf8');
  assert.match(s,/const churchId = config\.churchId/);
  assert.doesNotMatch(s,/x-church-id/);
});
test('login is throttled and sessions carry CSRF token',()=>{
  const a=fs.readFileSync(new URL('../src/routes/auth.js',import.meta.url),'utf8');
  const sess=fs.readFileSync(new URL('../src/auth/sessions.js',import.meta.url),'utf8');
  assert.match(a,/loginIpLimiter,loginAccountLimiter/);
  assert.match(sess,/csrfToken:newCsrfToken\(\)/);
});
