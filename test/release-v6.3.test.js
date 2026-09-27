import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../public/assets/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/assets/styles.css',import.meta.url),'utf8');
const auth=fs.readFileSync(new URL('../src/routes/auth.js',import.meta.url),'utf8');
const deletion=fs.readFileSync(new URL('../src/services/memberDeletion.js',import.meta.url),'utf8');
const version=fs.readFileSync(new URL('../src/version.js',import.meta.url),'utf8');

test('V6.3 version is declared',()=>{ assert.match(version,/APP_VERSION='6\.[34]\.0'/); });

test('member programs render collapsed by default with details/summary',()=>{
  assert.match(app,/details class=\"card service-card modern-program program-collapsible/);
  assert.match(app,/summary class=\"program-date-band\"/);
  assert.doesNotMatch(app,/details class=\"card service-card modern-program program-collapsible[^>]* open/);
  assert.match(css,/program-collapsible\[open\] \.program-chevron/);
});

test('self-service account deletion exists and requires current password',()=>{
  assert.match(auth,/authRouter\.delete\('\/account'/);
  assert.match(auth,/verifyPassword\(current,user\.password\)/);
  assert.match(auth,/allowSelf:true/);
  assert.match(deletion,/allowSelf=false/);
  assert.match(app,/delete-account-form/);
  assert.match(app,/\/api\/auth\/account/);
});

test('profile exposes public support and privacy links',()=>{
  assert.match(app,/https:\/\/exonuvia\.com\/support\/westbury-church-hub\//);
  assert.match(app,/https:\/\/exonuvia\.com\/privacy\/westbury-church-hub\//);
});
