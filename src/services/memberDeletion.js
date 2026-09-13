import { tableNames } from '../config.js';
import { getDoc, listDocs, putDoc, deleteDoc, nowIso } from '../storage/repository.js';
import { destroyAllUserSessions } from '../auth/sessions.js';
import { appendHistory } from '../scheduler/history.js';
import { syncProgramStatus } from '../communications/programAdmin.js';
import { todayIso } from '../scheduler/dates.js';

const esc=v=>String(v||'').replace(/'/g,"''");

export async function deleteMemberProfile(churchId,memberId,{actorId='',source='admin'}={}){
  const member=await getDoc(tableNames.members,churchId,memberId);
  if(!member)throw Object.assign(new Error('Member not found'),{statusCode:404,code:'MEMBER_NOT_FOUND'});
  if(member.churchAdministrator===true)throw Object.assign(new Error('The Church Administrator profile cannot be deleted.'),{statusCode:409,code:'OWNER_DELETE_FORBIDDEN'});
  if(actorId&&member.id===actorId)throw Object.assign(new Error('You cannot delete your own signed-in member profile.'),{statusCode:409,code:'SELF_DELETE_FORBIDDEN'});
  const settings=await getDoc(tableNames.settings,churchId,'church')||{};
  if(settings.currentProgramAdminId===member.id)throw Object.assign(new Error('Change the responsible program administrator before deleting this profile.'),{statusCode:409,code:'PROGRAM_ADMIN_DELETE_FORBIDDEN'});

  const checkIns=await listDocs(tableNames.childCheckIns,churchId,{max:10000});
  if(checkIns.some(x=>x.memberId===member.id&&['checked_in','pickup_requested'].includes(x.status)))throw Object.assign(new Error('This member has an active child-care handoff. Complete pickup before deleting the profile.'),{statusCode:409,code:'ACTIVE_CHILD_HANDOFF'});

  const today=todayIso(settings.timezone||'America/Chicago');
  const futureAssignments=await listDocs(tableNames.assignments,churchId,{filter:`currentMemberId eq '${esc(member.id)}'`,max:5000});
  let unfilledAssignments=0;
  for(const a of futureAssignments){
    if(a.status==='completed'||String(a.dateISO||'')<today)continue;
    a.originalMemberId=a.originalMemberId||member.id;a.currentMemberId=null;a.status='unfilled';a.locked=false;a.songIds=[];a.songsUpdatedAt=null;a.songsUpdatedBy=null;a.updatedAt=nowIso();
    await putDoc(tableNames.assignments,churchId,a.id,a,{serviceId:a.serviceId,dateISO:a.dateISO,status:a.status,currentMemberId:'',ministryId:a.ministryId,programId:a.programId});
    await appendHistory(churchId,{eventType:'assignment.unfilled',programId:a.programId,assignmentId:a.id,assignmentKey:a.assignmentKey,ministryId:a.ministryId,memberId:'',previousMemberId:member.id,dateISO:a.dateISO,source:'member_profile_delete',reason:'member_profile_deleted'});
    unfilledAssignments++;
  }

  const tasks=await listDocs(tableNames.followUps,churchId,{filter:`assignedTo eq '${esc(member.id)}'`,max:5000});
  let cancelledTasks=0;
  for(const task of tasks){
    if(['completed','cancelled'].includes(task.status))continue;
    task.assignedTo='';task.status='cancelled';task.updatedAt=nowIso();task.updatedBy=actorId;task.notes=`${task.notes||''}${task.notes?'\n':''}[System] Cancelled because the assigned member profile was deleted.`;
    await putDoc(tableNames.followUps,churchId,task.id,task,{status:task.status,assignedTo:'',dueDate:task.dueDate||''});cancelledTasks++;
  }

  if(member.username){await destroyAllUserSessions(churchId,member.username);await deleteDoc(tableNames.users,churchId,member.username);}
  await deleteDoc(tableNames.members,churchId,member.id);
  await appendHistory(churchId,{eventType:'member.deleted',memberId:actorId,source,details:{deletedMemberId:member.id,fullName:member.fullName||'',username:member.username||'',unfilledAssignments,cancelledTasks}});
  await syncProgramStatus(churchId).catch(()=>{});
  return {ok:true,member,deletedMemberId:member.id,unfilledAssignments,cancelledTasks};
}
