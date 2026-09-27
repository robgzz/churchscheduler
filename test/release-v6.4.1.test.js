import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const admin=read('public/assets/admin.js');
const app=read('public/assets/app.js');

test('People and Events do not accidentally interpolate an undefined song variable',()=>{
  const people=admin.split('function personModal(member){')[1].split('async function schedule(){')[0];
  const events=admin.split('async function eventsAdminModal(')[1].split('function ')[0];
  const songEditor=admin.split('function songModal(song){')[1].split('function ')[0];
  assert.doesNotMatch(people,/song\.markdown|name="markdown"/);
  assert.doesNotMatch(events,/song\.markdown|name="markdown"/);
  assert.match(songEditor,/song\.markdown/);
});

test('welcome is still the default but password changes are voluntary for new AND legacy users',()=>{
  const provisioning=read('src/services/accountProvisioning.js');
  assert.match(provisioning,/initialPassword='welcome'/);
  assert.equal((provisioning.match(/mustChangePassword:false/g)||[]).length,2);
  assert.match(provisioning,/optionally change your password in your profile/);
  assert.match(read('src/routes/admin.js'),/mustChangePassword:false/);
  assert.match(admin,/mustChangePassword:false/);
  assert.doesNotMatch(app,/if\(state\.me\?\.user\?\.mustChangePassword===true/);
  assert.doesNotMatch(app,/state\.me\.user\?\.mustChangePassword\?/);
  assert.match(app,/\/api\/auth\/change-password/);
  assert.match(read('src/routes/auth.js'),/authRouter\.post\('\/change-password'/);
});
