import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, splitAssignmentHeader, inferServiceSchedule, songTemplateRows, memberTemplateRows } from '../src/services/importFormats.js';
import { hardEligible } from '../src/scheduler/policy.js';

test('member import header separates service/activity and assignment',()=>{
  assert.deepEqual(splitAssignmentHeader('Sunday Evening Service - Songs 1'),{serviceName:'Sunday Evening Service',assignmentName:'Songs 1'});
  assert.equal(splitAssignmentHeader('Full Name'),null);
});

test('service schedule inference understands Sunday evening and Miercoles noche',()=>{
  assert.deepEqual(inferServiceSchedule('Sunday Evening Service'),{recurrence:{frequency:'weekly',weekday:0},startTime:'18:00',scheduleNeedsReview:false});
  assert.deepEqual(inferServiceSchedule('Miércoles Noche'),{recurrence:{frequency:'weekly',weekday:3},startTime:'18:00',scheduleNeedsReview:false});
});

test('CSV parser keeps checked assignment matrix values',()=>{
  const rows=parseCsv('Full Name,Email,Sunday Evening Service - Songs 1\r\nRoberto Gonzalez,r@example.com,X\r\n');
  assert.equal(rows[0]['Full Name'],'Roberto Gonzalez');
  assert.equal(rows[0]['Sunday Evening Service - Songs 1'],'X');
});

test('explicit imported eligibility limits member to exact assignment slot',()=>{
  const m={id:'m1',active:true,ministries:['ministry_songs'],serviceAvailability:['svc_evening'],assignmentEligibilityMode:'explicit',assignmentEligibility:['svc_evening::songs_1'],unavailability:[]};
  const common={ministryId:'ministry_songs',serviceId:'svc_evening',dateISO:'2026-09-13'};
  assert.equal(hardEligible(m,{...common,assignmentKey:'songs_1'}),true);
  assert.equal(hardEligible(m,{...common,assignmentKey:'songs_2'}),false);
});

test('templates document song and member import columns',()=>{
  assert.ok(songTemplateRows()[0]['Title English']);
  assert.equal(memberTemplateRows()[0]['Sunday Evening Service - Songs 1'],'X');
});
