import express from 'express';
import crypto from 'node:crypto';
import { requireLogin, requireGroup, requireAnyGroup } from '../auth/middleware.js';
import { tableNames } from '../config.js';
import { putDoc, listDocs, getDoc, nowIso, createDoc } from '../storage/repository.js';
import { myAssignments, listProgramViews } from '../services/programs.js';
import { addUnavailability } from '../services/unavailability.js';
import { requestReplacement } from '../services/replacements.js';
import { threeWeekWindow } from '../scheduler/dates.js';
import { appendHistory } from '../scheduler/history.js';
import { enqueueAdminAlert } from '../communications/notifications.js';
import { songSelectionContext, validateNoDuplicateSongsInProgram } from '../services/songSelection.js';
import { syncProgramStatus, notifyProgramAdmin } from '../communications/programAdmin.js';
import { enqueue, dispatchQueue } from '../communications/notifications.js';
import { requireModule } from '../modules/registry.js';
import { upsertPushDevice, deactivatePushDevice, listMemberPushDevices } from '../communications/push.js';

export const memberRouter=express.Router();
memberRouter.use(requireLogin);


memberRouter.get('/push-devices',async(req,res)=>{const rows=await listMemberPushDevices(req.churchId,req.identity.member.id);res.json(rows.map(x=>({id:x.id,platform:x.platform,deviceName:x.deviceName||'',lastSeenAt:x.lastSeenAt||''})));});
memberRouter.post('/push-devices',async(req,res,next)=>{try{res.status(201).json(await upsertPushDevice(req.churchId,req.identity.member,{token:req.body?.token,platform:req.body?.platform||'android',deviceName:req.body?.deviceName||''}));}catch(e){next(e);}});
memberRouter.delete('/push-devices',async(req,res,next)=>{try{const token=String(req.body?.token||'');if(!token)return res.status(400).json({error:'Push token is required.'});res.json({ok:await deactivatePushDevice(req.churchId,req.identity.member.id,token)});}catch(e){next(e);}});

memberRouter.get('/assignments',requireModule('worship'),requireGroup('worship'),async(req,res)=>res.json(await myAssignments(req.churchId,req.identity.member.id)));

memberRouter.get('/notifications',async(req,res)=>{
  const rows=await listDocs(tableNames.appNotifications,req.churchId,{filter:`memberId eq '${String(req.identity.member.id).replace(/'/g,"''")}'`,max:200});
  res.json(rows.sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).slice(0,50));
});
memberRouter.put('/notifications/:id/read',async(req,res)=>{
  const row=await getDoc(tableNames.appNotifications,req.churchId,req.params.id);
  if(!row||row.memberId!==req.identity.member.id)return res.status(404).json({error:'Notification not found'});
  row.status='read'; row.readAt=nowIso();
  await putDoc(tableNames.appNotifications,req.churchId,row.id,row,{memberId:row.memberId,status:row.status,createdAt:row.createdAt||'',eventKey:row.eventKey||''});
  res.json({ok:true});
});

memberRouter.get('/programs',requireModule('worship'),requireAnyGroup('members','worship'),async(req,res)=>{
  const settings=await getDoc(tableNames.settings,req.churchId,'church') || {timezone:'America/Chicago',weekStartsOn:0};
  const w=threeWeekWindow(settings.timezone||'America/Chicago',Number(settings.weekStartsOn??0));
  res.json(await listProgramViews(req.churchId,{from:w.start,to:w.end}));
});
memberRouter.post('/unavailability',requireGroup('worship'),async(req,res)=>res.status(201).json(await addUnavailability(req.churchId,req.identity.member.id,req.body)));
memberRouter.post('/replacement/:assignmentId',requireGroup('worship'),async(req,res)=>res.json(await requestReplacement(req.churchId,req.identity.member.id,req.params.assignmentId,{reason:'member_request'})));
memberRouter.get('/petitions',requireModule('prayer'),requireGroup('members'),async(req,res)=>{
  const rows=await listDocs(tableNames.petitions,req.churchId,{max:500});
  res.json(rows.filter(p=>p.private!==true).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).map(p=>({id:p.id,memberId:p.memberId,memberName:p.memberName,text:p.text,createdAt:p.createdAt,status:p.status})));
});
memberRouter.post('/petitions',requireModule('prayer'),requireGroup('members'),async(req,res)=>{
  const id=`petition_${crypto.randomUUID().replace(/-/g,'').slice(0,14)}`;
  const doc={id,memberId:req.identity.member.id,memberName:req.identity.member.fullName,text:String(req.body.text||'').trim(),private:req.body.private!==false,status:'new',createdAt:nowIso()};
  if(!doc.text) return res.status(400).json({error:'Petition text is required.',code:'PETITION_REQUIRED'});
  await putDoc(tableNames.petitions,req.churchId,id,doc,{memberId:doc.memberId,status:'new',createdAt:doc.createdAt});
  await enqueueAdminAlert(req.churchId,{type:'petition',id,summary:`New prayer petition from ${doc.memberName}. Open the Church Scheduler Admin console.`});
  res.status(201).json({ok:true,id});
});
memberRouter.get('/songs',requireGroup('worship'),async(req,res)=>res.json((await listDocs(tableNames.songs,req.churchId,{max:2000})).filter(s=>s.active!==false)));

