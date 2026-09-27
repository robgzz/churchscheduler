import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateService, validateTemplateItems, initialFuneralEligibility, prioritizeFuneralTeachers } from '../src/services/specialServices.js';
import { occurrenceDates, addDays } from '../src/scheduler/dates.js';
import { hardEligible } from '../src/scheduler/policy.js';
import { assignmentUnits } from '../src/scheduler/template.js';

const services=JSON.parse(fs.readFileSync(new URL('../seed/westbury/services.json',import.meta.url)));
const templates=JSON.parse(fs.readFileSync(new URL('../seed/westbury/templates.json',import.meta.url)));
const seededMembers=JSON.parse(fs.readFileSync(new URL('../seed/westbury/members.json',import.meta.url)));
const find=n=>seededMembers.find(x=>x.fullName===n);
const service=id=>services.find(x=>x.id===id);
const template=id=>templates.find(x=>x.id===id);
const sunday=template('tpl_sunday_worship');
const funeral=template('tpl_funeral');

test('three requested special activities are initially inactive, unscheduled, and separate from regular services',()=>{
 const special=services.filter(s=>s.category==='special');
 assert.deepEqual(special.map(s=>s.id),['svc_funeral','svc_fellowship','svc_campaign']);
 for(const s of special){assert.equal(s.active,false);assert.equal(s.recurrence.frequency,'once');assert.equal(s.recurrence.date,'');assert.deepEqual(occurrenceDates(s,'2026-09-27','2026-10-15'),[]);assert.ok(template(s.templateId));}
});

test('funeral contains six Sunday class-formatted lines and Sunday worship closing pool',()=>{
 assert.deepEqual(funeral.items.map(i=>i.labelEs),template('tpl_sunday_class').items.map(i=>i.labelEs));
 assert.equal(funeral.items.length,6);
 assert.equal(funeral.items.at(-1).ministryId,'ministry_closing_announcements');
 assert.deepEqual(funeral.items.filter(i=>i.ministryId==='ministry_songs').map(i=>i.assignmentKeys[0]),['songs_a','songs_b']);
});

test('Sunday worship song volunteers are enrolled for funeral songs without affecting normal Sunday eligibility',()=>{
 const initial=initialFuneralEligibility(find('Roberto Gonzalez'),templates);
 assert.ok(initial);
 assert.ok(initial.serviceAvailability.includes('svc_funeral'));
 assert.ok(initial.serviceAvailability.includes('svc_sunday_worship'));
 assert.ok(initial.assignmentEligibility.includes('svc_funeral::songs_a'));
 assert.ok(initial.assignmentEligibility.includes('svc_funeral::songs_b'));
 assert.ok(initial.assignmentEligibility.includes('svc_sunday_worship::songs_a'));
 assert.ok(initial.assignmentEligibility.includes('svc_sunday_worship::songs_b'));
 assert.ok(initial.assignmentEligibility.includes('svc_wednesday_class::opening'));
 assert.equal(initial.assignmentEligibilityMode,'explicit');
 const opts={ministryId:'ministry_songs',serviceId:'svc_sunday_worship',assignmentKey:'songs_a',dateISO:'2026-10-04'};
 assert.equal(hardEligible(initial,opts),true);
 assert.equal(hardEligible(initial,{...opts,serviceId:'svc_funeral'}),true);
});

test('existing explicit Sunday restrictions are not broadened by funeral migration',()=>{
 const m={...find('Roberto Gonzalez'),assignmentEligibilityMode:'explicit',assignmentEligibility:['svc_sunday_worship::songs_b']};
 const next=initialFuneralEligibility(m,templates);
 assert.ok(next.assignmentEligibility.includes('svc_sunday_worship::songs_b'));
 assert.equal(next.assignmentEligibility.includes('svc_sunday_worship::songs_a'),false);
 assert.ok(next.assignmentEligibility.includes('svc_funeral::songs_a'));
});

