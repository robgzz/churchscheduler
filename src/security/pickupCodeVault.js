import crypto from 'node:crypto';
import { config } from '../config.js';
import { putDoc, nowIso } from '../storage/repository.js';
import { tableNames } from '../config.js';
import { appendHistory } from '../scheduler/history.js';

function keyBuffer(){
  const raw=String(config.pickupCodeEncryptionKey||'').trim();
  if(!raw)return null;
  try{
    const b=Buffer.from(raw,'base64');
    if(b.length===32)return b;
  }catch{}
  return crypto.createHash('sha256').update(raw).digest();
}
export function pickupCodeRecoveryConfigured(){return !!keyBuffer();}
export function encryptPickupCode(code){
  const key=keyBuffer();
  if(!key)return '';
  const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
  const encrypted=Buffer.concat([cipher.update(String(code),'utf8'),cipher.final()]),tag=cipher.getAuthTag();
  return Buffer.concat([iv,tag,encrypted]).toString('base64url');
}
export function decryptPickupCode(value){
  const key=keyBuffer();
  if(!key||!value)return '';
  try{
    const data=Buffer.from(String(value),'base64url');
    if(data.length<29)return '';
    const iv=data.subarray(0,12),tag=data.subarray(12,28),body=data.subarray(28),decipher=crypto.createDecipheriv('aes-256-gcm',key,iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(body),decipher.final()]).toString('utf8');
  }catch{return '';}
}
function codeHash(churchId,checkInId,code){return crypto.createHash('sha256').update(`${churchId}|${checkInId}|${code}`).digest('hex');}
export async function recoverOrRotatePickupCode(churchId,row,actorMemberId){
  if(!row||row.memberId!==actorMemberId)throw Object.assign(new Error('Pickup code is available only to the parent/guardian account for this active check-in.'),{statusCode:403,code:'PICKUP_CODE_FORBIDDEN'});
  if(!['checked_in','pickup_requested'].includes(row.status))throw Object.assign(new Error('There is no active pickup code for this child.'),{statusCode:409,code:'PICKUP_CODE_INACTIVE'});
  const current=decryptPickupCode(row.pickupCodeEncrypted);
  if(current)return {code:current,rotated:false,row};
  const code=String(crypto.randomInt(100000,1000000));
  row.pickupCodeHash=codeHash(churchId,row.id,code);
  row.pickupCodeEncrypted=encryptPickupCode(code);
  row.pickupCodeRotatedAt=nowIso();
  row.pickupCodeAttempts=0;
  await putDoc(tableNames.childCheckIns,churchId,row.id,row,{memberId:row.memberId,childId:row.childId,status:row.status,dateISO:row.dateISO||'',careArea:row.careArea||''});
  await appendHistory(churchId,{eventType:'children.pickup_code.rotated',memberId:actorMemberId,dateISO:row.dateISO||'',source:'chat-hub',details:{childId:row.childId,checkInId:row.id}});
  return {code,rotated:true,row};
}
