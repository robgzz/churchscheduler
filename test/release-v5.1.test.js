import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { threeWeekWindow } from '../src/scheduler/dates.js';
import { usernameBase } from '../src/services/accountIdentity.js';
import { hashInitialPassword, verifyPassword } from '../src/auth/password.js';
import { parseXlsx } from '../src/services/importFormats.js';

test('rolling schedule starts with upcoming/current dates and rolls Sunday at 7 PM Central',()=>{
  const sat=threeWeekWindow('America/Chicago',0,new Date('2026-09-12T17:00:00Z'));
  assert.equal(sat.start,'2026-09-12');
  assert.equal(sat.end,'2026-10-02');
  const sunBefore=threeWeekWindow('America/Chicago',0,new Date('2026-09-13T23:59:00Z')); // 6:59 PM CDT
  assert.equal(sunBefore.start,'2026-09-13');
  const sunAfter=threeWeekWindow('America/Chicago',0,new Date('2026-09-14T00:00:00Z')); // 7:00 PM CDT
  assert.equal(sunAfter.start,'2026-09-14');
  assert.equal(sunAfter.rolledAfterSundayService,true);
});

test('deterministic username is first initial plus surname',()=>{
  assert.equal(usernameBase({fullName:'Roberto Gonzalez'}),'rgonzalez');
  assert.equal(usernameBase({fullName:'José García Jr'}),'jgarcia');
  assert.equal(usernameBase({fullName:'Beto Gonzalez',firstName:'Beto',lastName:'Gonzalez'}),'bgonzalez');
});

test('welcome can be securely hashed only through initial-password path',async()=>{
  const record=await hashInitialPassword('welcome');
  assert.equal(await verifyPassword('welcome',record),true);
});

test('shipped Westbury roster parses as exact-state workbook',()=>{
  const rows=parseXlsx(fs.readFileSync(new URL('../imports/Westbury-Members-Updated-From-Handwritten-Lists.xlsx',import.meta.url)));
  assert.equal(rows.length,42);
  assert.equal(rows[0].AssignmentEligibilityMode,'explicit');
  assert.ok(String(rows[0].AssignmentEligibility).includes('svc_sunday_class::'));
});

test('admin client contains canonical file reader helper',()=>{
  const src=fs.readFileSync(new URL('../public/assets/admin.js',import.meta.url),'utf8');
  assert.match(src,/function fileToDataUrl\(file\)/);
  assert.match(src,/readAsDataURL\(file\)/);
});
