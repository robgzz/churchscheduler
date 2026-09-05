import { tableNames } from '../config.js';
import { getDoc, putDoc, listDocs, nowIso } from '../storage/repository.js';
import { requestReplacement } from './replacements.js';
import { appendHistory } from '../scheduler/history.js';

export async function addUnavailability(churchId,memberId,{from,to,note=''}){
  if(!from||!to||from>to) throw Object.assign(new Error('Valid from/to dates are required'),{statusCode:400});
  const member=await getDoc(tableNames.members,churchId,memberId); if(!member) throw Object.assign(new Error('Member not found'),{statusCode:404});
  const range={id:`unav_${Date.now()}`,from,to,note,createdAt:nowIso()};
  member.unavailability=[...(member.unavailability||[]),range]; member.updatedAt=nowIso();
  await putDoc(tableNames.members,churchId,member.id,member,{username:member.username||'',active:member.active!==false,adminAccess:member.adminAccess===true,churchAdministrator:member.churchAdministrator===true});
  await appendHistory(churchId,{eventType:'unavailability.added',memberId,dateISO:from,details:range,penaltyEligible:false});
  const assigned=await listDocs(tableNames.assignments,churchId,{filter:`currentMemberId eq '${memberId}' and status eq 'scheduled'`,max:500});
  const affected=assigned.filter(a=>from<=a.dateISO&&a.dateISO<=to);
  const results=[];
  for(const a of affected){
    try { results.push(await requestReplacement(churchId,memberId,a.id,{reason:'proactive_unavailability',penaltyOverride:false})); }
    catch(e){ results.push({assignmentId:a.id,error:e.message}); }
  }
  return {member,range,affected:results.length,replacements:results};
}
