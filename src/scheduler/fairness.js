import { addDays, daysBetween } from './dates.js';

const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
export const DEFAULT_WEIGHTS={ roleFairness:0.35, workloadBalance:0.35, overallRest:0.20, futureSpacing:0.10 };

function asRows(index,id){
  const rows=index?.[id];
  return Array.isArray(rows)?rows:[];
}
function validDate(row){return /^\d{4}-\d{2}-\d{2}$/.test(String(row?.dateISO||''));}
function uniquePrograms(rows){
  const seen=new Set();
  let count=0;
  for(const row of rows){
    if(!validDate(row))continue;
    const key=row.programId||`${row.serviceId||''}::${row.dateISO}::${row.assignmentKey||row.id||''}`;
    if(seen.has(key))continue;
    seen.add(key);count++;
  }
  return count;
}
function newestDate(rows){
  let value=null;
  for(const row of rows){if(validDate(row)&&(!value||row.dateISO>value))value=row.dateISO;}
  return value;
}
function inRange(row,from,to,{includeFrom=true,includeTo=true}={}){
  if(!validDate(row))return false;
  if(from && (includeFrom?row.dateISO<from:row.dateISO<=from))return false;
  if(to && (includeTo?row.dateISO>to:row.dateISO>=to))return false;
  return true;
}

/**
 * SMART FAIR V3 treats a volunteer as one person before treating them as a set
 * of ministry-specific counters.  The scheduler still respects ministry
 * eligibility, but recent whole-person workload and spacing outrank a small
 * role-specific points advantage.
 */
export function calculateFairness(candidate, ctx){
  const {
    ministryId,serviceId='',today,completedCounts={},roleCompletedCounts={},rolePlannedCounts={},futureCounts={},
    lastServedByMember={},replacementCounts={},completedByMember={},plannedByMember={},historyFloor='',weights=DEFAULT_WEIGHTS
  }=ctx;
  const baseline=historyFloor&&historyFloor<=today?historyFloor:addDays(today,-365);
  const completed=asRows(completedByMember,candidate.id).filter(r=>validDate(r)&&r.dateISO>=baseline&&r.dateISO<today);
  const planned=asRows(plannedByMember,candidate.id).filter(r=>validDate(r)&&r.dateISO>=baseline);
  const plannedBefore=planned.filter(r=>r.dateISO<today);
  const prior=[...completed,...plannedBefore];
  const sameDay=planned.filter(r=>r.dateISO===today);
  const future=planned.filter(r=>r.dateISO>today);

  const recent7From=addDays(today,-7),recent28From=addDays(today,-28),future7To=addDays(today,7),future28To=addDays(today,28);
  const recent7=prior.filter(r=>inRange(r,recent7From,today,{includeFrom:true,includeTo:false}));
  const recent28=prior.filter(r=>inRange(r,recent28From,today,{includeFrom:true,includeTo:false}));
  const future7=future.filter(r=>inRange(r,today,future7To,{includeFrom:false,includeTo:true}));
  const future28=future.filter(r=>inRange(r,today,future28To,{includeFrom:false,includeTo:true}));
  const sameService7=serviceId?recent7.filter(r=>r.serviceId===serviceId):[];
  const roleRecent28=recent28.filter(r=>r.ministryId===ministryId);
  const roleFuture28=future28.filter(r=>r.ministryId===ministryId);

  const memberLast=lastServedByMember[candidate.id] || {};
  const indexedLastRole=newestDate(prior.filter(r=>r.ministryId===ministryId));
  const indexedLastAny=newestDate(prior);
  const legacyRole=memberLast.byMinistry?.[ministryId] || candidate.legacyLastServedByMinistry?.[ministryId] || null;
  const legacyAny=memberLast.any || candidate.legacyLastServedAny || null;
  const lastRole=indexedLastRole || (legacyRole&&String(legacyRole).slice(0,10)>=baseline?legacyRole:null);
  const lastAny=indexedLastAny || (legacyAny&&String(legacyAny).slice(0,10)>=baseline?legacyAny:null);
  const roleDays=lastRole ? daysBetween(String(lastRole).slice(0,10),today) : 9999;
  const restDays=lastAny ? daysBetween(String(lastAny).slice(0,10),today) : 9999;

  const sameDayLoad=uniquePrograms(sameDay);
  const sameServiceRecent7=uniquePrograms(sameService7);
  const recent7Load=uniquePrograms(recent7);
  const future7Load=uniquePrograms(future7);
  const nearTermLoad=recent7Load+future7Load+sameDayLoad;
  const recent28Load=uniquePrograms(recent28);
  const future28Load=uniquePrograms(future28);
  const roleRecent28Load=uniquePrograms(roleRecent28);
  const roleFuture28Load=uniquePrograms(roleFuture28);

  const roleScore=lastRole ? clamp(roleDays/84*100,0,100) : 100;
  const loadScore=clamp(100-recent28Load*14-future28Load*8-sameDayLoad*30,0,100);
  const restScore=lastAny ? clamp(restDays/42*100,0,100) : 100;
  const futureScore=clamp(100-future7Load*35-Math.max(0,future28Load-future7Load)*12,0,100);
  const qualifyingReplacements=Number(replacementCounts[candidate.id] || 0);
  const reliabilityAdjustment=Math.min(8,qualifyingReplacements*2);
  const raw=weights.roleFairness*roleScore + weights.workloadBalance*loadScore + weights.overallRest*restScore + weights.futureSpacing*futureScore;
  const final=Number((raw-reliabilityAdjustment).toFixed(3));
  const roleCompleted=Number(roleCompletedCounts[`${candidate.id}::${ministryId}`]||0);
  const rolePlanned=Number(rolePlannedCounts[`${candidate.id}::${ministryId}`]||0);
  const completedTotal=Number(completedCounts[candidate.id] || 0);
  const futureTotal=Number(futureCounts[candidate.id] || 0);

  return {
    final,
    roleLoad:roleCompleted+rolePlanned,
    priority:{sameDayLoad,sameServiceRecent7,nearTermLoad,recent28Load,future28Load,roleRecent28Load,roleFuture28Load,restDays},
    components:{
      roleCompleted,rolePlanned,roleScore,loadScore,restScore,futureScore,reliabilityAdjustment,
      completed:completedTotal,future:futureTotal,roleDays,restDays,sameDayLoad,sameServiceRecent7,
      recent7Load,future7Load,nearTermLoad,recent28Load,future28Load,roleRecent28Load,roleFuture28Load,historyFloor:baseline
    }
  };
}

