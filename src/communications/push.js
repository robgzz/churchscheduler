import crypto from 'node:crypto';
import http2 from 'node:http2';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { config, tableNames } from '../config.js';
import { listDocs, putDoc, nowIso } from '../storage/repository.js';

let firebase;
let cachedApnsJwt={token:'',expiresAt:0};

function credentialObject(){
  if(!config.firebaseServiceAccountJsonBase64) return null;
  try{return JSON.parse(Buffer.from(config.firebaseServiceAccountJsonBase64,'base64').toString('utf8'));}
  catch{throw new Error('Firebase service account secret is invalid.');}
}
function firebaseApp(){
  if(firebase) return firebase;
  const serviceAccount=credentialObject();
  if(!config.firebaseProjectId || !serviceAccount) throw new Error('Firebase push is not configured.');
  firebase=getApps()[0] || initializeApp({credential:cert(serviceAccount),projectId:config.firebaseProjectId});
  return firebase;
}
function apnsConfigured(){return Boolean(config.apnsEnabled&&config.apnsTeamId&&config.apnsKeyId&&config.apnsBundleId&&config.apnsPrivateKeyBase64);}
function base64url(value){return Buffer.from(value).toString('base64url');}
function apnsPrivateKey(){
  try{return Buffer.from(config.apnsPrivateKeyBase64,'base64').toString('utf8');}
  catch{throw new Error('APNs private key secret is invalid.');}
}
function apnsJwt(){
  if(cachedApnsJwt.token&&cachedApnsJwt.expiresAt>Date.now()+60_000)return cachedApnsJwt.token;
  if(!apnsConfigured())throw new Error('Apple push is not configured.');
  const header=base64url(JSON.stringify({alg:'ES256',kid:config.apnsKeyId}));
  const iat=Math.floor(Date.now()/1000);
  const payload=base64url(JSON.stringify({iss:config.apnsTeamId,iat}));
  const unsigned=`${header}.${payload}`;
  const signature=crypto.sign('sha256',Buffer.from(unsigned),{key:apnsPrivateKey(),dsaEncoding:'ieee-p1363'}).toString('base64url');
  cachedApnsJwt={token:`${unsigned}.${signature}`,expiresAt:Date.now()+50*60_000};
  return cachedApnsJwt.token;
}
function apnsHost(environment){return environment==='sandbox'?'https://api.sandbox.push.apple.com':'https://api.push.apple.com';}
function apnsRequest(token,{title,body,data,environment}){
  return new Promise((resolve,reject)=>{
    let settled=false;
    const client=http2.connect(apnsHost(environment));
    const finish=(fn,value)=>{if(settled)return;settled=true;try{client.close();}catch{}fn(value);};
    client.setTimeout(10_000,()=>finish(reject,new Error('APNs connection timed out.')));
    client.on('error',err=>finish(reject,err));
    const req=client.request({
      ':method':'POST',
      ':path':`/3/device/${String(token)}`,
      authorization:`bearer ${apnsJwt()}`,
      'apns-topic':config.apnsBundleId,
      'apns-push-type':'alert',
      'apns-priority':'10'
    });
    let status=0,responseBody='',apnsId='';
    req.setEncoding('utf8');
    req.on('response',headers=>{status=Number(headers[':status']||0);apnsId=String(headers['apns-id']||'');});
    req.on('data',chunk=>{responseBody+=chunk;});
    req.on('end',()=>{
      let reason='';try{reason=responseBody?JSON.parse(responseBody).reason||'':'';}catch{}
      finish(resolve,{success:status===200,status,reason,apnsId,environment});
    });
    req.on('error',err=>finish(reject,err));
    const custom=Object.fromEntries(Object.entries(data||{}).map(([k,v])=>[String(k),String(v??'')]));
    req.end(JSON.stringify({aps:{alert:{title:String(title||'Westbury Church Hub').slice(0,120),body:String(body||'').slice(0,500)},sound:'default'},...custom}));
  });
}
async function sendApnsDevice(device,{title,body,data}){
  const preferred=['sandbox','production'].includes(device.pushEnvironment)?device.pushEnvironment:'production';
  let result=await apnsRequest(device.token,{title,body,data,environment:preferred});
  if(!result.success&&['BadDeviceToken','DeviceTokenNotForTopic'].includes(result.reason)){
    const alternate=preferred==='production'?'sandbox':'production';
    const retry=await apnsRequest(device.token,{title,body,data,environment:alternate});
    if(retry.success){ device.pushEnvironment=alternate; return retry; }
    return retry;
  }
  return result;
}

