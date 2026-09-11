import express from 'express';
import crypto from 'node:crypto';
import { requireAdmin } from '../auth/middleware.js';
import { tableNames, config } from '../config.js';
import { listDocs, getDoc, putDoc, deleteDoc, uploadBuffer, nowIso } from '../storage/repository.js';
import { hashPassword } from '../auth/password.js';
import { destroyAllUserSessions } from '../auth/sessions.js';
import { securityEvent } from '../security/audit.js';
import { generateThreeWeekSchedule, pickReplacement } from '../scheduler/engine.js';
import { listHistory, appendHistory } from '../scheduler/history.js';
import { listProgramViews } from '../services/programs.js';
import { threeWeekWindow } from '../scheduler/dates.js';
import { enqueueAnnouncement } from '../communications/notifications.js';
import { auditRows, toCsv, toExcelXml, toPdf } from '../services/auditExport.js';
import { syncProgramStatus } from '../communications/programAdmin.js';
import { reportCatalog, buildReport, reportCsv, reportXlsx, reportPdf } from '../services/reporting.js';
import { enqueue } from '../communications/notifications.js';
import { requireModule } from '../modules/registry.js';

function fileSignatureOk(contentType,buf){
  if(contentType==='application/pdf') return buf.length>=5 && buf.subarray(0,5).toString('ascii')==='%PDF-';
  if(contentType==='image/png') return buf.length>=8 && buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if(contentType==='image/jpeg') return buf.length>=3 && buf[0]===0xff && buf[1]===0xd8 && buf[2]===0xff;
  if(contentType==='image/webp') return buf.length>=12 && buf.subarray(0,4).toString('ascii')==='RIFF' && buf.subarray(8,12).toString('ascii')==='WEBP';
  return false;
}

export const adminRouter=express.Router();
adminRouter.use(requireAdmin);

adminRouter.get('/church-profile',async(req,res)=>{
  const church=await getDoc(tableNames.settings,req.churchId,'church');
  res.json(church||{});
});
adminRouter.put('/church-profile',async(req,res)=>{
  const old=await getDoc(tableNames.settings,req.churchId,'church') || {id:'church'};
  const next={
    ...old,
    churchName:String(req.body.churchName??old.churchName??'Church').trim(),
    churchNameEn:String(req.body.churchNameEn??req.body.churchName??old.churchNameEn??old.churchName??'Church').trim(),
    churchNameEs:String(req.body.churchNameEs??req.body.churchName??old.churchNameEs??old.churchName??'Iglesia').trim(),
    accentColor:String(req.body.accentColor??old.accentColor??'#2563eb'),
    updatedAt:nowIso()
  };
  if(req.body.logo?.base64){
    const raw=String(req.body.logo.base64).replace(/^data:[^;]+;base64,/, '');
    const buf=Buffer.from(raw,'base64');
    if(buf.length>3*1024*1024) return res.status(413).json({error:'Logo must be 3 MB or smaller',code:'LOGO_TOO_LARGE'});
    const contentType=String(req.body.logo.contentType||'image/png');
    if(!['image/png','image/jpeg','image/webp'].includes(contentType) || !fileSignatureOk(contentType,buf)) return res.status(400).json({error:'Logo must be a valid PNG, JPG, or WEBP file',code:'INVALID_LOGO'});
    const ext=contentType==='image/jpeg'?'jpg':contentType==='image/webp'?'webp':'png';
    const blobName=`${req.churchId}/branding/logo-${Date.now()}.${ext}`;
    next.logo=await uploadBuffer(config.attachmentsContainer,blobName,buf,contentType);
    next.logoUrl='/api/public/church-logo';
  }
  await putDoc(tableNames.settings,req.churchId,'church',next);
  res.json({...next,logoUrl:next.logo?.blobName?'/api/public/church-logo':(next.logoUrl||'')});
});

