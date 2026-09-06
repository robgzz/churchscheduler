import express from 'express';
import crypto from 'node:crypto';
import { config, tableNames } from '../config.js';
import { bootstrapSummary } from '../services/seed.js';
import { listDocs, getDoc, putDoc, nowIso } from '../storage/repository.js';
import { hashPassword } from '../auth/password.js';
import { createSession, setSessionCookie } from '../auth/sessions.js';
import { setupLimiter } from '../security/rateLimit.js';
import { securityEvent } from '../security/audit.js';

export const setupRouter=express.Router();

function safeEqual(a,b){
  const aa=Buffer.from(String(a||'')),bb=Buffer.from(String(b||''));
  return aa.length===bb.length && crypto.timingSafeEqual(aa,bb);
}

setupRouter.get('/status',async(req,res)=>res.json(await bootstrapSummary(req.churchId)));
setupRouter.post('/owner',setupLimiter,async(req,res)=>{
  const summary=await bootstrapSummary(req.churchId);
  if(summary.ownerConfigured) return res.status(409).json({error:'Church Administrator is already configured.'});
  if(!config.bootstrapCode || !safeEqual(req.body.bootstrapCode,config.bootstrapCode)) return res.status(403).json({error:'Invalid bootstrap code.'});
  const username=String(req.body.username || config.initialOwnerUsername).trim().toLowerCase();
  const password=String(req.body.password || '');
  if(password.length<12) return res.status(400).json({error:'Password must be at least 12 characters.'});
  const members=await listDocs(tableNames.members,req.churchId);
  let member=members.find(m=>String(m.username||'').toLowerCase()===username);
  if(!member){
    const id=`m_${crypto.randomUUID().replace(/-/g,'').slice(0,12)}`;
    member={id,fullName:String(req.body.fullName||username),username,email:String(req.body.email||''),phone:'',active:true,groups:['members'],ministries:[],serviceAvailability:[],unavailability:[],adminAccess:true,churchAdministrator:true,allowSameDayMultipleServices:false,createdAt:nowIso()};
  } else {
    member.adminAccess=true; member.churchAdministrator=true; member.active=true; member.groups=[...new Set([...(member.groups||[]),'members'])]; member.updatedAt=nowIso();
  }
  await putDoc(tableNames.members,req.churchId,member.id,member,{username:member.username||'',active:true,adminAccess:true,churchAdministrator:true});
  const pw=await hashPassword(password);
  const user={id:username,username,memberId:member.id,active:true,groups:member.groups,adminAccess:true,churchAdministrator:true,password:pw,createdAt:nowIso(),mustChangePassword:false};
  await putDoc(tableNames.users,req.churchId,username,user,{memberId:member.id,active:true,adminAccess:true,churchAdministrator:true});
  const session=await createSession(req.churchId,user); setSessionCookie(res,session.token,session.expiresAt);
  await securityEvent(req,'owner_bootstrapped',{username}); res.status(201).json({ok:true,user:{username,memberId:member.id,churchAdministrator:true},csrfToken:session.csrfToken});
});