test('one-time migration never re-enables a manually configured or disabled funeral profile',()=>{
 const member=find('Roberto Gonzalez');
 assert.equal(initialFuneralEligibility({...member,serviceAvailability:[...member.serviceAvailability,'svc_funeral'],assignmentEligibility:[]},templates),null);
 assert.equal(initialFuneralEligibility({...member,assignmentEligibility:['svc_funeral::songs_a']},templates),null);
});

test('teacher order and eligibility are exactly Eduardo, Roberto, Luis',()=>{
 const rank=[find('Luis Betanco'),find('Roberto Gonzalez'),find('Eduardo Ayala'),{fullName:'Someone else'}].map(member=>({member}));
 assert.deepEqual(prioritizeFuneralTeachers(rank).map(x=>x.member.fullName),['Eduardo Ayala','Roberto Gonzalez','Luis Betanco']);
 for(const name of ['Eduardo Ayala','Roberto Gonzalez','Luis Betanco']){
  const m=initialFuneralEligibility(find(name),templates);
  assert.ok(m.ministries.includes('ministry_class_teacher'));
  assert.ok(m.assignmentEligibility.includes('svc_funeral::class_teacher'));
 }
});

test('funeral opening, reading and closing are inherited from Sunday worship',()=>{
 for(const src of sunday.items.filter(i=>['ministry_preside','ministry_scripture_prayer','ministry_closing_announcements'].includes(i.ministryId))){
  const expected=funeral.items.find(x=>x.ministryId===src.ministryId);
  assert.ok(expected);
  const sample=seededMembers.find(m=>m.ministries.includes(src.ministryId)&&m.serviceAvailability.includes('svc_sunday_worship'));
  assert.ok(sample);
  const next=initialFuneralEligibility(sample,templates);
  assert.ok(next.assignmentEligibility.includes(`svc_funeral::${expected.assignmentKeys[0]}`));
 }
});

test('inactive service membership is preserved in profiles; hard eligibility still requires correct tokens',()=>{
 const m=initialFuneralEligibility(find('Roberto Gonzalez'),templates);
 assert.equal(service('svc_funeral').active,false);
 assert.ok(m.serviceAvailability.includes('svc_funeral'));
 assert.equal(hardEligible(m,{ministryId:'ministry_songs',serviceId:'svc_funeral',assignmentKey:'songs_a',dateISO:'2026-10-05'}),true);
 assert.equal(hardEligible(m,{ministryId:'ministry_songs',serviceId:'svc_campaign',assignmentKey:'songs_a',dateISO:'2026-10-05'}),false);
});

test('one-time dates schedule just once, including when changed',()=>{
 const s={recurrence:{frequency:'once',date:'2026-10-12'}};
 assert.deepEqual(occurrenceDates(s,'2026-10-01','2026-10-31'),['2026-10-12']);
 s.recurrence.date='2026-10-22';
 assert.deepEqual(occurrenceDates(s,'2026-10-01','2026-10-31'),['2026-10-22']);
 assert.deepEqual(occurrenceDates(s,'2026-10-01','2026-10-15'),[]);
});

test('bounded recurrence supports weekly, monthly, end dates and anchored every 2 weeks',()=>{
 const weekly={recurrence:{frequency:'weekly',weekday:0,startDate:'2026-10-01',endDate:'2026-10-12'}};
 assert.deepEqual(occurrenceDates(weekly,'2026-09-27','2026-10-25'),['2026-10-04','2026-10-11']);
 const fortnight={recurrence:{frequency:'every_n_weeks',weekday:0,intervalWeeks:2,startDate:'2026-10-04'}};
 assert.deepEqual(occurrenceDates(fortnight,'2026-10-04','2026-11-01'),['2026-10-04','2026-10-18','2026-11-01']);
 assert.deepEqual(occurrenceDates(fortnight,'2026-10-11','2026-11-01'),['2026-10-18','2026-11-01']);
 const monthly={recurrence:{frequency:'monthly',weekday:0,ordinal:1}};
 assert.deepEqual(occurrenceDates(monthly,'2026-10-01','2026-11-30'),['2026-10-04','2026-11-01']);
 const bimonthly={recurrence:{frequency:'monthly',weekday:0,ordinal:1,everyMonths:2,startDate:'2026-10-01'}};
 assert.deepEqual(occurrenceDates(bimonthly,'2026-11-01','2027-02-15'),['2026-12-06','2027-02-07']);
});

