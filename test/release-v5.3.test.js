import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { hardEligible } from '../src/scheduler/policy.js';

test('explicit empty assignment eligibility never falls back to global ministry flags',()=>{
  const member={id:'m1',active:true,ministries:['ministry_songs'],serviceAvailability:['svc_sunday_worship'],assignmentEligibilityMode:'explicit',assignmentEligibility:[]};
  assert.equal(hardEligible(member,{ministryId:'ministry_songs',serviceId:'svc_sunday_worship',assignmentKey:'songs_a',dateISO:'2026-09-13'}),false);
});

test('service-aware ministry UI is driven by live templates and services',()=>{
  const js=fs.readFileSync(new URL('../public/assets/admin.js',import.meta.url),'utf8');
  assert.match(js,/assignmentKeysForMinistryService/);
  assert.match(js,/state\.people\?\.templates/);
  assert.match(js,/name="ministry_service"/);
  assert.match(js,/assignmentEligibilityMode:'explicit'/);
});

test('soft light theme avoids pure white surfaces and news page has friendly sections',()=>{
  const css=fs.readFileSync(new URL('../public/assets/styles.css',import.meta.url),'utf8');
  const app=fs.readFileSync(new URL('../public/assets/app.js',import.meta.url),'utf8');
  assert.match(css,/--page:#e7ece8/);
  assert.match(css,/--surface:#f4f3ed/);
  assert.match(css,/news-hero-chips/);
  assert.match(app,/Good things are happening/);
  assert.match(app,/Announcements & activities/);
});
