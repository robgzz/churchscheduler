import { tableNames } from '../config.js';
import { getDoc, putDoc, nowIso } from '../storage/repository.js';
import { pickReplacement } from '../scheduler/engine.js';
import { replacementPenaltyEligible } from '../scheduler/policy.js';
import { threeWeekWindow } from '../scheduler/dates.js';
import { appendHistory } from '../scheduler/history.js';
import { notifyProgramAdmin, syncProgramStatus } from '../communications/programAdmin.js';

export async function requestReplacement(churchId,memberId,assignmentId,{reason='member_request',penaltyOverride=null}={}){
  const assignment=await getDoc(tableNames.assignments,churchId,assignmentId);
  if (!assignment) throw Object.assign(new Error('Assignment not found'),{statusCode:404});
  if (assignment.currentMemberId!==memberId) throw Object.assign(new Error('This assignment does not belong to this member'),{statusCode:403});
  if (assignment.status!=='scheduled') throw Object.assign(new Error('Only scheduled assignments can be replaced'),{statusCode:409});
  const settings=await getDoc(tableNames.settings,churchId,'church') || {timezone:'America/Chicago',weekStartsOn:0};
  const window=threeWeekWindow(settings.timezone || 'America/Chicago',Number(settings.weekStartsOn??0));
  const penaltyEligible=penaltyOverride===null ? replacementPenaltyEligible(window.today,assignment.dateISO,Number(settings.weekStartsOn??0)) : !!penaltyOverride;
  const {selected,ranking}=await pickReplacement(churchId,assignment,new Set([memberId]));
  const replacement={ requestedAt:nowIso(),requestedBy:memberId,reason,penaltyEligible,replacementMemberId:selected?.id || null };
  assignment.replacements=[...(assignment.replacements||[]),replacement];
  assignment.currentMemberId=selected?.id || null;
  assignment.assignedAt=selected?nowIso():null;
  assignment.appNotificationAt=assignment.assignedAt;
  assignment.songIds=[];
  assignment.songsUpdatedAt=null;
  assignment.songsUpdatedBy=null;
  assignment.status=selected?'scheduled':'unfilled';
  assignment.updatedAt=nowIso();
  await putDoc(tableNames.assignments,churchId,assignment.id,assignment,{serviceId:assignment.serviceId,dateISO:assignment.dateISO,status:assignment.status,currentMemberId:assignment.currentMemberId||'',ministryId:assignment.ministryId,programId:assignment.programId});
  await appendHistory(churchId,{eventType:'replacement.requested',programId:assignment.programId,assignmentId:assignment.id,assignmentKey:assignment.assignmentKey,ministryId:assignment.ministryId,memberId,previousMemberId:memberId,newMemberId:selected?.id||'',dateISO:assignment.dateISO,penaltyEligible,reason,details:{ranking:ranking.slice(0,10).map(x=>({memberId:x.member.id,fullName:x.member.fullName,score:x.score}))}});
  if(reason==='member_request'){
    const member=await getDoc(tableNames.members,churchId,memberId);
    await notifyProgramAdmin(churchId,{eventKey:`replacement:${assignment.id}:${replacement.requestedAt}`,type:'replacement.requested',titleEn:'Replacement requested',titleEs:'Reemplazo solicitado',messageEn:`${member?.fullName||'A member'} requested a replacement for an assignment on ${assignment.dateISO}. ${selected?`Replacement assigned to ${selected.fullName}.`:'No eligible replacement is currently available.'}`,messageEs:`${member?.fullName||'Un miembro'} solicitó reemplazo para una asignación del ${assignment.dateISO}. ${selected?`Se asignó a ${selected.fullName}.`:'No hay un reemplazo elegible disponible por ahora.'}`,metadata:{assignmentId:assignment.id,programId:assignment.programId,dateISO:assignment.dateISO,replacementMemberId:selected?.id||''}});
  }
  if (selected) await appendHistory(churchId,{eventType:'assignment.reassigned',programId:assignment.programId,assignmentId:assignment.id,assignmentKey:assignment.assignmentKey,ministryId:assignment.ministryId,memberId:selected.id,previousMemberId:memberId,newMemberId:selected.id,dateISO:assignment.dateISO,reason});
  else await appendHistory(churchId,{eventType:'assignment.unfilled',programId:assignment.programId,assignmentId:assignment.id,assignmentKey:assignment.assignmentKey,ministryId:assignment.ministryId,memberId:'',previousMemberId:memberId,dateISO:assignment.dateISO,reason:'replacement_no_candidate'});
  await syncProgramStatus(churchId,{programId:assignment.programId});
  return {assignment,selected,penaltyEligible};
}