export function rankCandidates(candidates, ctx){
  return candidates.map(member=>({member,score:calculateFairness(member,ctx)})).sort((a,b)=>{
    const ap=a.score.priority,bp=b.score.priority;
    // Strongest rule: do not double-book a day when another eligible person is free.
    if(ap.sameDayLoad!==bp.sameDayLoad)return ap.sameDayLoad-bp.sameDayLoad;
    // Avoid repeating the same service on consecutive weekly occurrences.
    if(ap.sameServiceRecent7!==bp.sameServiceRecent7)return ap.sameServiceRecent7-bp.sameServiceRecent7;
    // Then balance the person, not merely the ministry: recent rest and nearby
    // future commitments outrank a role-specific points advantage.
    if(ap.nearTermLoad!==bp.nearTermLoad)return ap.nearTermLoad-bp.nearTermLoad;
    if(ap.recent28Load!==bp.recent28Load)return ap.recent28Load-bp.recent28Load;
    if(ap.future28Load!==bp.future28Load)return ap.future28Load-bp.future28Load;
    // Only after whole-person workload is balanced do we compare this ministry.
    if(ap.roleRecent28Load!==bp.roleRecent28Load)return ap.roleRecent28Load-bp.roleRecent28Load;
    if(ap.roleFuture28Load!==bp.roleFuture28Load)return ap.roleFuture28Load-bp.roleFuture28Load;
    if(ap.restDays!==bp.restDays)return bp.restDays-ap.restDays;
    if(a.score.roleLoad!==b.score.roleLoad)return a.score.roleLoad-b.score.roleLoad;
    if(b.score.final!==a.score.final)return b.score.final-a.score.final;
    const an=(a.member.fullName||'').localeCompare(b.member.fullName||'','es',{sensitivity:'base'});
    if(an!==0)return an;
    return String(a.member.id).localeCompare(String(b.member.id));
  });
}

// Preserve maximum service coverage before using fairness points to break ties.
// Each subsequent slot contains the IDs of its currently eligible volunteers;
// a volunteer can fill at most one slot in the same program.
export function selectWithCoverage(ranking,remainingSlotCandidateIds=[]){
  if(!ranking.length)return null;
  if(!remainingSlotCandidateIds.length)return ranking[0];
  function maximumRemainingCoverage(excludeId){
    const matches=new Map();
    function augment(slot,seen){
      for(const id of remainingSlotCandidateIds[slot]){
        if(id===excludeId||seen.has(id))continue;
        seen.add(id);
        if(!matches.has(id)||augment(matches.get(id),seen)){
          matches.set(id,slot);return true;
        }
      }
      return false;
    }
    let count=0;
    // The shortest choices first limit the search and avoid wasting rare volunteers.
    const indexes=remainingSlotCandidateIds.map((ids,i)=>i).sort((a,b)=>remainingSlotCandidateIds[a].length-remainingSlotCandidateIds[b].length);
    for(const slot of indexes)if(augment(slot,new Set()))count++;
    return count;
  }
  let best=ranking[0],coverage=-1;
  for(const candidate of ranking){
    const possible=maximumRemainingCoverage(candidate.member.id);
    if(possible>coverage){best=candidate;coverage=possible;}
    // Maximum remaining coverage reached. Ranking has already applied fairness,
    // so the first candidate with full coverage is the fair winner.
    if(coverage===remainingSlotCandidateIds.length)break;
  }
  return best;
}
