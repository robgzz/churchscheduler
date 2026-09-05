import { daysBetween } from './dates.js';

const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
export const DEFAULT_WEIGHTS={ roleFairness:0.45, workloadBalance:0.25, overallRest:0.15, futureSpacing:0.15 };

export function calculateFairness(candidate, ctx){
  const { ministryId, today, completedCounts={}, futureCounts={}, lastServedByMember={}, replacementCounts={}, weights=DEFAULT_WEIGHTS }=ctx;
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
  return { final, components:{ roleScore, loadScore, restScore, futureScore, reliabilityAdjustment, completed, future, roleDays, restDays } };
}

export function rankCandidates(candidates, ctx){
  return candidates.map(member=>({member,score:calculateFairness(member,ctx)})).sort((a,b)=>{
    if (b.score.final!==a.score.final) return b.score.final-a.score.final;
    const an=(a.member.fullName||'').localeCompare(b.member.fullName||'','es',{sensitivity:'base'});
    if (an!==0) return an;
    return String(a.member.id).localeCompare(String(b.member.id));
  });
}
