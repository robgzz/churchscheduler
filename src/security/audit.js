import { appendHistory } from '../scheduler/history.js';
export async function securityEvent(req,eventType,details={}){
  try{
    await appendHistory(req.churchId,{eventType:`security.${eventType}`,memberId:req.identity?.member?.id||null,details:{ip:req.ip||'',userAgent:String(req.get('user-agent')||'').slice(0,240),...details}});
  }catch(e){ console.error('Security audit logging failed',e?.message||e); }
}
