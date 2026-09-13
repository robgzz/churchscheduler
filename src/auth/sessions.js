import crypto from 'node:crypto';
import { tableNames, config } from '../config.js';
import { createDoc, getDoc, deleteDoc, listDocs, putDoc, nowIso } from '../storage/repository.js';
import { newCsrfToken } from '../security/csrf.js';

export const SESSION_COOKIE = config.cookieSecure ? '__Host-westbury_session' : 'church_session';
function tokenHash(token){ return crypto.createHash('sha256').update(token).digest('hex'); }

export async function createSession(churchId, user){
  const token = crypto.randomBytes(32).toString('base64url');
  const now=Date.now();
  const expiresAt = new Date(now + config.sessionDays * 86400000).toISOString();
  const idleExpiresAt = new Date(now + config.sessionIdleDays * 86400000).toISOString();
  const doc = {
    id: tokenHash(token), churchId, userId:user.id, username:user.username,
    memberId:user.memberId || null, csrfToken:newCsrfToken(), createdAt:nowIso(), lastSeenAt:nowIso(), idleExpiresAt, expiresAt
  };
  await createDoc(tableNames.sessions, churchId, doc.id, doc, { expiresAt });
  return { token, expiresAt, csrfToken:doc.csrfToken };
}

export async function readSession(churchId, token){
  if (!token) return null;
  const id = tokenHash(token);
  const doc = await getDoc(tableNames.sessions, churchId, id);
  if (!doc) return null;
  const t=Date.now();
  if (Date.parse(doc.expiresAt) <= t || (doc.idleExpiresAt && Date.parse(doc.idleExpiresAt)<=t)) {
    await deleteDoc(tableNames.sessions, churchId, id).catch(()=>{});
    return null;
  }
  const last=Date.parse(doc.lastSeenAt||doc.createdAt||0);
  if(!last||t-last>24*60*60*1000){doc.lastSeenAt=nowIso();doc.idleExpiresAt=new Date(t+config.sessionIdleDays*86400000).toISOString();await putDoc(tableNames.sessions,churchId,id,doc,{expiresAt:doc.expiresAt}).catch(()=>{});}
  return doc;
}

export async function destroySession(churchId, token){if (!token) return;await deleteDoc(tableNames.sessions, churchId, tokenHash(token));}
export function setSessionCookie(res, token, expiresAt){res.cookie(SESSION_COOKIE, token,{httpOnly:true,secure:config.cookieSecure,sameSite:'lax',path:'/',expires:new Date(expiresAt)});}
export function clearSessionCookie(res){res.clearCookie(SESSION_COOKIE,{httpOnly:true,secure:config.cookieSecure,sameSite:'lax',path:'/'});}
export async function destroyAllUserSessions(churchId, username){const sessions=await listDocs(tableNames.sessions,churchId,{max:5000});await Promise.all(sessions.filter(s=>s.username===username).map(s=>deleteDoc(tableNames.sessions,churchId,s.id).catch(()=>{})));}