adminRouter.get('/dashboard',async(req,res)=>{
  const settings=await getDoc(tableNames.settings,req.churchId,'church') || {timezone:'America/Chicago',weekStartsOn:0};
  const w=threeWeekWindow(settings.timezone||'America/Chicago',Number(settings.weekStartsOn??0));
  const [assignments,visitors,petitions,programs]=await Promise.all([
    listDocs(tableNames.assignments,req.churchId,{filter:`dateISO ge '${w.today}'`,max:2000}),
    listDocs(tableNames.visitorContacts,req.churchId,{filter:`status eq 'new'`,max:100}),
    listDocs(tableNames.petitions,req.churchId,{filter:`status eq 'new'`,max:100}),
    listProgramViews(req.churchId,{from:w.start,to:w.end})
  ]);
  const unfilled=assignments.filter(a=>a.status==='unfilled');
  const missingSongs=programs.reduce((sum,p)=>sum+Number(p.readiness?.missingSongs||0),0);
  res.json({window:w,unfilled,missingSongs,newVisitors:visitors.length,newPetitions:petitions.length,programs});
});

adminRouter.get('/people',async(req,res)=>{
  const [members,ministries,services]=await Promise.all([listDocs(tableNames.members,req.churchId),listDocs(tableNames.ministries,req.churchId),listDocs(tableNames.services,req.churchId)]);
  res.json({members:members.sort((a,b)=>a.fullName.localeCompare(b.fullName,'es')),ministries,services});
});

function memberExportRows(members,ministries,services){
  const ministryMap=new Map(ministries.map(x=>[x.id,x.labelEn||x.labelEs||x.label||x.id]));
  const serviceMap=new Map(services.map(x=>[x.id,x.labelEn||x.labelEs||x.label||x.id]));
  return members.sort((a,b)=>String(a.fullName||'').localeCompare(String(b.fullName||''),'es')).map(m=>({
    Name:m.fullName||'',Username:m.username||'',Email:m.email||'',Phone:m.phone||'',EmailNotifications:m.notificationPreferences?.email===false?'No':'Yes',TextNotifications:m.notificationPreferences?.sms===false?'No':'Yes',ChildrenCheckIn:m.childrenProgramEnabled===true?'Yes':'No',Active:m.active===false?'No':'Yes',
    Groups:(m.groups||[]).join('; '),Admin:m.adminAccess===true?'Yes':'No',ChurchAdministrator:m.churchAdministrator===true?'Yes':'No',
    Ministries:(m.ministries||[]).map(id=>ministryMap.get(id)||id).join('; '),
    Services:(m.serviceAvailability||[]).map(id=>serviceMap.get(id)||id).join('; '),
    AssignmentEligibility:(m.assignmentEligibility||[]).join('; '),
    Unavailability:(m.unavailability||[]).map(x=>`${x.from||''}..${x.to||''}${x.note?` (${x.note})`:''}`).join('; '),
    CreatedAt:m.createdAt||'',UpdatedAt:m.updatedAt||''
  }));
}
adminRouter.get('/people/export',async(req,res,next)=>{try{
  const format=String(req.query.format||'csv').toLowerCase();
  const [members,ministries,services]=await Promise.all([listDocs(tableNames.members,req.churchId,{max:10000}),listDocs(tableNames.ministries,req.churchId,{max:5000}),listDocs(tableNames.services,req.churchId,{max:5000})]);
  const rows=memberExportRows(members,ministries,services),stamp=new Date().toISOString().slice(0,10);
  if(format==='csv'){res.type('text/csv');res.setHeader('Content-Disposition',`attachment; filename=members-${stamp}.csv`);return res.send(toCsv(rows));}
  if(format==='xls'||format==='excel'){res.type('application/vnd.ms-excel');res.setHeader('Content-Disposition',`attachment; filename=members-${stamp}.xls`);return res.send(toExcelXml(rows,'Members'));}
  if(format==='pdf'){res.type('application/pdf');res.setHeader('Content-Disposition',`attachment; filename=members-${stamp}.pdf`);return res.send(await toPdf(rows,{title:'Church Scheduler Member Directory'}));}
  res.status(400).json({error:'format must be csv, excel, or pdf'});
}catch(e){next(e);}});

