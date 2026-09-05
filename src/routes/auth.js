import express from 'express';
import { tableNames } from '../config.js';
import { getDoc, putDoc, nowIso } from '../storage/repository.js';
import { verifyPassword, hashPassword } from '../auth/password.js';
import { createSession, destroySession, setSessionCookie, clearSessionCookie, SESSION_COOKIE } from '../auth/sessions.js';
import { requireLogin } from '../auth/middleware.js';

export const authRouter=express.Router();
authRouter.post('/login',async(req,res)=>{
  const username=String(req.body.username||'').trim().toLowerCase();
  const user=await getDoc(tableNames.users,req.churchId,username);
  if(!user || user.active===false || !await verifyPassword(String(req.body.password||''),user.password)) return res.status(401).json({error:'Invalid username or password.'});
  const session=await createSession(req.churchId,user); setSessionCookie(res,session.token,session.expiresAt);
  const member=user.memberId?await getDoc(tableNames.members,req.churchId,user.memberId):null;
  res.json({ok:true,user:safeUser(user),member});
});
authRouter.post('/logout',async(req,res)=>{
  await destroySession(req.churchId,req.cookies?.[SESSION_COOKIE]).catch(()=>{}); clearSessionCookie(res); res.json({ok:true});
});
authRouter.get('/me',requireLogin,(req,res)=>res.json({user:safeUser(req.identity.user),member:req.identity.member}));
authRouter.post('/change-password',requireLogin,async(req,res)=>{
  const current=String(req.body.currentPassword||'');
  const next=String(req.body.newPassword||'');
  const user=await getDoc(tableNames.users,req.churchId,req.identity.user.username);
  if(!user || !await verifyPassword(current,user.password)) return res.status(400).json({error:'Current password is incorrect.'});
  if(next.length<10) return res.status(400).json({error:'New password must be at least 10 characters.'});
  user.password=await hashPassword(next);
  user.mustChangePassword=false;
  user.passwordChangedAt=nowIso();
  await putDoc(tableNames.users,req.churchId,user.username,user,{memberId:user.memberId||'',active:user.active!==false,adminAccess:user.adminAccess===true,churchAdministrator:user.churchAdministrator===true});
  res.json({ok:true});
});

function safeUser(u){const {password,...safe}=u; return safe;}
