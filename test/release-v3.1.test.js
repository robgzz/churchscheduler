import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('V3.1 keeps English and Spanish dictionaries in parity',()=>{
  const s=read('public/assets/i18n.js');
  const en=s.split('  en: {',2)[1].split('  },\n  es: {',1)[0];
  const es=s.split('  es: {',2)[1].split('\n  }\n};',1)[0];
  const keys=x=>new Set([...x.matchAll(/'([^']+)'\s*:/g)].map(m=>m[1]));
  assert.deepEqual([...keys(en)].sort(),[...keys(es)].sort());
  assert.match(es,/home\.availabilityTitle':'Ausencia programada'/);
});

test('V3.1 replacement confirmation uses app modal and neutral wording',()=>{
  const app=read('public/assets/app.js'),i18n=read('public/assets/i18n.js');
  assert.match(app,/confirmAction\(t\('schedule\.replacementConfirm'\)\)/);
  assert.doesNotMatch(app,/confirm\(t\('schedule\.replacementConfirm'/);
  assert.doesNotMatch(i18n,/fairest eligible volunteer|voluntario elegible más justo/);
});

test('V3.1 removes runtime Westbury branding fallbacks',()=>{
  const files=['public/assets/app.js','public/assets/admin.js','src/communications/notifications.js','src/communications/service.js','src/routes/public.js'];
  for(const f of files){
    const s=read(f);
    assert.doesNotMatch(s,/\/assets\/church-logo\.png/);
    assert.doesNotMatch(s,/Westbury Church/);
  }
});

test('V3.1 provides member access request and optional contact updates',()=>{
  assert.match(read('src/routes/public.js'),/member-access-request/);
  assert.match(read('src/routes/member.js'),/put\('\/contact'/);
  const app=read('public/assets/app.js');
  assert.match(app,/openAccessRequestModal/);
  assert.match(app,/maybePromptContact/);
});

test('V3.1 announcement SMS stays text-only while email can render image HTML',()=>{
  const n=read('src/communications/notifications.js');
  assert.match(n,/channel:'sms'.*message:msg/s);
  assert.match(n,/channel:'email'.*html/s);
  assert.match(n,/publicAppUrl/);
});

test('V3.1 seed refuses cross-church data population',()=>{
  const s=read('src/services/seed.js');
  assert.match(s,/Refusing cross-church seed/);
  assert.match(s,/church\.id.*churchId/);
});