adminRouter.post('/member-access/:id/approve',async(req,res,next)=>{try{
  const request=await getDoc(tableNames.visitorContacts,req.churchId,req.params.id);
  if(!request||request.kind!=='member_access_request')return res.status(404).json({error:'Member access request not found'});
  if(request.status==='rejected')return res.status(409).json({error:'This request has already been rejected.'});
  if(request.memberId){const existing=await getDoc(tableNames.members,req.churchId,request.memberId);return res.json({ok:true,member:existing,alreadyProcessed:true});}
  const all=await listDocs(tableNames.members,req.churchId,{max:10000});
  const email=String(request.email||'').trim().toLowerCase(),phone=String(request.phone||'').replace(/\D/g,'');
  let member=all.find(m=>(email&&String(m.email||'').trim().toLowerCase()===email)||(phone&&String(m.phone||'').replace(/\D/g,'')===phone));
  if(member){
    member={...member,email:member.email||request.email||'',phone:member.phone||request.phone||'',updatedAt:nowIso()};
  }else{
    const id=`m_${crypto.randomUUID().replace(/-/g,'').slice(0,12)}`;
    member={id,fullName:String(request.fullName||`${request.firstName||''} ${request.lastName||''}`).trim(),username:'',email:String(request.email||'').trim(),phone:String(request.phone||'').trim(),active:true,groups:['members'],ministries:[],serviceAvailability:[],assignmentEligibility:[],unavailability:[],allowSameDayMultipleServices:false,adminAccess:false,churchAdministrator:false,notificationPreferences:{sms:true,email:true,push:true},childrenProgramEnabled:false,childrenNotificationPreferences:{sms:true,email:true,push:true},childrenWorkerRoles:[],createdAt:nowIso()};
  }
  await putDoc(tableNames.members,req.churchId,member.id,member,{username:member.username||'',active:member.active!==false,adminAccess:false,churchAdministrator:false});
  request.status='approved';request.memberId=member.id;request.reviewedAt=nowIso();request.reviewedBy=req.identity?.member?.id||req.identity?.user?.memberId||'';
  await putDoc(tableNames.visitorContacts,req.churchId,request.id,request,{status:'approved',createdAt:request.createdAt||''});
  await appendHistory(req.churchId,{eventType:'member_access.approved',memberId:member.id,source:'admin',details:{requestId:request.id,reviewedBy:request.reviewedBy,fullName:member.fullName}});
  res.json({ok:true,member});
}catch(e){next(e);}});
adminRouter.post('/member-access/:id/reject',async(req,res,next)=>{try{
  const request=await getDoc(tableNames.visitorContacts,req.churchId,req.params.id);
  if(!request||request.kind!=='member_access_request')return res.status(404).json({error:'Member access request not found'});
  if(request.memberId||request.status==='approved')return res.status(409).json({error:'This request has already been approved.'});
  request.status='rejected';request.reviewedAt=nowIso();request.reviewedBy=req.identity?.member?.id||req.identity?.user?.memberId||'';request.rejectionReason=String(req.body?.reason||'').trim();
  await putDoc(tableNames.visitorContacts,req.churchId,request.id,request,{status:'rejected',createdAt:request.createdAt||''});
  await appendHistory(req.churchId,{eventType:'member_access.rejected',memberId:request.reviewedBy||'',source:'admin',details:{requestId:request.id,fullName:request.fullName||'',reason:request.rejectionReason}});
  res.json({ok:true});
}catch(e){next(e);}});
adminRouter.post('/people',async(req,res)=>{
  const id=req.body.id || `m_${crypto.randomUUID().replace(/-/g,'').slice(0,12)}`;
  const doc={id,fullName:String(req.body.fullName||'').trim(),username:String(req.body.username||'').trim().toLowerCase(),email:String(req.body.email||'').trim(),phone:String(req.body.phone||'').trim(),active:req.body.active!==false,groups:Array.isArray(req.body.groups)?req.body.groups:['members'],ministries:Array.isArray(req.body.ministries)?req.body.ministries:[],serviceAvailability:Array.isArray(req.body.serviceAvailability)?req.body.serviceAvailability:[],unavailability:Array.isArray(req.body.unavailability)?req.body.unavailability:[],allowSameDayMultipleServices:req.body.allowSameDayMultipleServices===true,adminAccess:false,churchAdministrator:false,notificationPreferences:{sms:true,email:true,push:true},childrenProgramEnabled:req.body.childrenProgramEnabled===true,childrenNotificationPreferences:{sms:true,email:true,push:true},childrenWorkerRoles:[...new Set((Array.isArray(req.body.childrenWorkerRoles)?req.body.childrenWorkerRoles:[]).map(String).filter(x=>['nursery','toddlers'].includes(x)))],createdAt:nowIso()};
  if(!doc.fullName) return res.status(400).json({error:'Name required'});
  await putDoc(tableNames.members,req.churchId,id,doc,{username:doc.username,active:doc.active,adminAccess:false,churchAdministrator:false});
  res.status(201).json(doc);
});
adminRouter.put('/people/:id',async(req,res)=>{
  const old=await getDoc(tableNames.members,req.churchId,req.params.id); if(!old) return res.status(404).json({error:'Member not found'});
  const protectedAdmin={adminAccess:old.adminAccess===true,churchAdministrator:old.churchAdministrator===true};
  const doc={...old,...req.body,id:old.id,username:old.username||'',...protectedAdmin,notificationPreferences:{...(old.notificationPreferences||{}),...(req.body.notificationPreferences||{})},childrenNotificationPreferences:{...(old.childrenNotificationPreferences||{}),...(req.body.childrenNotificationPreferences||{})},childrenWorkerRoles:[...new Set((Array.isArray(req.body.childrenWorkerRoles)?req.body.childrenWorkerRoles:(old.childrenWorkerRoles||[])).map(String).filter(x=>['nursery','toddlers'].includes(x)))],updatedAt:nowIso()};
  await putDoc(tableNames.members,req.churchId,doc.id,doc,{username:doc.username||'',active:doc.active!==false,adminAccess:doc.adminAccess===true,churchAdministrator:doc.churchAdministrator===true});
  if(doc.username){const user=await getDoc(tableNames.users,req.churchId,doc.username);if(user){user.active=doc.active!==false;user.groups=doc.groups||user.groups||[];await putDoc(tableNames.users,req.churchId,user.username,user,{memberId:doc.id,active:user.active,adminAccess:user.adminAccess===true,churchAdministrator:user.churchAdministrator===true});if(!user.active)await destroyAllUserSessions(req.churchId,user.username);}}
  res.json(doc);
});
adminRouter.post('/people/:id/provision-account',async(req,res)=>{
  const member=await getDoc(tableNames.members,req.churchId,req.params.id); if(!member) return res.status(404).json({error:'Member not found'});
  const requesterIsOwner=req.identity?.member?.churchAdministrator===true || req.identity?.user?.churchAdministrator===true;
  if(member.churchAdministrator===true && !requesterIsOwner) return res.status(403).json({error:'Only the Church Administrator can change the Church Administrator account.'});
  const username=String(req.body.username || member.username || '').trim().toLowerCase(); const password=String(req.body.password||'');
  if(!username) return res.status(400).json({error:'Username required'});
  if(password.length<12) return res.status(400).json({error:'Temporary password must be at least 12 characters.'});
  member.username=username; await putDoc(tableNames.members,req.churchId,member.id,member,{username,active:member.active!==false,adminAccess:member.adminAccess===true,churchAdministrator:member.churchAdministrator===true});
  const user={id:username,username,memberId:member.id,active:member.active!==false,groups:member.groups||[],adminAccess:member.adminAccess===true,churchAdministrator:member.churchAdministrator===true,password:await hashPassword(password),mustChangePassword:req.body.mustChangePassword!==false,createdAt:nowIso()};
  await putDoc(tableNames.users,req.churchId,username,user,{memberId:member.id,active:user.active,adminAccess:user.adminAccess,churchAdministrator:user.churchAdministrator});
  await destroyAllUserSessions(req.churchId,username); await securityEvent(req,'account_provisioned',{username,memberId:member.id});
  res.status(201).json({ok:true,username});
});


