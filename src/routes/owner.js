import express from 'express';
import { requireOwner } from '../auth/middleware.js';
import { tableNames } from '../config.js';
import { getDoc, putDoc, listDocs, nowIso } from '../storage/repository.js';
import { destroyAllUserSessions } from '../auth/sessions.js';
import { securityEvent } from '../security/audit.js';
import { communicationStatus, sendEmail, sendSms, sendPush, lastNotificationResults } from '../communications/service.js';
import { setProgramAdmin, getProgramAdmin, syncProgramStatus } from '../communications/programAdmin.js';
import { appendHistory } from '../scheduler/history.js';
import { parseTabularUpload, importSongs, importMembersAndAssignments, rowsToCsv, rowsToExcelXml, songTemplateRows, memberTemplateRows } from '../services/bulkImport.js';
import { moduleCatalog, moduleState, updateModules } from '../modules/registry.js';

export const ownerRouter=express.Router();
ownerRouter.use(requireOwner);
ownerRouter.get('/advanced',async(req,res)=>res.json(await getDoc(tableNames.settings,req.churchId,'church')));
ownerRouter.put('/advanced',async(req,res)=>{
  const old=await getDoc(tableNames.settings,req.churchId,'church') || {id:'church'};
  const next={...old,...req.body,id:'church',updatedAt:nowIso()};
  await putDoc(tableNames.settings,req.churchId,'church',next); res.json(next);
});
ownerRouter.get('/modules',async(req,res)=>res.json({catalog:moduleCatalog,state:await moduleState(req.churchId)}));
ownerRouter.put('/modules',async(req,res,next)=>{try{const state=await updateModules(req.churchId,req.body?.modules,req.identity?.member?.id||'');await appendHistory(req.churchId,{eventType:'modules.updated',memberId:req.identity?.member?.id||'',source:'church_administrator',details:{modules:state}});res.json({ok:true,state});}catch(e){next(e);}});
ownerRouter.put('/people/:id/admin-access',async(req,res)=>{
  const member=await getDoc(tableNames.members,req.churchId,req.params.id); if(!member) return res.status(404).json({error:'Member not found'});
  if(member.churchAdministrator===true && req.body.adminAccess===false) return res.status(409).json({error:'Transfer Church Administrator ownership before removing this access.'});
  member.adminAccess=req.body.adminAccess===true; member.updatedAt=nowIso();
  await putDoc(tableNames.members,req.churchId,member.id,member,{username:member.username||'',active:member.active!==false,adminAccess:member.adminAccess,churchAdministrator:member.churchAdministrator===true});
  if(member.username){
    const user=await getDoc(tableNames.users,req.churchId,member.username);
    if(user){user.adminAccess=member.adminAccess; await putDoc(tableNames.users,req.churchId,user.username,user,{memberId:member.id,active:user.active!==false,adminAccess:user.adminAccess,churchAdministrator:user.churchAdministrator===true});await destroyAllUserSessions(req.churchId,user.username);await securityEvent(req,'admin_access_changed',{username:user.username,memberId:member.id,adminAccess:member.adminAccess});}
  }
  res.json({ok:true,adminAccess:member.adminAccess});
});

ownerRouter.get('/program-admin',async(req,res)=>{
  const [current,members]=await Promise.all([
    getProgramAdmin(req.churchId),
    listDocs(tableNames.members,req.churchId,{max:3000})
  ]);
  const admins=members.filter(m=>m.active!==false&&(m.adminAccess===true||m.churchAdministrator===true)).sort((a,b)=>String(a.fullName||'').localeCompare(String(b.fullName||''),'es'));
  res.json({current:current?{id:current.id,fullName:current.fullName,email:current.email||'',phone:current.phone||''}:null,admins:admins.map(m=>({id:m.id,fullName:m.fullName,email:m.email||'',phone:m.phone||'',churchAdministrator:m.churchAdministrator===true}))});
});
ownerRouter.put('/program-admin',async(req,res)=>{
  const member=await setProgramAdmin(req.churchId,String(req.body?.memberId||''),req.identity?.member?.id||'');
  await syncProgramStatus(req.churchId);
  res.json({ok:true,current:{id:member.id,fullName:member.fullName,email:member.email||'',phone:member.phone||''}});
});

ownerRouter.get('/scheduler-audit',async(req,res)=>{
  const rows=await listDocs(tableNames.history,req.churchId,{filter:`eventType eq 'scheduler.decision'`,max:Number(req.query.max||200)});
  res.json(rows.sort((a,b)=>String(b.occurredAt).localeCompare(String(a.occurredAt))));
});