memberRouter.get('/assignments/:assignmentId/song-options',requireGroup('worship'),async(req,res)=>{
  const assignment=await getDoc(tableNames.assignments,req.churchId,req.params.assignmentId);
  if(!assignment)return res.status(404).json({error:'Assignment not found',code:'ASSIGNMENT_NOT_FOUND'});
  if(assignment.currentMemberId!==req.identity.member.id)return res.status(403).json({error:'This assignment does not belong to this member',code:'ASSIGNMENT_NOT_YOURS'});
  if(assignment.ministryId!=='ministry_songs')return res.status(409).json({error:'Songs can only be selected for a Cantos assignment',code:'SONG_ASSIGNMENT_ONLY'});
  res.json(await songSelectionContext(req.churchId,assignment,req.identity.member.id));
});

memberRouter.put('/assignments/:assignmentId/songs',requireGroup('worship'),async(req,res)=>{
  const assignment=await getDoc(tableNames.assignments,req.churchId,req.params.assignmentId);
  if(!assignment) return res.status(404).json({error:'Assignment not found',code:'ASSIGNMENT_NOT_FOUND'});
  if(assignment.currentMemberId!==req.identity.member.id) return res.status(403).json({error:'This assignment does not belong to this member',code:'ASSIGNMENT_NOT_YOURS'});
  if(assignment.ministryId!=='ministry_songs') return res.status(409).json({error:'Songs can only be selected for a Cantos assignment',code:'SONG_ASSIGNMENT_ONLY'});
  if(assignment.status!=='scheduled') return res.status(409).json({error:'Only scheduled assignments can be updated',code:'ASSIGNMENT_NOT_SCHEDULED'});

  const requested=[...new Set((Array.isArray(req.body.songIds)?req.body.songIds:[]).map(String).filter(Boolean))].slice(0,25);
  const songs=await listDocs(tableNames.songs,req.churchId,{max:2000});
  const songMap=new Map(songs.filter(s=>s.active!==false).map(s=>[s.id,s]));
  if(requested.some(id=>!songMap.has(id))) return res.status(400).json({error:'One or more selected songs are invalid or inactive',code:'INVALID_SONGS'});
  try{await validateNoDuplicateSongsInProgram(req.churchId,assignment,requested);}catch(e){return res.status(e.statusCode||409).json({error:e.message,code:e.code||'DUPLICATE_SERVICE_SONGS',conflicts:e.conflicts||[]});}

  assignment.songIds=requested;
  assignment.songsUpdatedAt=nowIso();
  assignment.songsUpdatedBy=req.identity.member.id;
  assignment.updatedAt=nowIso();
  await putDoc(tableNames.assignments,req.churchId,assignment.id,assignment,{serviceId:assignment.serviceId,dateISO:assignment.dateISO,status:assignment.status,currentMemberId:assignment.currentMemberId||'',ministryId:assignment.ministryId,programId:assignment.programId});
  await appendHistory(req.churchId,{eventType:'songs.updated',programId:assignment.programId,assignmentId:assignment.id,assignmentKey:assignment.assignmentKey,ministryId:assignment.ministryId,memberId:req.identity.member.id,dateISO:assignment.dateISO,details:{songIds:requested}});
  const selectedSongs=requested.map(id=>songMap.get(id)).filter(Boolean); const songSummary=selectedSongs.map(x=>`${x.number?`${x.number} - `:''}${x.titleEs||x.title||x.titleEn||''}`).join(', ');
  await notifyProgramAdmin(req.churchId,{eventKey:`songs-submitted:${assignment.id}:${assignment.songsUpdatedAt}`,type:'songs.submitted',titleEn:'Songs submitted',titleEs:'Cantos entregados',messageEn:`${req.identity.member.fullName} submitted songs for ${assignment.dateISO}${songSummary?`: ${songSummary}`:''}.`,messageEs:`${req.identity.member.fullName} entregó los cantos para ${assignment.dateISO}${songSummary?`: ${songSummary}`:''}.`,metadata:{assignmentId:assignment.id,programId:assignment.programId,dateISO:assignment.dateISO,songIds:requested},channels:['sms','push']});
  await syncProgramStatus(req.churchId,{programId:assignment.programId});
  res.json({ok:true,assignmentId:assignment.id,songIds:requested,songs:requested.map(id=>songMap.get(id))});
});

