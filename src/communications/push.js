import crypto from 'node:crypto';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { config, tableNames } from '../config.js';
import { listDocs, putDoc, nowIso } from '../storage/repository.js';

let app;
function credentialObject(){
  if(!config.firebaseServiceAccountJsonBase64) return null;
  try{return JSON.parse(Buffer.from(config.firebaseServiceAccountJsonBase64,'base64').toString('utf8'));}
  catch{throw new Error('Firebase service account secret is invalid.');}
}
function firebaseApp(){
  if(app) return app;
  const serviceAccount=credentialObject();
  if(!config.firebaseProjectId || !serviceAccount) throw new Error('Firebase push is not configured.');
  app=getApps()[0] || initializeApp({credential:cert(serviceAccount),projectId:config.firebaseProjectId});
  return app;
}
export function pushStatus(){return {enabled:Boolean(config.firebaseProjectId&&config.firebaseServiceAccountJsonBase64),projectId:config.firebaseProjectId||null,platform:'android-fcm'};}
export function pushDeviceId(token){return `push_${crypto.createHash('sha256').update(String(token)).digest('hex').slice(0,32)}`;}
export async function upsertPushDevice(churchId,member,{token,platform='android',deviceName=''}){
  const value=String(token||'').trim(); if(!value) throw Object.assign(new Error('Push token is required.'),{statusCode:400});
  if(!['android'].includes(String(platform))) throw Object.assign(new Error('Unsupported push platform.'),{statusCode:400});
  const id=pushDeviceId(value),now=nowIso();
  const row={id,memberId:member.id,token:value,platform:String(platform),deviceName:String(deviceName||'').slice(0,100),active:true,createdAt:now,updatedAt:now,lastSeenAt:now};
  await putDoc(tableNames.pushDevices,churchId,id,row,{memberId:member.id,platform:row.platform,active:true,lastSeenAt:now});
  return {id,platform:row.platform,active:true};
}
export async function deactivatePushDevice(churchId,memberId,token){
  const id=pushDeviceId(token),rows=await listDocs(tableNames.pushDevices,churchId,{filter:`memberId eq '${String(memberId).replace(/'/g,"''")}'`,max:100});
  const row=rows.find(x=>x.id===id); if(!row)return false;row.active=false;row.updatedAt=nowIso();await putDoc(tableNames.pushDevices,churchId,id,row,{memberId:row.memberId,platform:row.platform,active:false,lastSeenAt:row.lastSeenAt||''});return true;
}
export async function listMemberPushDevices(churchId,memberId){return (await listDocs(tableNames.pushDevices,churchId,{filter:`memberId eq '${String(memberId).replace(/'/g,"''")}'`,max:100})).filter(x=>x.active!==false&&x.token);}
export async function sendPushToMember({churchId,memberId,title,body,data={}}){
  const devices=await listMemberPushDevices(churchId,memberId); if(!devices.length) throw Object.assign(new Error('Selected member does not have a registered Android device.'),{statusCode:400,code:'NO_PUSH_DEVICE'});
  const tokens=[...new Set(devices.map(d=>d.token).filter(Boolean))].slice(0,500);
  const result=await getMessaging(firebaseApp()).sendEachForMulticast({tokens,notification:{title:String(title||'Westbury Church Hub').slice(0,120),body:String(body||'').slice(0,500)},data:Object.fromEntries(Object.entries(data||{}).map(([k,v])=>[String(k),String(v??'')]))});
  const responses=result.responses.map((r,i)=>({success:r.success,messageId:r.messageId||'',errorCode:String(r.error?.code||''),errorMessage:String(r.error?.message||'').slice(0,300),deviceId:devices.find(d=>d.token===tokens[i])?.id||''}));
  console.log('[NOTIFY][PUSH]',JSON.stringify({churchId,memberId,deviceCount:devices.length,tokenCount:tokens.length,successCount:result.successCount,failureCount:result.failureCount,responses:responses.map(r=>({success:r.success,messageId:r.messageId,errorCode:r.errorCode}))}));
  for(let i=0;i<result.responses.length;i++) if(!result.responses[i].success){const code=String(result.responses[i].error?.code||'');if(['messaging/registration-token-not-registered','messaging/invalid-registration-token'].includes(code)){const row=devices.find(d=>d.token===tokens[i]);if(row){row.active=false;row.updatedAt=nowIso();await putDoc(tableNames.pushDevices,churchId,row.id,row,{memberId:row.memberId,platform:row.platform,active:false,lastSeenAt:row.lastSeenAt||''});}}}
  return {ok:result.successCount>0,successCount:result.successCount,failureCount:result.failureCount,deviceCount:devices.length,messageIds:responses.filter(r=>r.success&&r.messageId).map(r=>r.messageId),errors:responses.filter(r=>!r.success).map(r=>({code:r.errorCode,message:r.errorMessage,deviceId:r.deviceId}))};
}
