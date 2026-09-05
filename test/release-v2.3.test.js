import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../public/assets/app.js',import.meta.url),'utf8');
const admin=fs.readFileSync(new URL('../public/assets/admin.js',import.meta.url),'utf8');
const programs=fs.readFileSync(new URL('../src/services/programs.js',import.meta.url),'utf8');
const adminRoutes=fs.readFileSync(new URL('../src/routes/admin.js',import.meta.url),'utf8');
const memberRoutes=fs.readFileSync(new URL('../src/routes/member.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/assets/styles.css',import.meta.url),'utf8');

test('V2.3 readiness requires filled assignments and song selections',()=>{
  assert.match(programs,/missingSongAssignments/);
  assert.match(programs,/ready:openAssignments\.length===0 && missingSongAssignments\.length===0/);
  assert.match(admin,/missingSongs/);
  assert.match(app,/missingSongAssignments/);
});

test('V2.3 supports audited admin manual override',()=>{
  assert.match(adminRoutes,/manualOverride=req\.body\.override===true/);
  assert.match(adminRoutes,/assignment\.admin_override/);
  assert.match(admin,/assignAnyMember/);
  assert.match(admin,/overrideConfirm/);
});

test('V2.3 public petitions are visible while private is the default',()=>{
  assert.match(memberRoutes,/memberRouter\.get\('\/petitions'/);
  assert.match(memberRoutes,/filter\(p=>p\.private!==true\)/);
  assert.match(memberRoutes,/private:req\.body\.private!==false/);
  assert.match(app,/petition\.publicRequests/);
});

test('V2.3 puts proactive unavailability on Home',()=>{
  assert.match(app,/unavailabilityCard\(\)/);
  assert.match(app,/quick-unavailability/);
  assert.match(app,/openUnavailabilityModal/);
});

test('V2.3 renders announcements inline with optional image preview/download',()=>{
  assert.match(app,/announcement-image/);
  assert.match(app,/attachment-download/);
  assert.match(adminRoutes,/application\/pdf/);
  assert.match(adminRoutes,/image\/jpeg/);
  assert.match(adminRoutes,/image\/png/);
});

test('V2.3 includes the redesigned warm light theme',()=>{
  assert.match(css,/--page:#f7f3ec/);
  assert.match(css,/--westbury-sage/);
  assert.match(css,/\.home-welcome\{/);
  assert.match(css,/\.bottom-nav\{/);
});