memberRouter.put('/contact',async(req,res)=>{
  const member=req.identity.member;
  if(!member) return res.status(400).json({error:'Member profile not found',code:'MEMBER_NOT_FOUND'});
  const email=String(req.body.email??member.email??'').trim();
  const phone=String(req.body.phone??member.phone??'').trim();
  if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({error:'Enter a valid email address.',code:'INVALID_EMAIL'});
  member.email=email; member.phone=phone;
  member.notificationPreferences={...(member.notificationPreferences||{}),email:req.body.emailNotificationsEnabled===undefined?(member.notificationPreferences?.email!==false):req.body.emailNotificationsEnabled===true,sms:req.body.smsNotificationsEnabled===undefined?(member.notificationPreferences?.sms!==false):req.body.smsNotificationsEnabled===true,push:member.notificationPreferences?.push!==false};
  member.updatedAt=nowIso();
  await putDoc(tableNames.members,req.churchId,member.id,member,{username:member.username||'',active:member.active!==false,adminAccess:member.adminAccess===true,churchAdministrator:member.churchAdministrator===true});
  res.json({ok:true,member});
});


function childAge(value){const n=Number(value);return Number.isFinite(n)&&n>=0&&n<=25?Math.round(n):null;}
async function notifyFamilyChildren(churchId,member,{eventKey,subject,message,metadata={}}){
  const prefs=member.childrenNotificationPreferences||{};let queued=0;
  if(prefs.push!==false){
    const notificationId=`app_${crypto.createHash('sha256').update(`${eventKey}|${member.id}`).digest('hex').slice(0,28)}`;
    try{await createDoc(tableNames.appNotifications,churchId,notificationId,{id:notificationId,memberId:member.id,eventKey,title:subject,message,metadata:{type:'children',...metadata},status:'unread',createdAt:nowIso()},{memberId:member.id,status:'unread',createdAt:nowIso(),eventKey});queued++;}catch(e){if(e.statusCode!==409&&e.code!=='EntityAlreadyExists')throw e;}
  }
  for(const channel of ['sms','email','push']){
    if(channel==='sms'&&prefs.sms===false)continue;if(channel==='email'&&prefs.email===false)continue;if(channel==='push'&&prefs.push===false)continue;
    if(await enqueue({churchId,eventKey,channel,member,subject,message,metadata:{type:'children',...metadata}}))queued++;
  }
  return queued;
}
function childGender(value){const v=String(value||'unspecified').toLowerCase();return ['female','male','other','unspecified'].includes(v)?v:'unspecified';}
function childCareArea(value){const v=String(value||'').toLowerCase();return ['nursery','toddlers'].includes(v)?v:'';}
function childrenWorkerRoles(member){return [...new Set((Array.isArray(member?.childrenWorkerRoles)?member.childrenWorkerRoles:[]).map(String).filter(x=>['nursery','toddlers'].includes(x)))];}
function assertChildrenWorker(member){const roles=childrenWorkerRoles(member);if(!roles.length)throw Object.assign(new Error('Children care worker access required.'),{statusCode:403,code:'CHILDREN_WORKER_REQUIRED'});return roles;}
memberRouter.use('/children',requireModule('children'));
memberRouter.use('/children-worker',requireModule('children'));
memberRouter.get('/children',async(req,res)=>{
  const rows=await listDocs(tableNames.children,req.churchId,{filter:`memberId eq '${String(req.identity.member.id).replace(/'/g,"''")}'`,max:100});
  const checkIns=await listDocs(tableNames.childCheckIns,req.churchId,{filter:`memberId eq '${String(req.identity.member.id).replace(/'/g,"''")}'`,max:300});
  res.json({enabled:req.identity.member.childrenProgramEnabled===true,notificationPreferences:req.identity.member.childrenNotificationPreferences||{sms:true,email:true,push:true},children:rows.filter(x=>x.active!==false).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''))),recentCheckIns:checkIns.sort((a,b)=>String(b.checkInAt||'').localeCompare(String(a.checkInAt||''))).slice(0,20)});
});
memberRouter.put('/children/enrollment',async(req,res)=>{
  const member=req.identity.member;member.childrenProgramEnabled=req.body.enabled===true;member.childrenNotificationPreferences={sms:req.body.sms!==false,email:req.body.email!==false,push:req.body.push!==false};member.updatedAt=nowIso();
  await putDoc(tableNames.members,req.churchId,member.id,member,{username:member.username||'',active:member.active!==false,adminAccess:member.adminAccess===true,churchAdministrator:member.churchAdministrator===true});
  await appendHistory(req.churchId,{eventType:'children.enrollment.updated',memberId:member.id,source:'member',details:{enabled:member.childrenProgramEnabled,notificationPreferences:member.childrenNotificationPreferences}});res.json({ok:true,member});
});
memberRouter.post('/children',async(req,res)=>{
  if(req.identity.member.childrenProgramEnabled!==true)return res.status(409).json({error:'Enroll in Children check-in first.',code:'CHILDREN_NOT_ENROLLED'});
  const name=String(req.body.name||'').trim(),age=childAge(req.body.age);if(!name||age===null)return res.status(400).json({error:'Child name and valid age are required.'});
  const gender=childGender(req.body.gender),careArea=childCareArea(req.body.careArea),specialInstructions=String(req.body.specialInstructions||'').trim().slice(0,1000);
  if(!careArea)return res.status(400).json({error:'Choose Nursery or Toddlers for the child care area.'});
  const id=`child_${crypto.randomUUID().replace(/-/g,'').slice(0,14)}`,doc={id,memberId:req.identity.member.id,name,age,gender,careArea,specialInstructions,active:true,createdAt:nowIso(),updatedAt:nowIso()};await putDoc(tableNames.children,req.churchId,id,doc,{memberId:doc.memberId,active:true,careArea:doc.careArea});
  await appendHistory(req.churchId,{eventType:'children.child.added',memberId:doc.memberId,source:'member',details:{childId:id,name,age,gender,careArea}});res.status(201).json(doc);
});
memberRouter.put('/children/:id',async(req,res)=>{const row=await getDoc(tableNames.children,req.churchId,req.params.id);if(!row||row.memberId!==req.identity.member.id)return res.status(404).json({error:'Child not found'});const age=childAge(req.body.age??row.age);row.name=String(req.body.name??row.name).trim();row.age=age===null?row.age:age;row.gender=childGender(req.body.gender??row.gender);row.careArea=childCareArea(req.body.careArea??row.careArea);if(!row.careArea)return res.status(400).json({error:'Choose Nursery or Toddlers for the child care area.'});row.specialInstructions=String(req.body.specialInstructions??row.specialInstructions??'').trim().slice(0,1000);row.active=req.body.active!==false;row.updatedAt=nowIso();await putDoc(tableNames.children,req.churchId,row.id,row,{memberId:row.memberId,active:row.active,careArea:row.careArea});res.json(row);});
memberRouter.post('/children/:id/check-in',async(req,res,next)=>{try{if(req.identity.member.childrenProgramEnabled!==true)return res.status(409).json({error:'Enroll in Children check-in first.',code:'CHILDREN_NOT_ENROLLED'});const child=await getDoc(tableNames.children,req.churchId,req.params.id);if(!child||child.memberId!==req.identity.member.id||child.active===false)return res.status(404).json({error:'Child not found'});const active=(await listDocs(tableNames.childCheckIns,req.churchId,{filter:`childId eq '${String(child.id).replace(/'/g,"''")}'`,max:100})).find(x=>['checked_in','pickup_requested'].includes(x.status));if(active)return res.status(200).json({...active,pickupCode:req.body.pickupCode||undefined,alreadyCheckedIn:true});const settings=await getDoc(tableNames.settings,req.churchId,'church')||{},timezone=settings.timezone||'America/Chicago',dateISO=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const id=`checkin_${crypto.randomUUID().replace(/-/g,'').slice(0,16)}`,pickupCode=String(crypto.randomInt(100000,1000000)),pickupCodeHash=crypto.createHash('sha256').update(`${req.churchId}|${id}|${pickupCode}`).digest('hex'),doc={id,childId:child.id,childName:child.name,childAge:child.age,childGender:child.gender||'unspecified',careArea:child.careArea||'',specialInstructions:child.specialInstructions||'',memberId:req.identity.member.id,parentName:req.identity.member.fullName||'',status:'checked_in',checkInAt:nowIso(),checkedInBy:req.identity.member.id,pickupCodeHash,pickupCodeAttempts:0,serviceId:String(req.body.serviceId||''),dateISO,createdAt:nowIso()};await createDoc(tableNames.childCheckIns,req.churchId,id,doc,{memberId:doc.memberId,childId:doc.childId,status:doc.status,dateISO:doc.dateISO,careArea:doc.careArea});await appendHistory(req.churchId,{eventType:'children.checkin',memberId:doc.memberId,dateISO:doc.dateISO,source:'member',details:{childId:child.id,childName:child.name,checkInId:id,careArea:doc.careArea}});const notificationsQueued=await notifyFamilyChildren(req.churchId,req.identity.member,{eventKey:`children-checkin:${id}`,subject:'Westbury Church Hub - Children check-in',message:`${child.name} is checked in. Pickup code: ${pickupCode}.`,metadata:{action:'checkin',checkInId:id,childId:child.id,route:'children'}});res.status(201).json({...doc,pickupCode,pickupCodeHash:undefined,notificationsQueued});}catch(e){next(e);}});
memberRouter.post('/children/check-ins/:id/pickup',async(req,res)=>{const row=await getDoc(tableNames.childCheckIns,req.churchId,req.params.id);if(!row||row.memberId!==req.identity.member.id)return res.status(404).json({error:'Check-in not found'});if(row.status!=='checked_in')return res.status(409).json({error:'Child is not currently checked in'});row.status='pickup_requested';row.pickupRequestedAt=nowIso();row.pickupRequestedBy=req.identity.member.id;await putDoc(tableNames.childCheckIns,req.churchId,row.id,row,{memberId:row.memberId,childId:row.childId,status:row.status,dateISO:row.dateISO||'',careArea:row.careArea||''});await appendHistory(req.churchId,{eventType:'children.pickup.requested',memberId:row.memberId,dateISO:row.dateISO||'',source:'member',details:{childId:row.childId,childName:row.childName,checkInId:row.id}});res.json({ok:true,row:{...row,pickupCodeHash:undefined}});});

