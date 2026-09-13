export function traceRule(ruleId,checks=[]){const reasons=checks.map(c=>({...c,passed:Boolean(c.passed)}));return {rule:ruleId,passed:reasons.every(x=>x.passed),reasons};}
export function explainTrace(trace){if(!trace)return[];const failed=(trace.reasons||[]).filter(x=>!x.passed);return failed.length?failed:(trace.reasons||[]);}
export function rankCandidates(candidates,scoreFn){return [...candidates].map(item=>({item,score:Number(scoreFn(item)||0)})).sort((a,b)=>b.score-a.score);}
