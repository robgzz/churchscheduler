import { config, tableNames } from '../config.js';
import { readSession, SESSION_COOKIE } from './sessions.js';
import { getDoc } from '../storage/repository.js';

export async function attachIdentity(req, res, next){
  try {
    const churchId = String(req.headers['x-church-id'] || config.churchId);
    req.churchId = churchId;
    const token = req.cookies?.[SESSION_COOKIE];
    const session = await readSession(churchId, token);
    if (!session) { req.identity = null; return next(); }
    const user = await getDoc(tableNames.users, churchId, session.username);
    if (!user || user.active === false) { req.identity = null; return next(); }
    const member = user.memberId ? await getDoc(tableNames.members, churchId, user.memberId) : null;
    req.identity = { user, member, session };
    next();
  } catch (e) { next(e); }
}

export function requireLogin(req, res, next){
  if (!req.identity) return res.status(401).json({ error:'Authentication required' });
  next();
}
export function requireGroup(group){
  return (req,res,next) => {
    if (!req.identity) return res.status(401).json({error:'Authentication required'});
    const groups = req.identity.member?.groups || req.identity.user?.groups || [];
    if (!groups.includes(group)) return res.status(403).json({error:'Access denied'});
    next();
  };
}
export function requireAdmin(req,res,next){
  if (!req.identity) return res.status(401).json({error:'Authentication required'});
  const allowed = req.identity.member?.adminAccess === true || req.identity.user?.adminAccess === true || req.identity.user?.churchAdministrator === true;
  if (!allowed) return res.status(403).json({error:'Admin access required'});
  next();
}
export function requireOwner(req,res,next){
  if (!req.identity) return res.status(401).json({error:'Authentication required'});
  const allowed = req.identity.member?.churchAdministrator === true || req.identity.user?.churchAdministrator === true;
  if (!allowed) return res.status(403).json({error:'Church Administrator access required'});
  next();
}