ownerRouter.get('/communications/status',async(req,res)=>{const lastResults=await lastNotificationResults(req.churchId,50);const lastTestResult=lastResults.find(r=>r.metadata?.type==='admin.test')||null;res.json({...communicationStatus(),lastTestResult,lastResults:lastResults.slice(0,10)});});
ownerRouter.get('/communications/members',async(req,res)=>{const members=(await listDocs(tableNames.members,req.churchId,{max:3000})).filter(m=>m.active!==false&&(m.email||m.phone)).sort((a,b)=>String(a.fullName||'').localeCompare(String(b.fullName||''),'es'));res.json(members.map(m=>({id:m.id,fullName:m.fullName,email:m.email||'',phone:m.phone||''})));});
ownerRouter.get('/communications/logs',async(req,res)=>res.json(await lastNotificationResults(req.churchId,Number(req.query.max||100))));
ownerRouter.post('/communications/test',async(req,res,next)=>{
  try{
    const channel=String(req.body?.channel||'').toLowerCase(),memberId=String(req.body?.memberId||'');
    const member=memberId?await getDoc(tableNames.members,req.churchId,memberId):null;
    if(!member)return res.status(400).json({error:'Select an active member to test.'});
    const eventKey=`admin-test:${channel}:${Date.now()}`;
    if(channel==='email'){if(!member.email)return res.status(400).json({error:'Selected member does not have an email address.'});const church=await getDoc(tableNames.settings,req.churchId,'church')||{};const churchName=church.churchName||'Church';return res.json(await sendEmail({churchId:req.churchId,to:member.email,displayName:member.fullName||'',subject:req.body.subject||`${churchName} test`,text:req.body.message||'Azure Communication Services email is working.',eventKey,memberId:member.id,metadata:{type:'admin.test',requestedBy:req.identity?.member?.id||''}}));}
    if(channel==='push'){return res.json(await sendPush({churchId:req.churchId,memberId:member.id,title:req.body.subject||'Westbury Church Hub',message:req.body.message||'Native push notifications are working.',eventKey,metadata:{type:'admin.test',requestedBy:req.identity?.member?.id||'',route:'home'}}));}
    if(channel==='sms'){if(!member.phone)return res.status(400).json({error:'Selected member does not have a phone number.'});const church=await getDoc(tableNames.settings,req.churchId,'church')||{};const churchName=church.churchName||'Church';let phone=String(member.phone).replace(/[^\d+]/g,'');if(!phone.startsWith('+'))phone=phone.length===10?`+1${phone}`:`+${phone}`;return res.json(await sendSms({churchId:req.churchId,to:phone,message:req.body.message||`${churchName}: Azure Communication Services SMS is working.`,eventKey,memberId:member.id,metadata:{type:'admin.test',requestedBy:req.identity?.member?.id||''}}));}
    return res.status(400).json({error:'channel must be email, sms or push'});
  }catch(e){next(e);}
});


function decodeImportFile(file){
  if(!file?.base64) throw Object.assign(new Error('Select a CSV or Excel file.'),{statusCode:400});
  const raw=String(file.base64).replace(/^data:[^;]+;base64,/, '');
  const buffer=Buffer.from(raw,'base64');
  if(buffer.length>8*1024*1024) throw Object.assign(new Error('Import file must be 8 MB or smaller.'),{statusCode:413});
  return {fileName:String(file.fileName||'import.csv'),contentType:String(file.contentType||''),buffer};
}
function sendTableExport(res,{rows,format,name,sheetName}){
  if(format==='csv'){res.type('text/csv');res.setHeader('Content-Disposition',`attachment; filename=${name}.csv`);return res.send(rowsToCsv(rows));}
  if(format==='excel'||format==='xls'){res.type('application/vnd.ms-excel');res.setHeader('Content-Disposition',`attachment; filename=${name}.xls`);return res.send(rowsToExcelXml(rows,sheetName));}
  return res.status(400).json({error:'format must be csv or excel'});
}
ownerRouter.get('/songs/export',async(req,res)=>{
  const songs=(await listDocs(tableNames.songs,req.churchId,{max:10000})).sort((a,b)=>Number(a.number||0)-Number(b.number||0));
  const rows=songs.map(s=>({Number:s.number||'','Title Spanish':s.titleEs||s.title||'','Title English':s.titleEn||'',Active:s.active===false?'No':'Yes'}));
  return sendTableExport(res,{rows,format:String(req.query.format||'csv').toLowerCase(),name:'songs',sheetName:'Songs'});
});
ownerRouter.get('/songs/template',(req,res)=>sendTableExport(res,{rows:songTemplateRows(),format:String(req.query.format||'csv').toLowerCase(),name:'songs-import-template',sheetName:'Songs'}));
ownerRouter.post('/songs/import',async(req,res,next)=>{try{const file=decodeImportFile(req.body?.file);const rows=await parseTabularUpload(file);const result=await importSongs(req.churchId,rows);await securityEvent(req,'songs_bulk_import',{...result,fileName:file.fileName});await appendHistory(req.churchId,{eventType:'bulk_import.songs',memberId:req.identity?.member?.id||'',source:'church_administrator',details:{...result,fileName:file.fileName}});res.json({ok:true,...result});}catch(e){next(e);}});
ownerRouter.get('/members/template',(req,res)=>sendTableExport(res,{rows:memberTemplateRows(),format:String(req.query.format||'csv').toLowerCase(),name:'members-service-assignments-template',sheetName:'Members'}));
ownerRouter.post('/members/import',async(req,res,next)=>{try{const file=decodeImportFile(req.body?.file);const rows=await parseTabularUpload(file);const result=await importMembersAndAssignments(req.churchId,rows);await securityEvent(req,'members_assignments_bulk_import',{...result,fileName:file.fileName});await appendHistory(req.churchId,{eventType:'bulk_import.members_assignments',memberId:req.identity?.member?.id||'',source:'church_administrator',details:{...result,fileName:file.fileName}});res.json({ok:true,...result});}catch(e){next(e);}});
