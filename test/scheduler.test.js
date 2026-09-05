import test from 'node:test';
import assert from 'node:assert/strict';
import { threeWeekWindow, startOfWeek, occurrenceDates, isSameWeek } from '../src/scheduler/dates.js';
import { assignmentUnits } from '../src/scheduler/template.js';
import { hardEligible, replacementPenaltyEligible } from '../src/scheduler/policy.js';
import { calculateFairness, rankCandidates, DEFAULT_WEIGHTS } from '../src/scheduler/fairness.js';

test('three-week window is 21 calendar days', () => {
  const s=startOfWeek('2026-09-05',0);
  assert.equal(s,'2026-08-30');
  assert.equal(isSameWeek('2026-09-01','2026-09-05',0),true);
  assert.equal(isSameWeek('2026-09-05','2026-09-06',0),false);
});

test('weekly occurrence dates respect service weekday', () => {
  const service={recurrence:{frequency:'weekly',weekday:0}};
  assert.deepEqual(occurrenceDates(service,'2026-09-06','2026-09-26'),['2026-09-06','2026-09-13','2026-09-20']);
});

test('linked visible program items collapse to one assignment unit', () => {
  const tpl={items:[
    {label:'Cantos',ministryId:'ministry_songs',assignmentKeys:['songs_a']},
    {label:'Canto de invitación',ministryId:'ministry_songs',assignmentKeys:['songs_a']},
    {label:'Vigilancia',ministryId:'ministry_vigilancia',assignmentKeys:['vig1','vig2']}
  ]};
  const units=assignmentUnits(tpl);
  assert.equal(units.length,3);
  assert.deepEqual(units.find(x=>x.key==='songs_a').labels,['Cantos','Canto de invitación']);
});

test('ministry and service availability are hard eligibility rules', () => {
  const member={id:'m1',active:true,ministries:['songs'],serviceAvailability:['sunday'],unavailability:[],allowSameDayMultipleServices:false};
  const base={serviceId:'sunday',dateISO:'2026-09-06',assignedInProgram:new Set(),sameDayAssignments:[]};
  assert.equal(hardEligible(member,{...base,ministryId:'songs'}),true);
  assert.equal(hardEligible(member,{...base,ministryId:'teacher'}),false);
  assert.equal(hardEligible(member,{...base,ministryId:'songs',serviceId:'wednesday'}),false);
});

test('proactive unavailability excludes member without any scoring fallback', () => {
  const member={id:'m1',active:true,ministries:['songs'],serviceAvailability:['sunday'],unavailability:[{from:'2026-09-05',to:'2026-09-08'}]};
  assert.equal(hardEligible(member,{ministryId:'songs',serviceId:'sunday',dateISO:'2026-09-06'}),false);
});

test('same-day multiple services require explicit member permission', () => {
  const baseMember={id:'m1',active:true,ministries:['songs'],serviceAvailability:['class','worship'],unavailability:[]};
  const ctx={ministryId:'songs',serviceId:'worship',dateISO:'2026-09-06',sameDayAssignments:[{currentMemberId:'m1',serviceId:'class',status:'scheduled'}]};
  assert.equal(hardEligible({...baseMember,allowSameDayMultipleServices:false},ctx),false);
  assert.equal(hardEligible({...baseMember,allowSameDayMultipleServices:true},ctx),true);
});

test('replacement penalty applies only if requested in service current week', () => {
  assert.equal(replacementPenaltyEligible('2026-09-01','2026-09-06',0),false);
  assert.equal(replacementPenaltyEligible('2026-09-06','2026-09-12',0),true);
  assert.equal(replacementPenaltyEligible('2026-09-05','2026-09-06',0),false);
});

test('normalized fairness lightly reduces qualifying replacement score', () => {
  const member={id:'m1',fullName:'Member',ministries:['x'],serviceAvailability:['s']};
  const base={ministryId:'x',today:'2026-09-05',completedCounts:{m1:2},futureCounts:{m1:1},lastServedByMember:{m1:{any:'2026-08-01',byMinistry:{x:'2026-07-01'}}},replacementCounts:{},weights:DEFAULT_WEIGHTS};
  const noPenalty=calculateFairness(member,base);
  const penalty=calculateFairness(member,{...base,replacementCounts:{m1:2}});
  assert.equal(Number((noPenalty.final-penalty.final).toFixed(3)),4);
  assert.ok(noPenalty.components.roleScore>=0 && noPenalty.components.roleScore<=100);
});

test('ranking is deterministic on ties', () => {
  const a={id:'2',fullName:'Carlos'};
  const b={id:'1',fullName:'Antonio'};
  const ctx={ministryId:'x',today:'2026-09-05',completedCounts:{},futureCounts:{},lastServedByMember:{},replacementCounts:{},weights:DEFAULT_WEIGHTS};
  const ranked=rankCandidates([a,b],ctx);
  assert.equal(ranked[0].member.fullName,'Antonio');
});
