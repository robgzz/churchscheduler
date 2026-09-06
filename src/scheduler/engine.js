import { tableNames } from '../config.js';
import { getDoc, putDoc, listDocs, nowIso } from '../storage/repository.js';
import { threeWeekWindow, occurrenceDates, addDays } from './dates.js';
import { assignmentUnits } from './template.js';
import { hardEligible } from './policy.js';
import { rankCandidates, DEFAULT_WEIGHTS } from './fairness.js';
import { appendHistory } from './history.js';

function idx(items){ return new Map(items.map(x=>[x.id,x])); }
function programId(serviceId,dateISO){ return `${serviceId}__${dateISO}`; }
function assignmentId(programIdValue,key){ return `${programIdValue}__${key}`; }

async function loadSchedulingContext(churchId, settings, window){
  const [members,completed,scheduled,events]=await Promise.all([
    listDocs(tableNames.members,churchId),
    listDocs(tableNames.assignments,churchId,{filter:`status eq 'completed' and dateISO ge '${addDays(window.today,-84)}'`,max:5000}),
    listDocs(tableNames.assignments,churchId,{filter:`status eq 'scheduled' and dateISO ge '${window.today}'`,max:5000}),
    listDocs(tableNames.history,churchId,{filter:`eventType eq 'replacement.requested' and dateISO ge '${addDays(window.today,-84)}'`,max:5000})
  ]);
  const completedCounts={},futureCounts={},lastServedByMember={},replacementCounts={};
  for (const a of completed){
    if (!a.currentMemberId) continue;
    completedCounts[a.currentMemberId]=(completedCounts[a.currentMemberId]||0)+1;
    const rec=lastServedByMember[a.currentMemberId] ||= {any:null,byMinistry:{}};
    if (!rec.any || a.dateISO>String(rec.any).slice(0,10)) rec.any=a.dateISO;
    if (!rec.byMinistry[a.ministryId] || a.dateISO>String(rec.byMinistry[a.ministryId]).slice(0,10)) rec.byMinistry[a.ministryId]=a.dateISO;
  }
  for (const a of scheduled){ if(a.currentMemberId) futureCounts[a.currentMemberId]=(futureCounts[a.currentMemberId]||0)+1; }
  for (const e of events){ if(e.penaltyEligible && e.memberId) replacementCounts[e.memberId]=(replacementCounts[e.memberId]||0)+1; }
  return { members,completed,scheduled,completedCounts,futureCounts,lastServedByMember,replacementCounts,weights:settings?.algorithm?.weights || DEFAULT_WEIGHTS };
}

function sameDayAssignments(allAssignments,dateISO){ return allAssignments.filter(a=>a.dateISO===dateISO && a.status==='scheduled'); }

async function saveAudit(churchId,programIdValue,unit,ranking,selected){
  await appendHistory(churchId,{
    eventType:'scheduler.decision',
    programId:programIdValue,
    assignmentKey:unit.key,
    ministryId:unit.ministryId,
    memberId:selected?.id || '',
    dateISO:programIdValue.slice(programIdValue.lastIndexOf('__')+2),
    details:{ selectedMemberId:selected?.id || null, candidates:ranking.map(r=>({memberId:r.member.id,fullName:r.member.fullName,score:r.score})) }
  });
}

