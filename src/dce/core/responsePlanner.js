import { ResultType } from './semantic.js';
export function semanticResult(type,payload={}){return {type,...payload};}
export function errorResult(code,payload={}){return {type:code==='permission_denied'?ResultType.PERMISSION_DENIED:code==='constraint_violation'?ResultType.CONSTRAINT_VIOLATION:ResultType.AMBIGUITY,error:code,...payload};}
export function nextActions(capabilities,actor){return capabilities.filter(c=>!c.visibleWhen||c.visibleWhen(actor)).map(c=>({id:c.id,labelEs:c.labelEs||c.id,labelEn:c.labelEn||c.id,risk:c.risk}));}
