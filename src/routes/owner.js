import express from 'express';
import { requireOwner } from '../auth/middleware.js';
import { tableNames } from '../config.js';
import { getDoc, putDoc, listDocs, nowIso } from '../storage/repository.js';

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
    if(user){user.adminAccess=member.adminAccess; await putDoc(tableNames.users,req.churchId,user.username,user,{memberId:member.id,active:user.active!==false,adminAccess:user.adminAccess,churchAdministrator:user.churchAdministrator===true});}
  }
  res.json({ok:true,adminAccess:member.adminAccess});
});
ownerRouter.get('/scheduler-audit',async(req,res)=>{
  const rows=await listDocs(tableNames.history,req.churchId,{filter:`eventType eq 'scheduler.decision'`,max:Number(req.query.max||200)});
  res.json(rows.sort((a,b)=>String(b.occurredAt).localeCompare(String(a.occurredAt))));
});
