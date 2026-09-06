import { config, tableNames } from '../config.js';
import { putDoc, nowIso } from '../storage/repository.js';
import { getEmailClient, getSmsClient } from './client.js';

function clean(value){ return String(value || '').trim(); }
function id(){ return `notify_${Date.now()}_${Math.random().toString(36).slice(2,10)}`; }

async function log(churchId, payload){
  const row={id:id(), occurredAt:nowIso(), ...payload};
  try { await putDoc(tableNames.notificationLogs,churchId,row.id,row,{channel:row.channel||'',status:row.status||'',recipient:row.recipient||''}); } catch {}
  return row;
}

export function communicationStatus(){
  return {
    endpointConfigured:Boolean(config.acsEndpoint),
    email:{enabled:config.acsEmailEnabled,sender:config.acsEmailSender||null},
    sms:{enabled:config.acsSmsEnabled,fromNumber:config.acsSmsFromNumber||null,inboundProcessing:false}
  };
}

export async function sendEmail({churchId,to,displayName='',subject,text='',html=''}){
  const recipient=clean(to);
  if (!config.acsEmailEnabled) throw new Error('ACS email is disabled');
  if (!config.acsEmailSender) throw new Error('ACS email sender is not configured');
  if (!recipient || !recipient.includes('@')) throw new Error('A valid email recipient is required');
  const message={
    senderAddress:config.acsEmailSender,
    recipients:{to:[{address:recipient,displayName:clean(displayName)||undefined}]},
    content:{subject:clean(subject)||'Westbury Church of Christ',plainText:clean(text)||undefined,html:clean(html)||undefined}
  };
  try {
    const poller=await getEmailClient().beginSend(message);
    const result=await poller.pollUntilDone();
    await log(churchId,{channel:'email',status:String(result.status||'submitted'),recipient,operationId:result.id||'',subject:message.content.subject});
    return {ok:true,status:result.status||'submitted',id:result.id||null};
  } catch(error){
    await log(churchId,{channel:'email',status:'failed',recipient,error:String(error?.message||error).slice(0,500)});
    throw error;
  }
}

export async function sendSms({churchId,to,message}){
  const recipient=clean(to);
  if (!config.acsSmsEnabled) throw new Error('ACS SMS is disabled');
  if (!config.acsSmsFromNumber) throw new Error('ACS SMS sending number is not configured');
  if (!/^\+[1-9]\d{7,14}$/.test(recipient)) throw new Error('SMS recipient must be E.164 format, for example +17135551234');
  const text=clean(message);
  if (!text) throw new Error('SMS message is required');
  try {
    const results=await getSmsClient().send({from:config.acsSmsFromNumber,to:[recipient],message:text},{enableDeliveryReport:false,tag:'church-scheduler'});
    const result=results[0];
    if (!result?.successful) throw new Error(result?.errorMessage||'SMS send failed');
    await log(churchId,{channel:'sms',status:'submitted',recipient,messageId:result.messageId||''});
    return {ok:true,messageId:result.messageId||null};
  } catch(error){
    await log(churchId,{channel:'sms',status:'failed',recipient,error:String(error?.message||error).slice(0,500)});
    throw error;
  }
}
