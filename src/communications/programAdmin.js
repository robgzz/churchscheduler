import crypto from 'node:crypto';
import { tableNames } from '../config.js';
import { getDoc, listDocs, putDoc, createDoc, nowIso } from '../storage/repository.js';
import { enqueue } from './notifications.js';
import { listProgramViews } from '../services/programs.js';
import { appendHistory } from '../scheduler/history.js';
import { threeWeekWindow } from '../scheduler/dates.js';

function lang(member){return member?.preferences?.locale==='en'?'en':'es';}
function displayChurch(settings,locale){return locale==='en'?(settings.churchNameEn||settings.churchName||'Church'):(settings.churchNameEs||settings.churchName||'Iglesia');}
function notificationId(eventKey,memberId){return `app_${crypto.createHash('sha256').update(`${eventKey}|${memberId}`).digest('hex').slice(0,32)}`;}

export async function getProgramAdmin(churchId){
  const settings=await getDoc(tableNames.settings,churchId,'church')||{};
  if(!settings.currentProgramAdminId) return null;
  const member=await getDoc(tableNames.members,churchId,settings.currentProgramAdminId);
  if(!member || member.active===false || !(member.adminAccess===true||member.churchAdministrator===true)) return null;
  return member;
}

export async function setProgramAdmin(churchId,memberId,changedBy=''){
  const member=await getDoc(tableNames.members,churchId,memberId);
  if(!member || member.active===false || !(member.adminAccess===true||member.churchAdministrator===true)){
    throw Object.assign(new Error('Select an active administrator.'),{statusCode:400});
  }
  const settings=await getDoc(tableNames.settings,churchId,'church')||{id:'church'};
  const previous=settings.currentProgramAdminId||'';
  settings.currentProgramAdminId=member.id;
  settings.currentProgramAdminUpdatedAt=nowIso();
  settings.currentProgramAdminUpdatedBy=changedBy;
  await putDoc(tableNames.settings,churchId,'church',settings);
  await appendHistory(churchId,{eventType:'program_admin.changed',memberId:member.id,previousMemberId:previous,newMemberId:member.id,source:'owner',details:{changedBy}});
  return member;
}

export async function createAppNotification(churchId,member,{eventKey,title,message,metadata={}}){
  if(!member?.id) return false;
  const id=notificationId(eventKey,member.id);
  try{
    await createDoc(tableNames.appNotifications,churchId,id,{id,memberId:member.id,eventKey,title,message,metadata,status:'unread',createdAt:nowIso()},{memberId:member.id,status:'unread',createdAt:nowIso(),eventKey});
    return true;
  }catch(e){if(e.statusCode===409||e.code==='EntityAlreadyExists')return false;throw e;}
}

export async function notifyProgramAdmin(churchId,{eventKey,type,titleEn,titleEs,messageEn,messageEs,metadata={}}){
  const admin=await getProgramAdmin(churchId); if(!admin)return {notified:false,reason:'no_program_admin'};
  const settings=await getDoc(tableNames.settings,churchId,'church')||{};
  const locale=lang(admin),title=locale==='en'?titleEn:titleEs,message=locale==='en'?messageEn:messageEs,churchName=displayChurch(settings,locale);
  await createAppNotification(churchId,admin,{eventKey,title,message,metadata:{type,...metadata}});
  let queued=0;
  const legacyChannels=['sms','email'];
  for(const channel of [...legacyChannels,'push']){
    if(await enqueue({churchId,eventKey,channel,member:admin,subject:title,message:`${churchName}: ${message}`,metadata:{type,...metadata}}))queued++;
  }
  return {notified:true,memberId:admin.id,queued};
}

export async function syncProgramStatus(churchId,{programId='' }={}){
  const admin=await getProgramAdmin(churchId); if(!admin)return {checked:0,notified:0};
  const settings=await getDoc(tableNames.settings,churchId,'church')||{};
  const window=threeWeekWindow(settings.timezone||'America/Chicago',Number(settings.weekStartsOn??0));
  const programs=await listProgramViews(churchId,{from:window.start,to:window.end});
  const targets=programId?programs.filter(p=>p.id===programId):programs;
  let notified=0;
  for(const p of targets){
    const status=p.readiness?.ready?'ready':p.readiness?.openAssignments>0?'open_assignments':'needs_songs';
    const persisted=await getDoc(tableNames.programs,churchId,p.id); if(!persisted)continue;
    const marker=persisted.programAdminStatusNotification||{};
    if(marker.memberId===admin.id&&marker.status===status)continue;
    const serviceEs=p.service?.labelEs||p.service?.label||p.serviceId,serviceEn=p.service?.labelEn||p.service?.label||p.serviceId;
    const statusEn=status==='ready'?'Complete / Ready':status==='needs_songs'?'Needs song selections':'Has open assignments';
    const statusEs=status==='ready'?'Completo / Listo':status==='needs_songs'?'Faltan selecciones de cantos':'Tiene asignaciones sin cubrir';
    await notifyProgramAdmin(churchId,{eventKey:`program-status:${p.id}:${status}:${admin.id}`,type:'program.status',titleEn:'Program status update',titleEs:'Estado del programa',messageEn:`${serviceEn} on ${p.dateISO}: ${statusEn}.`,messageEs:`${serviceEs} del ${p.dateISO}: ${statusEs}.`,metadata:{programId:p.id,dateISO:p.dateISO,status}});
    persisted.programAdminStatusNotification={memberId:admin.id,status,at:nowIso()};
    await putDoc(tableNames.programs,churchId,persisted.id,persisted,{serviceId:persisted.serviceId,dateISO:persisted.dateISO,status:persisted.status||''});
    notified++;
  }
  return {checked:targets.length,notified};
}