adminRouter.use('/reports',requireModule('reports'));
adminRouter.get('/reports/catalog',async(req,res)=>res.json(reportCatalog));
adminRouter.get('/reports/:type',async(req,res,next)=>{try{res.json(await buildReport(req.churchId,req.params.type,{from:String(req.query.from||''),to:String(req.query.to||'')}));}catch(e){next(e);}});
adminRouter.get('/reports/:type/export',async(req,res,next)=>{try{const format=String(req.query.format||'pdf').toLowerCase(),report=await buildReport(req.churchId,req.params.type,{from:String(req.query.from||''),to:String(req.query.to||'')}),stamp=new Date().toISOString().slice(0,10),name=`church-${req.params.type}-${stamp}`;await appendHistory(req.churchId,{eventType:'report.exported',memberId:req.identity?.member?.id||'',source:'admin',details:{type:req.params.type,format,from:report.from,to:report.to,rowCount:report.rows.length}});if(format==='csv'){res.type('text/csv');res.setHeader('Content-Disposition',`attachment; filename=${name}.csv`);return res.send(reportCsv(report));}if(format==='xlsx'||format==='excel'){res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');res.setHeader('Content-Disposition',`attachment; filename=${name}.xlsx`);return res.send(await reportXlsx(report));}if(format==='pdf'){res.type('application/pdf');res.setHeader('Content-Disposition',`attachment; filename=${name}.pdf`);return res.send(await reportPdf(report));}return res.status(400).json({error:'format must be csv, xlsx, or pdf'});}catch(e){next(e);}});

adminRouter.use('/children',requireModule('children'));
adminRouter.get('/children',async(req,res)=>{const [children,checkIns,members]=await Promise.all([listDocs(tableNames.children,req.churchId,{max:5000}),listDocs(tableNames.childCheckIns,req.churchId,{max:10000}),listDocs(tableNames.members,req.churchId,{max:10000})]);res.json({children,checkIns:checkIns.sort((a,b)=>String(b.checkInAt||'').localeCompare(String(a.checkInAt||''))),members:members.filter(x=>x.childrenProgramEnabled===true).map(x=>({id:x.id,fullName:x.fullName,email:x.email||'',phone:x.phone||''}))});});
adminRouter.post('/children/check-ins/:id/pickup',async(req,res,next)=>{try{const row=await getDoc(tableNames.childCheckIns,req.churchId,req.params.id);if(!row)return res.status(404).json({error:'Check-in not found'});if(!['checked_in','pickup_requested'].includes(row.status))return res.status(409).json({error:'Child is not currently checked in'});const reason=String(req.body?.overrideReason||'').trim();if(reason.length<10)return res.status(400).json({error:'An override reason of at least 10 characters is required.'});row.status='picked_up';row.pickupAt=nowIso();row.releasedBy=req.identity?.member?.id||'';row.receivedByName=String(req.body?.recipientName||'').trim()||'Administrative override';row.overrideReason=reason;delete row.pickupCodeHash;await putDoc(tableNames.childCheckIns,req.churchId,row.id,row,{memberId:row.memberId,childId:row.childId,status:row.status,dateISO:row.dateISO||'',careArea:row.careArea||''});await appendHistory(req.churchId,{eventType:'children.pickup.override',memberId:row.memberId,dateISO:row.dateISO||'',source:'admin',details:{childId:row.childId,childName:row.childName,checkInId:row.id,releasedBy:row.releasedBy,receivedByName:row.receivedByName,reason}});res.json({ok:true,row});}catch(e){next(e);}});

adminRouter.use('/schedule',requireModule('worship'));
adminRouter.post('/schedule/generate',async(req,res)=>res.json(await generateThreeWeekSchedule(req.churchId,{source:'admin'})));
adminRouter.get('/schedule/programs',async(req,res)=>{
  const settings=await getDoc(tableNames.settings,req.churchId,'church') || {timezone:'America/Chicago',weekStartsOn:0};
  const w=threeWeekWindow(settings.timezone||'America/Chicago',Number(settings.weekStartsOn??0));
  res.json(await listProgramViews(req.churchId,{from:w.start,to:w.end}));
});
adminRouter.get('/history',async(req,res)=>res.json(await listHistory(req.churchId,{from:req.query.from||'',to:req.query.to||'',memberId:req.query.memberId||'',eventType:req.query.eventType||'',max:Number(req.query.max||500)})));
adminRouter.get('/history/export',async(req,res,next)=>{try{const format=String(req.query.format||'csv').toLowerCase();const rows=await auditRows(req.churchId,{from:req.query.from||'',to:req.query.to||'',memberId:req.query.memberId||'',eventType:req.query.eventType||'',max:Number(req.query.max||5000)});const stamp=new Date().toISOString().slice(0,10);if(format==='csv'){res.type('text/csv');res.setHeader('Content-Disposition',`attachment; filename=church-audit-${stamp}.csv`);return res.send(toCsv(rows));}if(format==='xls'||format==='excel'){res.type('application/vnd.ms-excel');res.setHeader('Content-Disposition',`attachment; filename=church-audit-${stamp}.xls`);return res.send(toExcelXml(rows));}if(format==='pdf'){res.type('application/pdf');res.setHeader('Content-Disposition',`attachment; filename=church-audit-${stamp}.pdf`);return res.send(await toPdf(rows));}res.status(400).json({error:'format must be csv, excel, or pdf'});}catch(e){next(e);}});
adminRouter.get('/schedule/assignments/:id/candidates',async(req,res)=>{
  const assignment=await getDoc(tableNames.assignments,req.churchId,req.params.id);
  if(!assignment) return res.status(404).json({error:'Assignment not found'});
  const [{ranking},members]=await Promise.all([
    pickReplacement(req.churchId,assignment,new Set(assignment.currentMemberId?[assignment.currentMemberId]:[])),
    listDocs(tableNames.members,req.churchId,{max:1000})
  ]);
  const eligibleIds=new Set(ranking.map(r=>r.member.id));
  const allActive=members.filter(m=>m.active!==false && m.id!==assignment.currentMemberId).sort((a,b)=>String(a.fullName||'').localeCompare(String(b.fullName||''),'es'));
  res.json({
    assignment,
    candidates:ranking.map(r=>({memberId:r.member.id,fullName:r.member.fullName,score:r.score})),
    overrideCandidates:allActive.map(m=>({memberId:m.id,fullName:m.fullName,eligible:eligibleIds.has(m.id),ministries:m.ministries||[]}))
  });
});
adminRouter.put('/schedule/assignments/:id',async(req,res)=>{
  const assignment=await getDoc(tableNames.assignments,req.churchId,req.params.id);
  if(!assignment) return res.status(404).json({error:'Assignment not found'});
  const memberId=String(req.body.memberId||'');
  if(!memberId) return res.status(400).json({error:'memberId is required'});
  const member=await getDoc(tableNames.members,req.churchId,memberId);
  if(!member || member.active===false) return res.status(400).json({error:'Selected member is not active'});
  const {ranking}=await pickReplacement(req.churchId,assignment,new Set(assignment.currentMemberId?[assignment.currentMemberId]:[]));
  const eligible=ranking.some(r=>r.member.id===memberId);
  const manualOverride=req.body.override===true;
  if(!eligible && !manualOverride) return res.status(409).json({error:'Selected member is not eligible for this ministry/service/date.',code:'MANUAL_OVERRIDE_REQUIRED'});
  const previous=assignment.currentMemberId||'';
  if(!assignment.originalMemberId) assignment.originalMemberId=memberId;
  assignment.currentMemberId=memberId; assignment.assignedAt=nowIso(); assignment.appNotificationAt=assignment.assignedAt; assignment.songIds=[]; assignment.songsUpdatedAt=null; assignment.songsUpdatedBy=null; assignment.status='scheduled'; assignment.locked=req.body.locked!==false; assignment.updatedAt=nowIso();
  await putDoc(tableNames.assignments,req.churchId,assignment.id,assignment,{serviceId:assignment.serviceId,dateISO:assignment.dateISO,status:assignment.status,currentMemberId:memberId,ministryId:assignment.ministryId,programId:assignment.programId});
  await appendHistory(req.churchId,{eventType:manualOverride&&!eligible?'assignment.admin_override':'assignment.admin_reassigned',programId:assignment.programId,assignmentId:assignment.id,assignmentKey:assignment.assignmentKey,ministryId:assignment.ministryId,memberId,dateISO:assignment.dateISO,previousMemberId:previous,newMemberId:memberId,penaltyEligible:false,source:'admin',details:{manualOverride:manualOverride&&!eligible,eligibilityOverridden:manualOverride&&!eligible}});
  await syncProgramStatus(req.churchId,{programId:assignment.programId});
  res.json({...assignment,manualOverride:manualOverride&&!eligible});
});


adminRouter.get('/services',async(req,res)=>res.json({services:await listDocs(tableNames.services,req.churchId),templates:await listDocs(tableNames.templates,req.churchId),ministries:await listDocs(tableNames.ministries,req.churchId)}));
adminRouter.post('/services',async(req,res)=>{
  const id=req.body.id || `svc_${crypto.randomUUID().replace(/-/g,'').slice(0,10)}`; const templateId=`tpl_${id.slice(4)}`;
  const service={id,label:String(req.body.labelEn||req.body.label||req.body.labelEs||'New Service'),labelEn:String(req.body.labelEn||req.body.label||req.body.labelEs||'New Service'),labelEs:String(req.body.labelEs||req.body.label||req.body.labelEn||'Nuevo Servicio'),active:true,startTime:String(req.body.startTime||'10:00'),recurrence:req.body.recurrence||{frequency:'weekly',weekday:0},templateId};
  const template={id:templateId,serviceId:id,label:`${service.label} Program`,items:Array.isArray(req.body.items)?req.body.items:[]};
  await putDoc(tableNames.services,req.churchId,id,service,{active:true,label:service.label}); await putDoc(tableNames.templates,req.churchId,templateId,template,{serviceId:id});
  res.status(201).json({service,template});
});
adminRouter.put('/services/:id',async(req,res)=>{
  const service=await getDoc(tableNames.services,req.churchId,req.params.id); if(!service) return res.status(404).json({error:'Service not found'});
  const next={...service,...req.body,id:service.id,updatedAt:nowIso()}; await putDoc(tableNames.services,req.churchId,next.id,next,{active:next.active!==false,label:next.label}); res.json(next);
});
adminRouter.put('/templates/:id',async(req,res)=>{
  const old=await getDoc(tableNames.templates,req.churchId,req.params.id); if(!old) return res.status(404).json({error:'Template not found'});
  const next={...old,...req.body,id:old.id,updatedAt:nowIso()}; await putDoc(tableNames.templates,req.churchId,next.id,next,{serviceId:next.serviceId}); res.json(next);
});

adminRouter.use('/content',requireModule('publications'));
adminRouter.get('/content',async(req,res)=>res.json(await listDocs(tableNames.content,req.churchId,{max:500})));
adminRouter.post('/content',async(req,res)=>{
  const id=req.body.id || `content_${crypto.randomUUID().replace(/-/g,'').slice(0,12)}`;
  const doc={id,kind:String(req.body.kind||'announcement'),title:String(req.body.titleEs||req.body.title||req.body.titleEn||'').trim(),titleEs:String(req.body.titleEs||req.body.title||'').trim(),titleEn:String(req.body.titleEn||req.body.title||'').trim(),body:String(req.body.bodyEs||req.body.body||req.body.bodyEn||'').trim(),bodyEs:String(req.body.bodyEs||req.body.body||'').trim(),bodyEn:String(req.body.bodyEn||req.body.body||'').trim(),address:String(req.body.address||'').trim(),published:req.body.published!==false,publishedAt:nowIso(),createdAt:nowIso()};
  if(req.body.file?.base64){
    const contentType=String(req.body.file.contentType||'application/octet-stream').toLowerCase();
    if(!['application/pdf','image/jpeg','image/png'].includes(contentType)) return res.status(400).json({error:'Attachments must be PDF, JPG/JPEG, or PNG.',code:'INVALID_ATTACHMENT_TYPE'});
    const raw=String(req.body.file.base64).replace(/^data:[^;]+;base64,/, ''); const buf=Buffer.from(raw,'base64');
    if(buf.length>8*1024*1024) return res.status(413).json({error:'Attachment must be 8 MB or smaller.',code:'ATTACHMENT_TOO_LARGE'});
    if(!fileSignatureOk(contentType,buf)) return res.status(400).json({error:'Attachment contents do not match the allowed PDF/JPG/PNG type.',code:'INVALID_ATTACHMENT_CONTENT'});
    const safeName=String(req.body.file.fileName||'attachment').replace(/[^a-zA-Z0-9._-]/g,'_'); const blobName=`${req.churchId}/${id}/${safeName}`;
    doc.attachment={...(await uploadBuffer(config.attachmentsContainer,blobName,buf,contentType)),fileName:safeName};
  }
  await putDoc(tableNames.content,req.churchId,id,doc,{kind:doc.kind,published:doc.published,publishedAt:doc.publishedAt}); if(doc.kind==='announcement'&&doc.published!==false) await enqueueAnnouncement(req.churchId,doc); res.status(201).json(doc);
});
adminRouter.delete('/content/:id',async(req,res)=>{await deleteDoc(tableNames.content,req.churchId,req.params.id);res.json({ok:true});});

adminRouter.get('/petitions',async(req,res)=>res.json(await listDocs(tableNames.petitions,req.churchId,{max:500})));
adminRouter.use('/visitors',requireModule('visitors'));
adminRouter.get('/visitors',async(req,res)=>res.json(await listDocs(tableNames.visitorContacts,req.churchId,{max:500})));
adminRouter.get('/songs',async(req,res)=>res.json(await listDocs(tableNames.songs,req.churchId,{max:2000})));
adminRouter.post('/songs',async(req,res)=>{
  const id=req.body.id || `song_${crypto.randomUUID().replace(/-/g,'').slice(0,12)}`;
  const doc={id,number:String(req.body.number||'').trim(),title:String(req.body.titleEs||req.body.title||req.body.titleEn||'').trim(),titleEs:String(req.body.titleEs||req.body.title||'').trim(),titleEn:String(req.body.titleEn||req.body.title||'').trim(),active:req.body.active!==false,createdAt:nowIso()};
  if(!doc.title) return res.status(400).json({error:'Song title is required.'});
  await putDoc(tableNames.songs,req.churchId,id,doc,{title:doc.title,number:doc.number,active:doc.active});
  res.status(201).json(doc);
});
adminRouter.put('/songs/:id',async(req,res)=>{
  const old=await getDoc(tableNames.songs,req.churchId,req.params.id);
  if(!old) return res.status(404).json({error:'Song not found'});
  const doc={...old,number:String(req.body.number??old.number??'').trim(),title:String(req.body.titleEs??req.body.title??old.titleEs??old.title??'').trim(),titleEs:String(req.body.titleEs??req.body.title??old.titleEs??old.title??'').trim(),titleEn:String(req.body.titleEn??old.titleEn??old.title??'').trim(),active:req.body.active!==false,updatedAt:nowIso()};
  if(!doc.title) return res.status(400).json({error:'Song title is required.'});
  await putDoc(tableNames.songs,req.churchId,doc.id,doc,{title:doc.title,number:doc.number,active:doc.active});
  res.json(doc);
});