test('new special activities are inactive until a valid date is set',()=>{
 const basic={labelEn:'Special Service',labelEs:'Servicio especial',recurrence:{frequency:'once',date:''},startTime:'17:00'};
 assert.equal(validateService(basic,{forceSpecial:true}).active,false);
 assert.throws(()=>validateService({...basic,active:true},{forceSpecial:true}),/Set a date/);
 const active=validateService({...basic,active:true,location:'Main hall',address:'123 Main St',recurrence:{frequency:'once',date:'2026-10-09'}},{forceSpecial:true});
 assert.equal(active.active,true);assert.equal(active.location,'Main hall');assert.equal(active.address,'123 Main St');
});

test('strict validation rejects bad time, fabricated recurrence and impossible dates',()=>{
 const base={labelEn:'Campaign',labelEs:'Campaña',startTime:'18:00'};
 assert.throws(()=>validateService({...base,startTime:'25:30',recurrence:{frequency:'once',date:'2026-10-09'}}),/Invalid start time/);
 assert.throws(()=>validateService({...base,active:true,recurrence:{frequency:'once',date:'2026-02-30'}}),/Invalid service date/);
 assert.throws(()=>validateService({...base,recurrence:{frequency:'yearly'}}),/Invalid recurrence frequency/);
 assert.throws(()=>validateService({...base,recurrence:{frequency:'weekly',weekday:8}}),/Invalid weekday/);
 assert.throws(()=>validateService({...base,recurrence:{frequency:'monthly',ordinal:7}}),/Invalid recurrence interval/);
 assert.throws(()=>validateService({...base,recurrence:{frequency:'weekly',startDate:'2026-10-20',endDate:'2026-10-01'}}),/Invalid recurrence dates/);
});

test('position validator limits size, requires real ministries and prevents cross-ministry linked assignments',()=>{
 const mids=[{id:'songs'},{id:'opening'}];
 const item=(k='s',m='songs')=>({labelEs:'Cantos',labelEn:'Songs',ministryId:m,assignmentKeys:[k]});
 assert.equal(validateTemplateItems([item()],mids)[0].labelEs,'Cantos');
 assert.throws(()=>validateTemplateItems([item('s','fake')],mids),/Invalid ministry/);
 assert.throws(()=>validateTemplateItems([item('same','songs'),item('same','opening')],mids),/Linked positions/);
 assert.throws(()=>validateTemplateItems(Array.from({length:33},(_,i)=>item(`k${i}`)),mids),/Invalid program template/);
 assert.deepEqual(assignmentUnits(funeral).map(u=>u.ministryId),['ministry_preside','ministry_songs','ministry_scripture_prayer','ministry_songs','ministry_class_teacher','ministry_closing_announcements']);
});

test('app separation and automatic scheduler guards are part of the release',()=>{
 const admin=fs.readFileSync(new URL('../public/assets/admin.js',import.meta.url),'utf8');
 const member=fs.readFileSync(new URL('../public/assets/app.js',import.meta.url),'utf8');
 const engine=fs.readFileSync(new URL('../src/scheduler/engine.js',import.meta.url),'utf8');
 assert.match(admin,/special-activities/);assert.match(admin,/schedule\/special/);
 assert.match(member,/specialPrograms/);assert.match(member,/Actividades especiales/);
 assert.match(engine,/s\.category!=='special'/);assert.match(engine,/specialServiceId/);
});
