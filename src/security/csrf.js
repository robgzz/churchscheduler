import crypto from 'node:crypto';

export function newCsrfToken(){ return crypto.randomBytes(32).toString('base64url'); }
function safeEqual(a,b){
  const aa=Buffer.from(String(a||'')); const bb=Buffer.from(String(b||''));
  return aa.length===bb.length && crypto.timingSafeEqual(aa,bb);
}
export function requireCsrf(req,res,next){
  if(!['POST','PUT','PATCH','DELETE'].includes(req.method)) return next();
  if(!req.identity?.session) return next();
  const supplied=req.get('X-CSRF-Token');
  if(!supplied || !safeEqual(supplied,req.identity.session.csrfToken)) return res.status(403).json({error:'Security token validation failed. Refresh the app and try again.',code:'CSRF_FAILED'});
  next();
}
export function sameOriginWrite(req,res,next){
  if(!['POST','PUT','PATCH','DELETE'].includes(req.method)) return next();
  const origin=req.get('Origin');
  if(!origin) return next();
  try{
    const expected=`${req.protocol}://${req.get('host')}`;
    if(new URL(origin).origin!==new URL(expected).origin) return res.status(403).json({error:'Cross-site request blocked.',code:'ORIGIN_BLOCKED'});
  }catch{return res.status(403).json({error:'Invalid request origin.',code:'ORIGIN_BLOCKED'});}
  next();
}
