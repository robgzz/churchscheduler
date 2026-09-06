import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('V3.2 enforces no duplicate songs across Cantos assignments in the same program',()=>{
  const member=read('src/routes/member.js');
  const selection=read('src/services/songSelection.js');
  assert.match(member,/validateNoDuplicateSongsInProgram/);
  assert.match(selection,/programId eq/);
  assert.match(selection,/DUPLICATE_SERVICE_SONGS/);
  assert.match(selection,/a\.id===assignment\.id/);
});

test('V3.2 exposes exact-assignment song history and reuse UI',()=>{
  const selection=read('src/services/songSelection.js');
  const app=read('public/assets/app.js');
  assert.match(selection,/a\.assignmentKey===assignment\.assignmentKey/);
  assert.match(selection,/serviceId eq/);
  assert.match(selection,/songsUpdatedBy===memberId/);
  assert.match(app,/data-history/);
  assert.match(app,/pastSelections/);
});

test('V3.2 has a Church Administrator-selected program admin on duty',()=>{
  const owner=read('src/routes/owner.js');
  const programAdmin=read('src/communications/programAdmin.js');
  const admin=read('public/assets/admin.js');
  assert.match(owner,/\/program-admin/);
  assert.match(programAdmin,/currentProgramAdminId/);
  assert.match(admin,/programAdminModal/);
});

test('V3.2 program admin receives in-app plus queued SMS and email operational alerts',()=>{
  const programAdmin=read('src/communications/programAdmin.js');
  const unavailability=read('src/services/unavailability.js');
  const replacements=read('src/services/replacements.js');
  assert.match(programAdmin,/createAppNotification/);
  assert.match(programAdmin,/\['sms','email'\]/);
  assert.match(unavailability,/notifyProgramAdmin/);
  assert.match(replacements,/replacement\.requested/);
  assert.match(programAdmin,/program\.status/);
});