export async function generateThreeWeekSchedule(churchId,{source='manual'}={}){
  const settings=await getDoc(tableNames.settings,churchId,'church') || { timezone:'America/Chicago',weekStartsOn:0,algorithm:{weights:DEFAULT_WEIGHTS} };
  const window=threeWeekWindow(settings.timezone || 'America/Chicago',Number(settings.weekStartsOn ?? 0));
  const [services,templates]=await Promise.all([listDocs(tableNames.services,churchId),listDocs(tableNames.templates,churchId)]);
  const templateMap=idx(templates);
  const ctx=await loadSchedulingContext(churchId,settings,window);
  const memberMap=idx(ctx.members);
  const allAssignments=[...ctx.scheduled];
  const results=[];

  for (const service of services.filter(s=>s.active!==false)){
    const template=templateMap.get(service.templateId);
    if (!template) continue;
    for (const dateISO of occurrenceDates(service,window.today,window.end)){
      const pid=programId(service.id,dateISO);
      let program=await getDoc(tableNames.programs,churchId,pid);
      if (program?.locked===true){ results.push(program); continue; }
      program ||= { id:pid, churchId, serviceId:service.id, templateId:template.id, dateISO, startTime:service.startTime, status:'scheduled', locked:false, createdAt:nowIso() };
      program.updatedAt=nowIso();
      await putDoc(tableNames.programs,churchId,pid,program,{serviceId:service.id,dateISO,status:program.status});

      const units=assignmentUnits(template);
      const existing=[];
      for (const unit of units){
        const aid=assignmentId(pid,unit.key);
        const a=await getDoc(tableNames.assignments,churchId,aid);
        if (a) existing.push(a);
      }
      const existingByKey=new Map(existing.map(a=>[a.assignmentKey,a]));
      const assignedInProgram=new Set(existing.filter(a=>a.currentMemberId).map(a=>a.currentMemberId));

      const unitInfos=units.map(unit=>{
        const existingAssignment=existingByKey.get(unit.key);
        if (existingAssignment?.locked || existingAssignment?.currentMemberId) return {unit,existingAssignment,candidates:[]};
        const candidates=ctx.members.filter(m=>hardEligible(m,{
          ministryId:unit.ministryId,serviceId:service.id,dateISO,assignedInProgram,
          sameDayAssignments:sameDayAssignments(allAssignments,dateISO)
        }));
        return {unit,existingAssignment,candidates};
      }).sort((a,b)=>a.candidates.length-b.candidates.length || a.unit.key.localeCompare(b.unit.key));

      for (const info of unitInfos){
        const {unit}=info; const aid=assignmentId(pid,unit.key);
        const current=existingByKey.get(unit.key);
        if (current?.locked || current?.currentMemberId) continue;
        const candidates=ctx.members.filter(m=>hardEligible(m,{
          ministryId:unit.ministryId,serviceId:service.id,dateISO,assignedInProgram,
          sameDayAssignments:sameDayAssignments(allAssignments,dateISO)
        }));
        const ranking=rankCandidates(candidates,{...ctx,ministryId:unit.ministryId,today:window.today});
        const selected=ranking[0]?.member || null;
        const assignment={
          id:aid,churchId,programId:pid,serviceId:service.id,dateISO,assignmentKey:unit.key,ministryId:unit.ministryId,
          originalMemberId:current?.originalMemberId || selected?.id || null,
          currentMemberId:selected?.id || null,status:selected?'scheduled':'unfilled',locked:false,
          replacements:current?.replacements || [],songIds:current?.songIds || [],songsUpdatedAt:current?.songsUpdatedAt || null,songsUpdatedBy:current?.songsUpdatedBy || null,assignedAt:current?.assignedAt || nowIso(),appNotificationAt:current?.appNotificationAt || current?.assignedAt || nowIso(),createdAt:current?.createdAt || nowIso(),updatedAt:nowIso()
        };
        await putDoc(tableNames.assignments,churchId,aid,assignment,{serviceId:service.id,dateISO,status:assignment.status,currentMemberId:assignment.currentMemberId || '',ministryId:unit.ministryId,programId:pid});
        existingByKey.set(unit.key,assignment);
        if (selected){
          assignedInProgram.add(selected.id); allAssignments.push(assignment); ctx.futureCounts[selected.id]=(ctx.futureCounts[selected.id]||0)+1;
          await appendHistory(churchId,{eventType:'assignment.created',programId:pid,assignmentId:aid,assignmentKey:unit.key,ministryId:unit.ministryId,memberId:selected.id,dateISO,source});
        } else {
          await appendHistory(churchId,{eventType:'assignment.unfilled',programId:pid,assignmentId:aid,assignmentKey:unit.key,ministryId:unit.ministryId,memberId:'',dateISO,source});
        }
        await saveAudit(churchId,pid,unit,ranking,selected);
      }
      results.push(program);
    }
  }
  return { ok:true,window,programCount:results.length,generatedAt:nowIso(),source };
}

export async function completePastAssignments(churchId){
  const settings=await getDoc(tableNames.settings,churchId,'church') || {timezone:'America/Chicago'};
  const window=threeWeekWindow(settings.timezone || 'America/Chicago',Number(settings.weekStartsOn??0));
  const scheduled=await listDocs(tableNames.assignments,churchId,{filter:`status eq 'scheduled' and dateISO lt '${window.today}'`,max:5000});
  let count=0;
  for (const a of scheduled){
    a.status='completed'; a.completedAt=nowIso(); a.updatedAt=nowIso();
    await putDoc(tableNames.assignments,churchId,a.id,a,{serviceId:a.serviceId,dateISO:a.dateISO,status:a.status,currentMemberId:a.currentMemberId || '',ministryId:a.ministryId,programId:a.programId});
    await appendHistory(churchId,{eventType:'assignment.completed',programId:a.programId,assignmentId:a.id,assignmentKey:a.assignmentKey,ministryId:a.ministryId,memberId:a.currentMemberId || '',dateISO:a.dateISO});
    count++;
  }
  return count;
}

export async function pickReplacement(churchId,assignment,excludeMemberIds=new Set()){
  const settings=await getDoc(tableNames.settings,churchId,'church') || {timezone:'America/Chicago',weekStartsOn:0};
  const window=threeWeekWindow(settings.timezone || 'America/Chicago',Number(settings.weekStartsOn??0));
  const ctx=await loadSchedulingContext(churchId,settings,window);
  const programAssignments=await listDocs(tableNames.assignments,churchId,{filter:`programId eq '${assignment.programId}'`,max:100});
  const assignedInProgram=new Set(programAssignments.filter(a=>a.currentMemberId && a.id!==assignment.id).map(a=>a.currentMemberId));
  const candidates=ctx.members.filter(m=>hardEligible(m,{
    ministryId:assignment.ministryId,serviceId:assignment.serviceId,dateISO:assignment.dateISO,assignedInProgram,
    sameDayAssignments:sameDayAssignments(ctx.scheduled,assignment.dateISO),excludeMemberIds
  }));
  const ranking=rankCandidates(candidates,{...ctx,ministryId:assignment.ministryId,today:window.today});
  return { selected:ranking[0]?.member || null, ranking };
}
