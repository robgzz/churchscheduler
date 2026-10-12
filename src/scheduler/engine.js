import { tableNames } from '../config.js';
import { getDoc, putDoc, listDocs, nowIso } from '../storage/repository.js';
import { threeWeekWindow, selectedWeekWindow, occurrenceDates, addDays } from './dates.js';
import { assignmentUnits } from './template.js';
import { hardEligible } from './policy.js';
import { rankCandidates, selectWithCoverage, DEFAULT_WEIGHTS } from './fairness.js';
import { appendHistory } from './history.js';
import { prioritizeFuneralTeachers } from '../services/specialServices.js';

function idx(items){ return new Map(items.map(x=>[x.id,x])); }
function programId(serviceId,dateISO){ return `${serviceId}__${dateISO}`; }
function assignmentId(programIdValue,key){ return `${programIdValue}__${key}`; }
function laterDate(a,b){return !a?b:(!b?a:(a>b?a:b));}
function pushByMember(index,assignment){
  if(!assignment?.currentMemberId)return;
  const rows=index[assignment.currentMemberId] ||= [];
  if(!rows.some(x=>x.id===assignment.id))rows.push(assignment);
}
function removeByMember(index,assignment){
  if(!assignment?.currentMemberId)return;
  const rows=index[assignment.currentMemberId];
  if(!Array.isArray(rows))return;
  const at=rows.findIndex(x=>x.id===assignment.id);
  if(at>=0)rows.splice(at,1);
}