export function pushStatus(){
  const androidEnabled=Boolean(config.firebaseProjectId&&config.firebaseServiceAccountJsonBase64);
  const iosEnabled=apnsConfigured();
  return {enabled:androidEnabled||iosEnabled,android:{enabled:androidEnabled,projectId:config.firebaseProjectId||null,provider:'fcm'},ios:{enabled:iosEnabled,bundleId:config.apnsBundleId||null,provider:'apns'}};
}
export function pushDeviceId(token){return `push_${crypto.createHash('sha256').update(String(token)).digest('hex').slice(0,32)}`;}
export async function upsertPushDevice(churchId,member,{token,platform='android',deviceName='',pushEnvironment=''}){
  const value=String(token||'').trim(); if(!value) throw Object.assign(new Error('Push token is required.'),{statusCode:400});
  const normalizedPlatform=String(platform||'').toLowerCase();
  if(!['android','ios'].includes(normalizedPlatform)) throw Object.assign(new Error('Unsupported push platform.'),{statusCode:400});
  const environment=normalizedPlatform==='ios'&&['sandbox','production'].includes(String(pushEnvironment).toLowerCase())?String(pushEnvironment).toLowerCase():'';
  const id=pushDeviceId(value),now=nowIso();
  const row={id,memberId:member.id,token:value,platform:normalizedPlatform,pushEnvironment:environment,deviceName:String(deviceName||'').slice(0,100),active:true,createdAt:now,updatedAt:now,lastSeenAt:now};
  await putDoc(tableNames.pushDevices,churchId,id,row,{memberId:member.id,platform:row.platform,active:true,lastSeenAt:now,pushEnvironment:environment});
  return {id,platform:row.platform,pushEnvironment:environment,active:true};
}
export async function deactivatePushDevice(churchId,memberId,token){
  const id=pushDeviceId(token),rows=await listDocs(tableNames.pushDevices,churchId,{filter:`memberId eq '${String(memberId).replace(/'/g,"''")}'`,max:100});
  const row=rows.find(x=>x.id===id); if(!row)return false;row.active=false;row.updatedAt=nowIso();await putDoc(tableNames.pushDevices,churchId,id,row,{memberId:row.memberId,platform:row.platform,active:false,lastSeenAt:row.lastSeenAt||'',pushEnvironment:row.pushEnvironment||''});return true;
}
export async function listMemberPushDevices(churchId,memberId){return (await listDocs(tableNames.pushDevices,churchId,{filter:`memberId eq '${String(memberId).replace(/'/g,"''")}'`,max:100})).filter(x=>x.active!==false&&x.token);}

