import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('V4.5 Chat Hub People action crosses into the admin shell',()=>{
  const app=read('public/assets/app.js'),handlers=read('src/chatHub/handlers.js'),admin=read('public/assets/admin.js');
  assert.match(app,/target==='people'&&isAdmin\(\)/);
  assert.match(handlers,/url:'\/admin\/\?tab=people'/);
  assert.match(admin,/new URLSearchParams\(window\.location\.search\)/);
});

test('V4.5 admin page has a resilient non-module bootstrap loader',()=>{
  const html=read('public/admin/index.html'),loader=read('public/assets/admin-loader.js');
  assert.match(html,/admin-loader\.js\?v=(?:4(?:5|6)0|500)/);
  assert.match(html,/Cargando administración/);
  assert.match(loader,/import\('\/assets\/admin\.js\?v=(?:4(?:5|6)0|500)'\)\.catch/);
  assert.match(loader,/unhandledrejection/);
});

test('V4.5 password minimum is 10 and generated password is simplified',()=>{
  for(const f of ['src/routes/auth.js','src/routes/admin.js','src/routes/setup.js'])assert.doesNotMatch(read(f),/length<12/);
  assert.match(read('src/chatHub/handlers.js'),/const words=\['Luna','Casa','Vida','Roca','Amor'\]/);
  assert.match(read('public/assets/app.js'),/minlength="10"/);
});

test('V4.5 Wednesday class program query returns three upcoming dates',()=>{
  const h=read('src/chatHub/handlers.js');
  assert.match(h,/wantsWednesdayClass/);
  assert.match(h,/rows\.length===3/);
  assert.match(h,/próximos \$\{rows\.length\} miércoles/);
});