async function loadSchedulingContext(churchId, settings, window,activeServiceIds=null){
  // Westbury began relying on Smart Fair in October 2026.  A configured
  // baseline prevents pre-production September schedules from influencing the
  // live rotation, while the rolling one-year cap keeps reads bounded.
  const configuredFloor=String(settings?.algorithm?.fairnessBaselineDate||'');
  const historyFloor=laterDate(configuredFloor,addDays(window.today,-365));
  const [members,completedRows,scheduledRows,events]=await Promise.all([
    listDocs(tableNames.members,churchId,{max:5000}),
    listDocs(tableNames.assignments,churchId,{filter:`status eq 'completed' and dateISO ge '${historyFloor}'`,max:20000}),
    // Include stale scheduled rows before today as a defensive fallback in case
    // the maintenance job has not yet converted them to completed.
    listDocs(tableNames.assignments,churchId,{filter:`status eq 'scheduled' and dateISO ge '${historyFloor}'`,max:10000}),
    listDocs(tableNames.history,churchId,{filter:`eventType eq 'replacement.requested' and dateISO ge '${addDays(window.today,-84)}'`,max:5000})
  ]);
  const pastScheduled=scheduledRows.filter(a=>a.dateISO<window.today);
  const futureScheduled=scheduledRows.filter(a=>a.dateISO>=window.today && (!activeServiceIds||activeServiceIds.has(a.serviceId)));
  const completed=[...completedRows,...pastScheduled];
  const completedCounts={},roleCompletedCounts={},rolePlannedCounts={},futureCounts={},lastServedByMember={},replacementCounts={},completedByMember={},plannedByMember={};
  for (const a of completed){
    if (!a.currentMemberId) continue;
    pushByMember(completedByMember,a);
    if(a.dateISO>=addDays(window.today,-84)) completedCounts[a.currentMemberId]=(completedCounts[a.currentMemberId]||0)+1;
    const roleKey=`${a.currentMemberId}::${a.ministryId}`; roleCompletedCounts[roleKey]=(roleCompletedCounts[roleKey]||0)+1;
    const rec=lastServedByMember[a.currentMemberId] ||= {any:null,byMinistry:{}};
    if (!rec.any || a.dateISO>String(rec.any).slice(0,10)) rec.any=a.dateISO;
    if (!rec.byMinistry[a.ministryId] || a.dateISO>String(rec.byMinistry[a.ministryId]).slice(0,10)) rec.byMinistry[a.ministryId]=a.dateISO;
  }
  for (const a of futureScheduled){
    if(!a.currentMemberId)continue;
    pushByMember(plannedByMember,a);
    futureCounts[a.currentMemberId]=(futureCounts[a.currentMemberId]||0)+1;
    const roleKey=`${a.currentMemberId}::${a.ministryId}`; rolePlannedCounts[roleKey]=(rolePlannedCounts[roleKey]||0)+1;
  }
  for (const e of events){ if(e.penaltyEligible && e.memberId) replacementCounts[e.memberId]=(replacementCounts[e.memberId]||0)+1; }
  return {
    members,completed,scheduled:futureScheduled,completedCounts,roleCompletedCounts,rolePlannedCounts,futureCounts,lastServedByMember,
    replacementCounts,completedByMember,plannedByMember,historyFloor,weights:settings?.algorithm?.weights || DEFAULT_WEIGHTS
  };
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

function adjustScheduled(ctx,assignment,amount){
  if(!assignment?.currentMemberId)return;
  const id=assignment.currentMemberId,roleKey=`${id}::${assignment.ministryId}`;
  ctx.futureCounts[id]=Math.max(0,(ctx.futureCounts[id]||0)+amount);
  ctx.rolePlannedCounts[roleKey]=Math.max(0,(ctx.rolePlannedCounts[roleKey]||0)+amount);
  if(amount>0)pushByMember(ctx.plannedByMember,assignment);
  else if(amount<0)removeByMember(ctx.plannedByMember,assignment);
}
function pinnedAssignment(assignment){
  // Never silently discard an administrator's override or selected songs.
  return assignment?.locked===true || (Array.isArray(assignment?.songIds)&&assignment.songIds.length>0) || Object.values(assignment?.songParts||{}).some(x=>Array.isArray(x)&&x.length>0);
}

function regularTaskAllowed(scope,service,dateISO,pid,servicesById){
  if(!scope)return true;
  if(scope.preserveProgramIds?.has(pid))return false;
  if(!scope.startDate)return true;
  if(dateISO>scope.startDate)return true;
  if(dateISO<scope.startDate)return false;
  if(!scope.startServiceId)return true;
  if(service.id===scope.startServiceId)return true;
  const first=servicesById.get(scope.startServiceId);
  if(!first)return false;
  return String(service.startTime||'').localeCompare(String(first.startTime||''))>0;
}

async function generateScheduleWindows(churchId,{
  weekOffsets=[0],regenerate=true,source='admin',requestedBy='',specialServiceId='',specialDate='',scope=null,summaryEvent=true
}={}){
  const uniqueOffsets=[...new Set(weekOffsets)];
  if(uniqueOffsets.some(n=>!Number.isInteger(n)||n<0||n>2))throw Object.assign(new Error('weekOffset must be 0, 1, or 2'),{statusCode:400});
  const settings=await getDoc(tableNames.settings,churchId,'church') || {timezone:'America/Chicago',weekStartsOn:0,algorithm:{weights:DEFAULT_WEIGHTS}};
  const window=threeWeekWindow(settings.timezone || 'America/Chicago',Number(settings.weekStartsOn??0));
  const weeks=uniqueOffsets.map(weekOffset=>specialDate?{start:specialDate,end:specialDate,weekOffset}:selectedWeekWindow(window,weekOffset));
  const [services,templates]=await Promise.all([listDocs(tableNames.services,churchId),listDocs(tableNames.templates,churchId)]);
  const activeServiceIds=new Set(services.filter(s=>s.active!==false).map(s=>s.id));
  const servicesById=idx(services),templateMap=idx(templates),ctx=await loadSchedulingContext(churchId,settings,window,activeServiceIds);
  const allAssignments=[...ctx.scheduled];
  const tasks=[];const affected=[];let protectedCount=0,reassigned=0,created=0,unfilled=0,unchanged=0;
  for(const week of weeks){
    for(const service of services.filter(s=>s.active!==false && (specialServiceId ? s.id===specialServiceId && s.category==='special' : s.category!=='special'))){
      const template=templateMap.get(service.templateId);if(!template)continue;
      for(const dateISO of occurrenceDates(service,week.start,week.end)){
        // Never edit services that have already occurred this week.
        if(dateISO<window.today)continue;
        const pid=programId(service.id,dateISO);
        if(!specialServiceId&&!regularTaskAllowed(scope,service,dateISO,pid,servicesById))continue;
        const oldProgram=await getDoc(tableNames.programs,churchId,pid);
        if(oldProgram?.locked===true&&oldProgram.status!=='canceled'){protectedCount++;continue;}
        const program=oldProgram||{id:pid,churchId,serviceId:service.id,templateId:template.id,dateISO,startTime:service.startTime,status:'scheduled',locked:false,createdAt:nowIso()};
        if(program.status==='canceled'){program.status='scheduled';program.locked=false;}
        program.startTime=service.startTime;
        const units=assignmentUnits(template);
        const existing=await Promise.all(units.map(u=>getDoc(tableNames.assignments,churchId,assignmentId(pid,u.key))));
        const items=units.map((unit,i)=>({unit,previous:existing[i]?.status==='canceled'?null:existing[i]}));
        // Remove every replaceable assignment for the entire requested scope
        // before ranking anything. This prevents stale later-week assignments
        // from biasing the first week of a multi-week fairness rebuild.
        for(const info of items){
          const current=info.previous;
          const preserve=!!current?.currentMemberId && (pinnedAssignment(current)||!regenerate);
          info.preserve=preserve;
          if(preserve)protectedCount++;
          else if(regenerate&&current?.currentMemberId&&current.status==='scheduled'){
            const at=allAssignments.findIndex(a=>a.id===current.id);
            if(at>=0){allAssignments.splice(at,1);adjustScheduled(ctx,current,-1);}
          }
        }
        tasks.push({service,template,dateISO,pid,program,items,weekOffset:week.weekOffset});
      }
    }
  }
  // Process dates across ALL selected weeks/services chronologically. This is
  // essential to whole-person fairness: earlier services earn priority before
  // later services, and each selection becomes workload for the next decision.
  tasks.sort((a,b)=>a.dateISO.localeCompare(b.dateISO)||String(a.service.startTime||'').localeCompare(String(b.service.startTime||''))||a.pid.localeCompare(b.pid));
  for(const task of tasks){
    const {service,dateISO,pid,program,items,weekOffset}=task;
    const assignedInProgram=new Set(items.filter(i=>i.preserve&&i.previous.currentMemberId).map(i=>i.previous.currentMemberId));
    const open=items.filter(i=>!i.preserve);
    open.sort((a,b)=>{
      const available=i=>ctx.members.filter(m=>hardEligible(m,{ministryId:i.unit.ministryId,serviceId:service.id,assignmentKey:i.unit.key,dateISO,assignedInProgram,sameDayAssignments:sameDayAssignments(allAssignments,dateISO)})).length;
      return available(a)-available(b)||a.unit.key.localeCompare(b.unit.key);
    });
    for(let openIndex=0;openIndex<open.length;openIndex++){
      const {unit,previous}=open[openIndex];
      const aid=assignmentId(pid,unit.key);
      const candidates=ctx.members.filter(m=>hardEligible(m,{ministryId:unit.ministryId,serviceId:service.id,assignmentKey:unit.key,dateISO,assignedInProgram,sameDayAssignments:sameDayAssignments(allAssignments,dateISO)}));
      let ranking=rankCandidates(candidates,{...ctx,ministryId:unit.ministryId,serviceId:service.id,today:dateISO});
      if(service.id==='svc_funeral' && unit.ministryId==='ministry_class_teacher')ranking=prioritizeFuneralTeachers(ranking);
      // Look ahead at the remaining positions so a fair choice cannot steal
      // the only available person from another slot and leave it uncovered.
      const remainingCandidateIds=open.slice(openIndex+1).map(({unit:nextUnit})=>ctx.members.filter(m=>hardEligible(m,{
        ministryId:nextUnit.ministryId,serviceId:service.id,assignmentKey:nextUnit.key,dateISO,assignedInProgram,
        sameDayAssignments:sameDayAssignments(allAssignments,dateISO)
      })).map(m=>m.id));
      const selected=selectWithCoverage(ranking,remainingCandidateIds)?.member||null,previousId=previous?.currentMemberId||null;
      const stamp=nowIso();
      const assignment={...previous,id:aid,churchId,programId:pid,serviceId:service.id,dateISO,assignmentKey:unit.key,ministryId:unit.ministryId,
        originalMemberId:selected?.id||null,currentMemberId:selected?.id||null,status:selected?'scheduled':'unfilled',locked:false,
        replacements:previous?.replacements||[],songIds:[],songParts:{},songsUpdatedAt:null,songsUpdatedBy:null,
        assignedAt:selected?.id===previousId?(previous?.assignedAt||stamp):stamp,
        appNotificationAt:selected?.id===previousId?(previous?.appNotificationAt||stamp):stamp,
        createdAt:previous?.createdAt||stamp,updatedAt:stamp};
      // Previously unfilled and unchanged assignments are not churned unnecessarily.
      if(previous?.currentMemberId===assignment.currentMemberId && previous?.status===assignment.status && previous?.ministryId===unit.ministryId){unchanged++;}
      else {
        await putDoc(tableNames.assignments,churchId,aid,assignment,{serviceId:service.id,dateISO,status:assignment.status,currentMemberId:assignment.currentMemberId||'',ministryId:unit.ministryId,programId:pid});
        if(selected){if(previousId)reassigned++;else created++;}else unfilled++;
        await appendHistory(churchId,{eventType:selected?(previousId?'assignment.regenerated':'assignment.created'):'assignment.unfilled',programId:pid,assignmentId:aid,assignmentKey:unit.key,ministryId:unit.ministryId,memberId:selected?.id||'',previousMemberId:previousId||'',dateISO,source,details:{weekOffset,regenerate,smartFairVersion:'V3'}});
        await saveAudit(churchId,pid,unit,ranking,selected);
      }
      if(selected){assignedInProgram.add(selected.id);allAssignments.push(assignment);adjustScheduled(ctx,assignment,1);}
    }
    program.updatedAt=nowIso();
    await putDoc(tableNames.programs,churchId,pid,program,{serviceId:service.id,dateISO,status:program.status});
    affected.push(pid);
  }
  const result={ok:true,weeks,programCount:affected.length,created,reassigned,unfilled,unchanged,protectedCount,generatedAt:nowIso(),source,affectedProgramIds:affected};
  if(summaryEvent&&regenerate){
    const firstWeek=weeks[0]||{start:window.today};
    await appendHistory(churchId,{eventType:specialServiceId?'scheduler.special_generated':'scheduler.week_generated',memberId:requestedBy,dateISO:firstWeek.start,source,details:{...result,specialServiceId}});
  }
  return result;
}

/** Manual generation replaces only unlocked, song-free auto assignments in the
 * selected calendar week. Scheduled maintenance only fills missing seats. */
export async function generateScheduleWeek(churchId,{weekOffset=0,regenerate=true,source='admin',requestedBy='',specialServiceId='',specialDate=''}={}){
  const result=await generateScheduleWindows(churchId,{weekOffsets:[weekOffset],regenerate,source,requestedBy,specialServiceId,specialDate});
  return {...result,week:result.weeks[0],weekOffset};
}

/** One-time or administrator-triggered rebuild across the visible three-week
 * horizon. It can begin part-way through a day (for Westbury: Sunday Worship),
 * while explicitly preserving earlier programs. */
export async function rebalanceRegularScheduleFrom(churchId,{
  startDate,startServiceId='',preserveProgramIds=[],source='smart-fair-v3-migration',requestedBy=''
}={}){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(startDate||'')))throw Object.assign(new Error('A valid startDate is required'),{statusCode:400});
  const scope={startDate,startServiceId,preserveProgramIds:new Set(preserveProgramIds)};
  const result=await generateScheduleWindows(churchId,{weekOffsets:[0,1,2],regenerate:true,source,requestedBy,scope,summaryEvent:false});
  await appendHistory(churchId,{eventType:'scheduler.fairness_rebalanced',memberId:requestedBy,dateISO:startDate,source,details:{
    smartFairVersion:'V3',startDate,startServiceId,preserveProgramIds:[...scope.preserveProgramIds],programCount:result.programCount,
    created:result.created,reassigned:result.reassigned,unfilled:result.unfilled,protectedCount:result.protectedCount
  }});
  return result;
}

