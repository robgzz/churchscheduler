import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectedWeekWindow,threeWeekWindow} from '../src/scheduler/dates.js';
import {rankCandidates,selectWithCoverage,DEFAULT_WEIGHTS} from '../src/scheduler/fairness.js';
import {hardEligible} from '../src/scheduler/policy.js';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const volunteers=names=>names.map(id=>({id,fullName:id,active:true,ministries:['songs'],serviceAvailability:['worship'],unavailability:[]}));
function context(){return {ministryId:'songs',today:'2026-09-27',completedCounts:{},roleCompletedCounts:{},rolePlannedCounts:{},futureCounts:{},lastServedByMember:{},replacementCounts:{},weights:DEFAULT_WEIGHTS};}
test('three independent calendar weeks, including Sunday evening rollover',()=>{
  const w=threeWeekWindow('America/Chicago',0,new Date('2026-09-27T13:42:00Z'));
  assert.deepEqual([0,1,2].map(n=>selectedWeekWindow(w,n).start),['2026-09-27','2026-10-04','2026-10-11']);
  const after=threeWeekWindow('America/Chicago',0,new Date('2026-09-28T00:05:00Z'));
  assert.deepEqual([0,1,2].map(n=>selectedWeekWindow(after,n).start),['2026-09-28','2026-10-05','2026-10-12']);
  assert.deepEqual([0,1,2].map(n=>selectedWeekWindow(after,n).end),['2026-10-04','2026-10-11','2026-10-18']);
  assert.throws(()=>selectedWeekWindow(w,3),RangeError);
});
test('Smart Fair always picks an unused volunteer over a previously scheduled one for the same ministry',()=>{
  const members=volunteers(['Ana','Bea','Carla','Dora']);const ctx=context();
  const picks=[];
  for(let i=0;i<3;i++){
    const winner=rankCandidates(members,ctx)[0].member.id;picks.push(winner);
    ctx.futureCounts[winner]=(ctx.futureCounts[winner]||0)+1;
    ctx.rolePlannedCounts[`${winner}::songs`]=(ctx.rolePlannedCounts[`${winner}::songs`]||0)+1;
  }
  assert.equal(new Set(picks).size,3,'all three weeks should use different people while possible');
});
test('Smart Fair ranks ministry participation before a favorable point total',()=>{
  const members=volunteers(['Ana','Bea']);const ctx=context();
  ctx.roleCompletedCounts['Ana::songs']=3;
  ctx.completedCounts['Bea']=3;
  ctx.futureCounts['Bea']=2;
  assert.equal(rankCandidates(members,ctx)[0].member.id,'Bea');
});
test('hard eligibility still blocks inactive, absent, wrong ministry and conflicting service assignments',()=>{
  const m=volunteers(['Ana'])[0];const base={ministryId:'songs',serviceId:'worship',dateISO:'2026-10-04',assignedInProgram:new Set(),sameDayAssignments:[]};
  assert.equal(hardEligible(m,base),true);
  assert.equal(hardEligible({...m,active:false},base),false);
  assert.equal(hardEligible({...m,ministries:[]},base),false);
  assert.equal(hardEligible({...m,unavailability:[{from:'2026-10-04',to:'2026-10-05'}]},base),false);
  assert.equal(hardEligible(m,{...base,assignedInProgram:new Set(['Ana'])}),false);
  assert.equal(hardEligible(m,{...base,sameDayAssignments:[{serviceId:'class',currentMemberId:'Ana'}]}),false);
});
test('admin and Chat Hub each provide three independent week generation choices',()=>{
  const ui=read('public/assets/admin.js'),route=read('src/routes/admin.js'),chat=read('src/chatHub/handlers.js');
  assert.match(ui,/\[0,1,2\]\.map\(n=>.*data-generate-week/);
  assert.match(ui,/JSON\.stringify\(\{weekOffset\}\)/);
  assert.match(route,/weekOffset<0\|\|weekOffset>2/);
  assert.match(chat,/schedule:week-/);
  assert.match(chat,/generateScheduleWeek/);
  assert.doesNotMatch(chat,/generateThreeWeekSchedule/);
});
test('protected manual overrides and saved songs are not replaced by week regeneration',()=>{
  const engine=read('src/scheduler/engine.js');
  assert.match(engine,/assignment\?\.locked===true/);
  assert.match(engine,/songIds\.length>0/);
  assert.match(engine,/regenerate:false/);
  assert.match(engine,/dateISO<window\.today/);
});

test('coverage-aware selection preserves scarce volunteers even when the best points prefer them',()=>{
  const ranking=rankCandidates(volunteers(['Ana','Bea','Caro']),context());
  const chosen=selectWithCoverage(ranking,[['Ana']]);
  assert.equal(chosen.member.id,'Bea');
  const chosenNoConflict=selectWithCoverage(ranking,[['Bea','Caro']]);
  assert.equal(chosenNoConflict.member.id,'Ana');
});
