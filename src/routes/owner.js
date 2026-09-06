import express from 'express';
import { requireOwner } from '../auth/middleware.js';
import { tableNames } from '../config.js';
import { getDoc, putDoc, listDocs, nowIso } from '../storage/repository.js';
import { destroyAllUserSessions } from '../auth/sessions.js';
import { securityEvent } from '../security/audit.js';
import { communicationStatus, sendEmail, sendSms } from '../communications/service.js';

export const ownerRouter=express.Router();
ownerRouter.use(requireOwner);
ownerRouter.get('/advanced',async(req,res)=>res.json(await getDoc(tableNames.settings,req.churchId,'church')));
ownerRouter.put('/advanced',async(req,res)=>{
  const old=await getDoc(tableNames.settings,req.churchId,'church') || {id:'church'};
  const next={...old,...req.body,id:'church',updatedAt:nowIso()};
  await putDoc(tableNames.settings,req.churchId,'church',next); res.json(next);
});
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
ownerRouter.get('/scheduler-audit',async(req,res)=>{
  const rows=await listDocs(tableNames.history,req.churchId,{filter:`eventType eq 'scheduler.decision'`,max:Number(req.query.max||200)});
  res.json(rows.sort((a,b)=>String(b.occurredAt).localeCompare(String(a.occurredAt))));
});

ownerRouter.get('/communications/status',(req,res)=>res.json(communicationStatus()));
ownerRouter.post('/communications/test',async(req,res,next)=>{
  try{
    const channel=String(req.body?.channel||'').toLowerCase();
    if(channel==='email') return res.json(await sendEmail({churchId:req.churchId,to:req.body.to,displayName:req.body.displayName||'',subject:req.body.subject||'Westbury Church of Christ test',text:req.body.message||'Azure Communication Services email is working.'}));
    if(channel==='sms') return res.json(await sendSms({churchId:req.churchId,to:req.body.to,message:req.body.message||'Westbury Church of Christ: Azure Communication Services SMS is working.'}));
    return res.status(400).json({error:'channel must be email or sms'});
  }catch(e){next(e);}
});