async function sendAndroid(devices,{churchId,memberId,title,body,data}){
  if(!devices.length)return [];
  if(!config.firebaseProjectId||!config.firebaseServiceAccountJsonBase64)return devices.map(d=>({success:false,platform:'android',deviceId:d.id,errorCode:'FCM_NOT_CONFIGURED',errorMessage:'Firebase push is not configured.'}));
  const tokens=[...new Set(devices.map(d=>d.token).filter(Boolean))].slice(0,500);
  const result=await getMessaging(firebaseApp()).sendEachForMulticast({tokens,notification:{title:String(title||'Westbury Church Hub').slice(0,120),body:String(body||'').slice(0,500)},data:Object.fromEntries(Object.entries(data||{}).map(([k,v])=>[String(k),String(v??'')]))});
  const responses=result.responses.map((r,i)=>({success:r.success,platform:'android',messageId:r.messageId||'',errorCode:String(r.error?.code||''),errorMessage:String(r.error?.message||'').slice(0,300),deviceId:devices.find(d=>d.token===tokens[i])?.id||''}));
  for(let i=0;i<result.responses.length;i++) if(!result.responses[i].success){const code=String(result.responses[i].error?.code||'');if(['messaging/registration-token-not-registered','messaging/invalid-registration-token'].includes(code)){const row=devices.find(d=>d.token===tokens[i]);if(row){row.active=false;row.updatedAt=nowIso();await putDoc(tableNames.pushDevices,churchId,row.id,row,{memberId:row.memberId,platform:row.platform,active:false,lastSeenAt:row.lastSeenAt||'',pushEnvironment:row.pushEnvironment||''});}}}
  return responses;
}
async function sendIos(devices,{churchId,title,body,data}){
  if(!devices.length)return [];
  if(!apnsConfigured())return devices.map(d=>({success:false,platform:'ios',deviceId:d.id,errorCode:'APNS_NOT_CONFIGURED',errorMessage:'Apple push is not configured.'}));
  const out=[];
  for(const device of devices){
    const row={...device,churchId};
    try{
      const r=await sendApnsDevice(row,{title,body,data});
      out.push({success:r.success,platform:'ios',deviceId:device.id,messageId:r.apnsId||'',errorCode:r.reason||'',errorMessage:r.success?'':r.reason||`APNs HTTP ${r.status}`,environment:r.environment});
      if(!r.success&&['Unregistered'].includes(r.reason)){device.active=false;device.updatedAt=nowIso();await putDoc(tableNames.pushDevices,churchId,device.id,device,{memberId:device.memberId,platform:'ios',active:false,lastSeenAt:device.lastSeenAt||'',pushEnvironment:device.pushEnvironment||''});}
      else if(r.success&&r.environment&&device.pushEnvironment!==r.environment){device.pushEnvironment=r.environment;device.updatedAt=nowIso();await putDoc(tableNames.pushDevices,churchId,device.id,device,{memberId:device.memberId,platform:'ios',active:true,lastSeenAt:device.lastSeenAt||'',pushEnvironment:r.environment});}
    }catch(error){out.push({success:false,platform:'ios',deviceId:device.id,errorCode:'APNS_ERROR',errorMessage:String(error?.message||error).slice(0,300)});}
  }
  return out;
}
export async function sendPushToMember({churchId,memberId,title,body,data={}}){
  const devices=await listMemberPushDevices(churchId,memberId); if(!devices.length) throw Object.assign(new Error('Selected member does not have a registered native push device.'),{statusCode:400,code:'NO_PUSH_DEVICE'});
  const android=devices.filter(d=>d.platform==='android'),ios=devices.filter(d=>d.platform==='ios');
  const responses=[...(await sendAndroid(android,{churchId,memberId,title,body,data})),...(await sendIos(ios,{churchId,memberId,title,body,data}))];
  const successCount=responses.filter(r=>r.success).length,failureCount=responses.length-successCount;
  console.log('[NOTIFY][PUSH]',JSON.stringify({churchId,memberId,deviceCount:devices.length,androidCount:android.length,iosCount:ios.length,successCount,failureCount,responses:responses.map(r=>({success:r.success,platform:r.platform,messageId:r.messageId||'',errorCode:r.errorCode||''}))}));
  return {ok:successCount>0,successCount,failureCount,deviceCount:devices.length,messageIds:responses.filter(r=>r.success&&r.messageId).map(r=>r.messageId),errors:responses.filter(r=>!r.success).map(r=>({code:r.errorCode,message:r.errorMessage,deviceId:r.deviceId,platform:r.platform}))};
}
