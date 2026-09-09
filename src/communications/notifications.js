import crypto from 'node:crypto';
import { tableNames, config } from '../config.js';
import { listDocs, getDoc, createDoc, putDoc, nowIso } from '../storage/repository.js';
import { sendEmail, sendSms, sendPush, logNotification } from './service.js';

const clean=v=>String(v||'').trim();
const escapeHtml=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dayDiff=(a,b)=>Math.round((new Date(`${b}T12:00:00Z`)-new Date(`${a}T12:00:00Z`))/86400000);
function queueId(eventKey,channel,memberId){return `q_${crypto.createHash('sha256').update(`${eventKey}|${channel}|${memberId}`).digest('hex').slice(0,32)}`;}
function localeFor(m){return m?.preferences?.locale==='en'?'en':'es';}
function contactEnabled(m,channel){const prefs=m?.notificationPreferences||{}; if(channel==='push')return prefs.push!==false; return channel==='sms' ? Boolean(clean(m?.phone))&&prefs.sms!==false : Boolean(clean(m?.email))&&prefs.email!==false;}
function e164(phone){let p=clean(phone).replace(/[^\d+]/g,''); if(!p)return ''; if(p.startsWith('+'))return p; if(p.length===10)return `+1${p}`; if(p.length===11&&p.startsWith('1'))return `+${p}`; return p;}

export async function enqueue({churchId,eventKey,channel,member,subject='',message,html='',notBefore=new Date().toISOString(),metadata={}}){
  if(!member?.id)return false;
  if(!contactEnabled(member,channel)){await logNotification(churchId,{channel,status:'skipped',recipient:channel==='push'?member.id:(channel==='sms'?e164(member.phone):clean(member.email)),eventKey,memberId:member.id,metadata:{...metadata,reason:channel==='sms'&&!clean(member.phone)?'no_phone':channel==='email'&&!clean(member.email)?'no_email':'preference_disabled'}});return false;}
  const id=queueId(eventKey,channel,member.id), recipient=channel==='sms'?e164(member.phone):channel==='push'?member.id:clean(member.email);
  try{await createDoc(tableNames.notificationQueue,churchId,id,{id,eventKey,channel,memberId:member.id,recipient,subject,message,html,notBefore,status:'pending',attempts:0,createdAt:nowIso(),metadata},{status:'pending',channel,memberId:member.id,notBefore,eventKey});return true;}catch(e){if(e.statusCode===409||e.code==='EntityAlreadyExists')return false;throw e;}
}

export async function enqueueAnnouncement(churchId,content){
  if(content.kind!=='announcement'||content.published===false)return {queued:0};
  const church=await getDoc(tableNames.settings,churchId,'church')||{};
  const members=(await listDocs(tableNames.members,churchId,{max:3000})).filter(m=>m.active!==false);const tasks=[];
  for(const m of members){
    const lang=localeFor(m),churchName=lang==='en'?(church.churchNameEn||church.churchName||'Church'):(church.churchNameEs||church.churchName||'Iglesia');
    const title=lang==='en'?(content.titleEn||content.title):(content.titleEs||content.title),body=lang==='en'?(content.bodyEn||content.body):(content.bodyEs||content.body),address=clean(content.address);
    const msg=`${churchName}: ${title}${body?` - ${body}`:''}${address?` - ${address}`:''}`.slice(0,1200);
    const mapUrl=address?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`:'';
    const imageUrl=(config.publicAppUrl && ['image/jpeg','image/png'].includes(String(content.attachment?.contentType||'').toLowerCase()))?`${config.publicAppUrl}/api/public/files/${encodeURIComponent(content.id)}`:'';
    const html=`<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#182230"><h2 style="margin-bottom:8px">${escapeHtml(title||churchName)}</h2>${body?`<p style="line-height:1.55">${escapeHtml(body).replace(/\n/g,'<br>')}</p>`:''}${imageUrl?`<img src="${imageUrl}" alt="" style="display:block;max-width:100%;height:auto;margin:16px 0;border-radius:12px">`:''}${address?`<p><a href="${mapUrl}">${escapeHtml(address)}</a></p>`:''}<p style="font-size:12px;color:#667085">${escapeHtml(churchName)}</p></div>`;
    tasks.push(()=>enqueue({churchId,eventKey:`announcement:${content.id}`,channel:'sms',member:m,message:msg,metadata:{type:'announcement',contentId:content.id}}));
    tasks.push(()=>enqueue({churchId,eventKey:`announcement:${content.id}`,channel:'email',member:m,subject:title||churchName,message:`${body||title}${address?`\n${address}`:''}`,html,metadata:{type:'announcement',contentId:content.id}}));
    tasks.push(()=>enqueue({churchId,eventKey:`announcement:${content.id}`,channel:'push',member:m,subject:title||churchName,message:body||title||churchName,metadata:{type:'announcement',contentId:content.id,route:'church'}}));
  }
  let queued=0;for(let i=0;i<tasks.length;i+=20){const results=await Promise.all(tasks.slice(i,i+20).map(fn=>fn()));queued+=results.filter(Boolean).length;}return {queued};
}

