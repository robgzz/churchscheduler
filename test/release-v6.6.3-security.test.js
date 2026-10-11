import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const pkg=JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));
const deploy=fs.readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url),'utf8');
const security=fs.readFileSync(new URL('../.github/workflows/security.yml', import.meta.url),'utf8');

test('V6.6.3 pins remediated dependency floors reported by GitHub audit',()=>{
  assert.equal(pkg.dependencies.compression,'1.8.2');
  assert.equal(pkg.dependencies['firebase-admin'],'14.5.0');
  assert.equal(pkg.dependencies['@azure/identity'],'4.13.3');
  assert.equal(pkg.overrides['@grpc/grpc-js'],'1.14.6');
  assert.equal(pkg.overrides['proxy-addr'],'2.0.8');
  assert.equal(pkg.overrides['archiver-utils']['brace-expansion'],'1.1.21');
  assert.equal(pkg.overrides['readdir-glob']['brace-expansion'],'2.1.7');
  assert.equal(pkg.overrides['@azure/communication-sms'].uuid,'11.1.1');
});

test('V6.6.3 CI uses the same Node major as the production container',()=>{
  assert.match(pkg.engines.node,/>=22 <23/);
  assert.match(deploy,/node-version: '22'/);
  assert.match(security,/node-version: '22'/);
});