memberRouter.get('/children-worker',async(req,res,next)=>{try{const roles=assertChildrenWorker(req.identity.member),settings=await getDoc(tableNames.settings,req.churchId,'church')||{},timezone=settings.timezone||'America/Chicago',today=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const [checkIns,members]=await Promise.all([listDocs(tableNames.childCheckIns,req.churchId,{max:2000}),listDocs(tableNames.members,req.churchId,{max:5000})]);const mm=new Map(members.map(m=>[m.id,m])),active=checkIns.filter(x=>['checked_in','pickup_requested'].includes(x.status)),areaCounts={nursery:active.filter(x=>x.careArea==='nursery').length,toddlers:active.filter(x=>x.careArea==='toddlers').length};const rows=active.filter(x=>roles.includes(String(x.careArea||''))).map(x=>{const parent=mm.get(x.memberId)||{};return {id:x.id,childId:x.childId,childName:x.childName,childAge:x.childAge,childGender:x.childGender,careArea:x.careArea,specialInstructions:x.specialInstructions,status:x.status,dateISO:x.dateISO,checkInAt:x.checkInAt,pickupRequestedAt:x.pickupRequestedAt||'',parentName:x.parentName||parent.fullName||'',parentHasSms:Boolean(parent.phone)&&parent.childrenNotificationPreferences?.sms!==false,parentHasEmail:Boolean(parent.email)&&parent.childrenNotificationPreferences?.email!==false,parentHasPush:parent.childrenNotificationPreferences?.push!==false,stale:String(x.dateISO||'')<today};}).sort((a,b)=>String(a.checkInAt||'').localeCompare(String(b.checkInAt||'')));res.json({roles,dateISO:today,children:rows,areaCounts,lastUpdatedAt:nowIso()});}catch(e){next(e);}});
memberRouter.post('/children-worker/check-ins/:id/alert',async(req,res,next)=>{try{const roles=assertChildrenWorker(req.identity.member),row=await getDoc(tableNames.childCheckIns,req.churchId,req.params.id);if(!row||!['checked_in','pickup_requested'].includes(row.status)||!roles.includes(String(row.careArea||'')))return res.status(404).json({error:'Active child check-in not found for your care area.'});const parent=await getDoc(tableNames.members,req.churchId,row.memberId);if(!parent)return res.status(404).json({error:'Parent/guardian profile not found'});const prefs=parent.childrenNotificationPreferences||{},message=String(req.body.message||`${row.childName} needs you in the ${row.careArea==='nursery'?'Nursery':'Toddlers area'}. Please come to the children’s ministry check-in area.`).trim().slice(0,500),eventKey=`children-parent-alert:${row.id}:${Date.now()}`;let queued=0;for(const channel of ['sms','email','push']){if(channel==='sms'&&prefs.sms===false)continue;if(channel==='email'&&prefs.email===false)continue;if(channel==='push'&&prefs.push===false)continue;if(await enqueue({churchId:req.churchId,eventKey,channel,member:parent,subject:'Westbury Church Hub - Child care alert',message,metadata:{priority:'urgent',type:'children.parent_alert',checkInId:row.id,childId:row.childId,careArea:row.careArea,route:'children'}}))queued++;}const delivery=await dispatchQueue(req.churchId,{max:50});const alertId=`alert_${crypto.randomUUID().replace(/-/g,'').slice(0,16)}`;await appendHistory(req.churchId,{id:alertId,eventType:'children.parent_alert',memberId:parent.id,dateISO:row.dateISO||'',source:'children-worker',details:{checkInId:row.id,childId:row.childId,childName:row.childName,careArea:row.careArea,workerId:req.identity.member.id,queued,delivery}});res.json({ok:true,alertId,queued,delivery});}catch(e){next(e);}});
memberRouter.post('/children-worker/check-ins/:id/release',async(req,res,next)=>{try{const roles=assertChildrenWorker(req.identity.member),row=await getDoc(tableNames.childCheckIns,req.churchId,req.params.id);if(!row||!['checked_in','pickup_requested'].includes(row.status)||!roles.includes(String(row.careArea||'')))return res.status(404).json({error:'Active child check-in not found for your care area.'});const code=String(req.body?.pickupCode||''),hash=crypto.createHash('sha256').update(`${req.churchId}|${row.id}|${code}`).digest('hex');row.pickupCodeAttempts=Number(row.pickupCodeAttempts||0)+1;if(!row.pickupCodeHash||hash!==row.pickupCodeHash){await putDoc(tableNames.childCheckIns,req.churchId,row.id,row,{memberId:row.memberId,childId:row.childId,status:row.status,dateISO:row.dateISO||'',careArea:row.careArea||''});return res.status(403).json({error:'Pickup code does not match',code:'PICKUP_CODE_MISMATCH'});}const recipientName=String(req.body?.recipientName||row.parentName||'').trim();if(!recipientName)return res.status(400).json({error:'Name of receiving adult is required.'});row.status='picked_up';row.pickupAt=nowIso();row.releasedBy=req.identity.member.id;row.receivedByName=recipientName;delete row.pickupCodeHash;await putDoc(tableNames.childCheckIns,req.churchId,row.id,row,{memberId:row.memberId,childId:row.childId,status:row.status,dateISO:row.dateISO||'',careArea:row.careArea||''});await appendHistory(req.churchId,{eventType:'children.pickup.verified',memberId:row.memberId,dateISO:row.dateISO||'',source:'children-worker',details:{childId:row.childId,childName:row.childName,checkInId:row.id,releasedBy:row.releasedBy,receivedByName:recipientName}});res.json({ok:true,row});}catch(e){next(e);}});

memberRouter.put('/preferences',async(req,res)=>{
  const member=req.identity.member;
  if(!member) return res.status(400).json({error:'Member profile not found',code:'MEMBER_NOT_FOUND'});
  const locale=['en','es'].includes(req.body.locale)?req.body.locale:(member.preferences?.locale||'es');
  const theme=['system','light','dark'].includes(req.body.theme)?req.body.theme:(member.preferences?.theme||'system');
  member.preferences={...(member.preferences||{}),locale,theme};
  member.updatedAt=nowIso();
  await putDoc(tableNames.members,req.churchId,member.id,member,{username:member.username||'',active:member.active!==false,adminAccess:member.adminAccess===true,churchAdministrator:member.churchAdministrator===true});
  res.json({ok:true,preferences:member.preferences});
});