// Existing scheduled job and Chat Hub compatibility: only fill vacancies;
// they must never unexpectedly overwrite an admin-approved assignment.
export async function generateThreeWeekSchedule(churchId,{source='scheduled-job'}={}){
  const weeks=[];
  for(let weekOffset=0;weekOffset<3;weekOffset++)weeks.push(await generateScheduleWeek(churchId,{weekOffset,regenerate:false,source}));
  return {ok:true,programCount:weeks.reduce((n,w)=>n+w.programCount,0),weeks,source,generatedAt:nowIso()};
}

export async function completePastAssignments(churchId){
  const settings=await getDoc(tableNames.settings,churchId,'church') || {timezone:'America/Chicago'};
  const window=threeWeekWindow(settings.timezone || 'America/Chicago',Number(settings.weekStartsOn??0));
  const scheduled=await listDocs(tableNames.assignments,churchId,{filter:`status eq 'scheduled' and dateISO lt '${window.today}'`,max:10000});
  const services=await listDocs(tableNames.services,churchId);
  const activeServiceIds=new Set(services.filter(s=>s.active!==false).map(s=>s.id));
  let count=0;
  for (const a of scheduled){
    if(!activeServiceIds.has(a.serviceId))continue;
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
    ministryId:assignment.ministryId,serviceId:assignment.serviceId,assignmentKey:assignment.assignmentKey,dateISO:assignment.dateISO,assignedInProgram,
    sameDayAssignments:sameDayAssignments(ctx.scheduled,assignment.dateISO),excludeMemberIds
  }));
  const ranking=rankCandidates(candidates,{...ctx,ministryId:assignment.ministryId,serviceId:assignment.serviceId,today:assignment.dateISO||window.today});
  return { selected:ranking[0]?.member || null, ranking };
}
