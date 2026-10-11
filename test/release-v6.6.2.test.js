import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=p=>readFile(new URL(`../${p}`,import.meta.url),'utf8');

test('V6.6.2 defaults worship users to Program after authentication',async()=>{
  const app=await read('public/assets/app.js');
  assert.match(app,/if\(state\.me&&isWorship\(\)\)state\.tab='schedule'/);
  assert.match(app,/state\.tab=isWorship\(\)\?'schedule':'home'/);
});

test('V6.6.2 keeps My Assignments simple and exposes obvious song actions',async()=>{
  const [app,css]=await Promise.all([read('public/assets/app.js'),read('public/assets/styles.css')]);
  assert.match(app,/simple-assignment-stack/);
  assert.match(app,/compactSongSectionButtons/);
  assert.match(app,/Necesitas escoger cantos/);
  assert.match(app,/Escoger cantos/);
  assert.match(css,/\.simple-song-step/);
});

test('V6.6.2 lets administrators select songs per assignment section',async()=>{
  const [route,admin]=await Promise.all([read('src/routes/admin.js'),read('public/assets/admin.js')]);
  assert.match(route,/\/schedule\/assignments\/:assignmentId\/song-options/);
  assert.match(route,/\/schedule\/assignments\/:assignmentId\/songs/);
  assert.match(route,/songs\.admin_updated/);
  assert.match(route,/validateNoDuplicateSongsInProgram/);
  assert.match(admin,/openAdminSongSelector/);
  assert.match(admin,/data-song-section/);
});
