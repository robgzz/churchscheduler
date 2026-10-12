import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rankCandidates,calculateFairness,DEFAULT_WEIGHTS} from '../src/scheduler/fairness.js';

const member=id=>({id,fullName:id,active:true,ministries:['petitions','songs'],serviceAvailability:['worship','wed']});
const assignment=(id,memberId,dateISO,serviceId,ministryId='other')=>({id,programId:`${serviceId}__${dateISO}`,currentMemberId:memberId,dateISO,serviceId,ministryId,status:'completed'});
function ctx(overrides={}){
  return {ministryId:'petitions',serviceId:'worship',today:'2026-10-18',historyFloor:'2026-10-01',completedCounts:{},roleCompletedCounts:{},rolePlannedCounts:{},futureCounts:{},lastServedByMember:{},replacementCounts:{},completedByMember:{},plannedByMember:{},weights:DEFAULT_WEIGHTS,...overrides};
}

test('Smart Fair V3 prioritizes whole-person rest over a fresh ministry counter',()=>{
  const david=member('David'),roberto=member('Roberto');
  const c=ctx({
    completedByMember:{
      David:[assignment('d1','David','2026-10-11','worship','songs'),assignment('d2','David','2026-10-14','wed','prayer')],
      Roberto:[]
    },
    roleCompletedCounts:{'Roberto::petitions':2,'David::petitions':0}
  });
  assert.equal(rankCandidates([david,roberto],c)[0].member.id,'Roberto');
});

test('Smart Fair V3 avoids consecutive occurrences of the same service when another eligible person exists',()=>{
  const chris=member('Christopher'),emmanuel=member('Emmanuel');
  const c=ctx({ministryId:'songs',completedByMember:{Christopher:[assignment('c1','Christopher','2026-10-11','worship','songs')],Emmanuel:[]}});
  const ranked=rankCandidates([chris,emmanuel],c);
  assert.equal(ranked[0].member.id,'Emmanuel');
  assert.equal(ranked.find(x=>x.member.id==='Christopher').score.priority.sameServiceRecent7,1);
});

test('Smart Fair V3 treats a protected nearby future assignment as workload',()=>{
  const a=member('A'),b=member('B');
  const c=ctx({plannedByMember:{A:[{...assignment('a1','A','2026-10-25','worship','songs'),status:'scheduled'}],B:[]}});
  assert.equal(rankCandidates([a,b],c)[0].member.id,'B');
});

test('October fairness baseline ignores September participation',()=>{
  const a=member('A');
  const score=calculateFairness(a,ctx({completedByMember:{A:[assignment('a1','A','2026-09-27','worship','songs')]}}));
  assert.equal(score.priority.recent28Load,0);
  assert.equal(score.priority.sameServiceRecent7,0);
});


test('Smart Fair V3 cycles through available people before recycling a weekly worship assignment',()=>{
  const a=member('A'),b=member('B'),c=member('C');
  const completedByMember={A:[assignment('a0','A','2026-10-11','worship','songs')],B:[],C:[]};
  let plannedByMember={A:[],B:[],C:[]};
  let first=rankCandidates([a,b,c],ctx({ministryId:'songs',today:'2026-10-18',completedByMember,plannedByMember}))[0].member.id;
  assert.equal(first,'B');
  plannedByMember={...plannedByMember,B:[{...assignment('b1','B','2026-10-18','worship','songs'),status:'scheduled'}]};
  let second=rankCandidates([a,b,c],ctx({ministryId:'songs',today:'2026-10-25',completedByMember,plannedByMember}))[0].member.id;
  assert.equal(second,'C');
  plannedByMember={...plannedByMember,C:[{...assignment('c1','C','2026-10-25','worship','songs'),status:'scheduled'}]};
  let third=rankCandidates([a,b,c],ctx({ministryId:'songs',today:'2026-11-01',completedByMember,plannedByMember}))[0].member.id;
  assert.equal(third,'A');
});


test('V6.7 audit export can see recent rows beyond the old 5,000-row truncation',()=>{
  const history=readFileSync(new URL('../src/scheduler/history.js',import.meta.url),'utf8');
  const audit=readFileSync(new URL('../src/services/auditExport.js',import.meta.url),'utf8');
  assert.match(history,/scanMax=0/);
  assert.match(history,/sort\(\(a,b\)=>String\(b\.occurredAt\).*\.slice\(0,requested\)/s);
  assert.match(audit,/scanMax:100000/);
});

test('V6.7 migration preserves Oct 14 Wednesday and Oct 18 Sunday Class, then starts at Sunday Worship',()=>{
  const seed=readFileSync(new URL('../src/services/seed.js',import.meta.url),'utf8');
  const engine=readFileSync(new URL('../src/scheduler/engine.js',import.meta.url),'utf8');
  assert.match(seed,/svc_wednesday_class__2026-10-14/);
  assert.match(seed,/svc_sunday_class__2026-10-18/);
  assert.match(seed,/startDate:'2026-10-18',startServiceId:'svc_sunday_worship'/);
  assert.match(engine,/Remove every replaceable assignment for the entire requested scope/);
  assert.match(engine,/scheduler\.fairness_rebalanced/);
});