export async function enqueueAdminAlert(churchId,{type,id,summary}){
  const church=await getDoc(tableNames.settings,churchId,'church')||{};
  const admins=(await listDocs(tableNames.members,churchId,{max:3000})).filter(m=>m.active!==false&&(m.adminAccess===true||m.churchAdministrator===true)); let queued=0;
  for(const m of admins){const churchName=localeFor(m)==='en'?(church.churchNameEn||church.churchName||'Church'):(church.churchNameEs||church.churchName||'Iglesia');if(await enqueue({churchId,eventKey:`admin:${type}:${id}`,channel:'sms',member:m,message:`${churchName}: ${summary}`,metadata:{type,id}}))queued++;if(await enqueue({churchId,eventKey:`admin:${type}:${id}`,channel:'push',member:m,subject:churchName,message:summary,metadata:{type,id,route:'admin-content'}}))queued++;}
  return {queued};
}

export async function enqueueAssignmentNotifications(churchId){
  const settings=await getDoc(tableNames.settings,churchId,'church')||{};
  const timezone=settings.timezone||'America/Chicago';
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const [assignments,members,services,ministries]=await Promise.all([listDocs(tableNames.assignments,churchId,{filter:`status eq 'scheduled'`,max:5000}),listDocs(tableNames.members,churchId,{max:3000}),listDocs(tableNames.services,churchId),listDocs(tableNames.ministries,churchId)]);
  const mm=new Map(members.map(m=>[m.id,m])),sm=new Map(services.map(s=>[s.id,s])),xm=new Map(ministries.map(x=>[x.id,x])); let queued=0; const now=Date.now();
  for(const a of assignments){const m=mm.get(a.currentMemberId); if(!m||(m.groups||[]).includes('worship')===false)continue; const svc=sm.get(a.serviceId)||{},min=xm.get(a.ministryId)||{};const lang=localeFor(m),svcName=lang==='en'?(svc.labelEn||svc.label):(svc.labelEs||svc.label),minName=lang==='en'?(min.labelEn||min.label):(min.labelEs||min.label);const base=lang==='en'?`You are assigned to ${minName} for ${svcName} on ${a.dateISO} at ${svc.startTime||''}.`:`Tienes asignado ${minName} para ${svcName} el ${a.dateISO} a las ${svc.startTime||''}.`;
    const churchName=lang==='en'?(settings.churchNameEn||settings.churchName||'Church'):(settings.churchNameEs||settings.churchName||'Iglesia'); const assignedAt=a.appNotificationAt||a.assignedAt||''; if(assignedAt&&now>=new Date(assignedAt).getTime()+30*60000){for(const ch of ['sms','email','push'])if(await enqueue({churchId,eventKey:`assignment:${a.id}:${assignedAt}:initial`,channel:ch,member:m,subject:lang==='en'?'New worship assignment':'Nueva asignación de adoración',message:`${churchName}: ${base}`,metadata:{type:'assignment.initial',assignmentId:a.id}}))queued++;}
    const diff=dayDiff(today,a.dateISO); if(diff===3||diff===1){for(const ch of ['sms','email','push'])if(await enqueue({churchId,eventKey:`assignment:${a.id}:${a.assignedAt||a.createdAt}:reminder${diff}`,channel:ch,member:m,subject:lang==='en'?`Assignment reminder - ${diff} day${diff===1?'':'s'}`:`Recordatorio de asignación - ${diff} día${diff===1?'':'s'}`,message:`${churchName}: ${lang==='en'?`Reminder: ${base}`:`Recordatorio: ${base}`}`,metadata:{type:`assignment.reminder.${diff}`,assignmentId:a.id}}))queued++;}
  }
  return {queued};
}

export async function dispatchQueue(churchId,{max=250}={}){
  const rows=(await listDocs(tableNames.notificationQueue,churchId,{filter:`status eq 'pending'`,max:2000})).filter(r=>String(r.notBefore||'')<=nowIso()).slice(0,max); let sent=0,failed=0;
  async function deliver(q){try{if(q.channel==='email')await sendEmail({churchId,to:q.recipient,subject:q.subject,text:q.message,html:q.html||'',eventKey:q.eventKey,memberId:q.memberId,metadata:q.metadata});else if(q.channel==='sms')await sendSms({churchId,to:q.recipient,message:q.message,eventKey:q.eventKey,memberId:q.memberId,metadata:q.metadata});else if(q.channel==='push')await sendPush({churchId,memberId:q.memberId,title:q.subject||'Church Hub',message:q.message,eventKey:q.eventKey,metadata:q.metadata});else throw new Error(`Unsupported notification channel: ${q.channel}`);q.status='sent';q.sentAt=nowIso();sent++;}catch(e){q.attempts=(q.attempts||0)+1;q.lastError=String(e.message||e).slice(0,500);q.status=q.attempts>=3?'failed':'pending';failed++;}await putDoc(tableNames.notificationQueue,churchId,q.id,q,{status:q.status,channel:q.channel,memberId:q.memberId,notBefore:q.notBefore,eventKey:q.eventKey});}
  for(let i=0;i<rows.length;i+=20)await Promise.all(rows.slice(i,i+20).map(deliver));return {processed:rows.length,sent,failed};
}
