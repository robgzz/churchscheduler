import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseXlsx, findValue, hasColumn, memberTemplateRows } from '../src/services/importFormats.js';

const finalRoster=new URL('../imports/Westbury-Members-Final-Upload.xlsx',import.meta.url);

test('V5.2 canonical header lookup is defined and tolerant of casing/spacing',()=>{
  const row={' Full Name ':'Maria Lopez','ADMIN':'Yes','Assignment Eligibility Mode':'explicit'};
  assert.equal(findValue(row,['Full Name']),'Maria Lopez');
  assert.equal(findValue(row,['Admin']),'Yes');
  assert.equal(findValue(row,['AssignmentEligibilityMode','Assignment Eligibility Mode']),'explicit');
  assert.equal(hasColumn(row,['Admin']),true);
});

test('V5.2 final Westbury upload workbook parses with exact-state and six requested admins',()=>{
  const rows=parseXlsx(fs.readFileSync(finalRoster));
  assert.equal(rows.length,42);
  assert.equal(rows[0].AssignmentEligibilityMode,'explicit');
  const admins=rows.filter(r=>String(r.Admin).toLowerCase()==='yes').map(r=>r['Full Name']).sort();
  assert.deepEqual(admins,[
    'Alex Infante','Emmanuel Garcia','Luis Betanco','Manuel Rodriguez','Roberto Gonzalez','Ruben Maldonado'
  ].sort());
  const roberto=rows.find(r=>r['Full Name']==='Roberto Gonzalez');
  assert.equal(roberto.ChurchAdministrator,'Yes');
});

test('V5.2 downloadable roster template includes administrator capability fields',()=>{
  const row=memberTemplateRows()[0];
  assert.ok(Object.hasOwn(row,'Admin'));
  assert.ok(Object.hasOwn(row,'ChurchAdministrator'));
});

test('V5.2 bulk importer imports findValue and applies admin capability safely',()=>{
  const src=fs.readFileSync(new URL('../src/services/bulkImport.js',import.meta.url),'utf8');
  assert.match(src,/norm, findValue, hasColumn/);
  assert.match(src,/adminColumnPresent/);
  assert.match(src,/member\.adminAccess=member\.churchAdministrator===true\?true:requestedAdmin/);
  assert.match(src,/OWNER_IMPORT_FORBIDDEN/);
  assert.match(src,/destroyAllUserSessions/);
});

test('V5.2 admin UI reports administrator import results',()=>{
  const src=fs.readFileSync(new URL('../public/assets/admin.js',import.meta.url),'utf8');
  assert.match(src,/Administrator column applied/);
  assert.match(src,/adminAccessGranted/);
  assert.match(src,/accountRoleSyncs/);
});
