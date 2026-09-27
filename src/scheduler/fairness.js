import { daysBetween } from './dates.js';

const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
export const DEFAULT_WEIGHTS={ roleFairness:0.45, workloadBalance:0.25, overallRest:0.15, futureSpacing:0.15 };

export function calculateFairness(candidate, ctx){
  const { ministryId, today, completedCounts={}, roleCompletedCounts={}, rolePlannedCounts={}, futureCounts={}, lastServedByMember={}, replacementCounts={}, weights=DEFAULT_WEIGHTS }=ctx;
  const memberLast=lastServedByMember[candidate.id] || {};
  const lastRole=memberLast.byMinistry?.[ministryId] || candidate.legacyLastServedByMinistry?.[ministryId] || null;
  const lastAny=memberLast.any || candidate.legacyLastServedAny || null;
  const roleDays=lastRole ? daysBetween(String(lastRole).slice(0,10),today) : 9999;
  const restDays=lastAny ? daysBetween(String(lastAny).slice(0,10),today) : 9999;
  const roleScore=lastRole ? clamp(roleDays/84*100,0,100) : 100;
  const completed=Number(completedCounts[candidate.id] || 0);
  const loadScore=clamp(100-completed*12.5,0,100);
  const restScore=lastAny ? clamp(restDays/56*100,0,100) : 100;
  const future=Number(futureCounts[candidate.id] || 0);
  const futureScore=clamp(100-future*25,0,100);
  const qualifyingReplacements=Number(replacementCounts[candidate.id] || 0);
  const reliabilityAdjustment=Math.min(8,qualifyingReplacements*2);
  const raw=weights.roleFairness*roleScore + weights.workloadBalance*loadScore + weights.overallRest*restScore + weights.futureSpacing*futureScore;
  const final=Number((raw-reliabilityAdjustment).toFixed(3));
  const roleCompleted=Number(roleCompletedCounts[`${candidate.id}::${ministryId}`]||0);
  const rolePlanned=Number(rolePlannedCounts[`${candidate.id}::${ministryId}`]||0);
  return { final, roleLoad:roleCompleted+rolePlanned, components:{ roleCompleted,rolePlanned,roleScore, loadScore, restScore, futureScore, reliabilityAdjustment, completed, future, roleDays, restDays } };
}

export function rankCandidates(candidates, ctx){
  return candidates.map(member=>({member,score:calculateFairness(member,ctx)})).sort((a,b)=>{
    // Serving fewer times in this ministry (including already scheduled weeks)
    // outranks mere scoring differences. The point system breaks equal-load ties.
    if (a.score.roleLoad!==b.score.roleLoad) return a.score.roleLoad-b.score.roleLoad;
    if (b.score.final!==a.score.final) return b.score.final-a.score.final;
    const an=(a.member.fullName||'').localeCompare(b.member.fullName||'','es',{sensitivity:'base'});
    if (an!==0) return an;
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
