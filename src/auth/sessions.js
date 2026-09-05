import crypto from 'node:crypto';
import { tableNames, config } from '../config.js';
import { createDoc, getDoc, deleteDoc, nowIso } from '../storage/repository.js';

export const SESSION_COOKIE = 'church_session';
function tokenHash(token){ return crypto.createHash('sha256').update(token).digest('hex'); }

export async function createSession(churchId, user){
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + config.sessionDays * 86400000).toISOString();
  const doc = {
    id: tokenHash(token), churchId, userId:user.id, username:user.username,
    memberId:user.memberId || null, createdAt:nowIso(), expiresAt
  };
  await createDoc(tableNames.sessions, churchId, doc.id, doc, { expiresAt });
  return { token, expiresAt };
}

export async function readSession(churchId, token){
  if (!token) return null;
  const id = tokenHash(token);
  const doc = await getDoc(tableNames.sessions, churchId, id);
  if (!doc) return null;
  if (Date.parse(doc.expiresAt) <= Date.now()) {
    await deleteDoc(tableNames.sessions, churchId, id).catch(()=>{});
    return null;
  }
  return doc;
}

export async function destroySession(churchId, token){
  if (!token) return;
  await deleteDoc(tableNames.sessions, churchId, tokenHash(token));
}

export function setSessionCookie(res, token, expiresAt){
  res.cookie(SESSION_COOKIE, token, {
    httpOnly:true, secure:config.cookieSecure, sameSite:'lax', path:'/', expires:new Date(expiresAt)
  });
}
export function clearSessionCookie(res){
  res.clearCookie(SESSION_COOKIE, { httpOnly:true, secure:config.cookieSecure, sameSite:'lax', path:'/' });
}
