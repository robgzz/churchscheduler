import express from 'express';
import crypto from 'node:crypto';
import { requireLogin, requireAdmin } from '../auth/middleware.js';
import { requireModule } from '../modules/registry.js';
import { tableNames } from '../config.js';
import { listDocs, getDoc, putDoc, nowIso } from '../storage/repository.js';
import { appendHistory } from '../scheduler/history.js';

const id=p=>`${p}_${crypto.randomUUID().replace(/-/g,'').slice(0,16)}`;
const clean=(v,n=500)=>String(v||'').trim().slice(0,n);
const dateOk=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''));
const escFilter=v=>String(v||'').replace(/'/g,"''");

async function churchTodayISO(churchId){
  const church=await getDoc(tableNames.settings,churchId,'church').catch(()=>null);
  const tz=church?.timezone||'America/Chicago';
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const get=t=>parts.find(x=>x.type===t)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export const hubModulesRouter=express.Router();
hubModulesRouter.use(requireLogin);

// Events remain in storage/reports. Members only see events through 11:59 PM church-local time
// on the event date, unless they intentionally hide the event earlier.
hubModulesRouter.get('/events',requireModule('events'),async(req,res)=>{
  const memberId=req.identity.member?.id||'';
  const [rows,registrations,today]=await Promise.all([
    listDocs(tableNames.events,req.churchId,{max:2000}),
    listDocs(tableNames.eventRegistrations,req.churchId,{filter:`memberId eq '${escFilter(memberId)}'`,max:2000}),
    churchTodayISO(req.churchId)
  ]);
  const mine=new Map(registrations.map(r=>[r.eventId,r]));
  res.json(rows
    .filter(x=>x.active!==false&&(!x.dateISO||x.dateISO>=today)&&mine.get(x.id)?.hiddenByMember!==true)
    .sort((a,b)=>String(a.dateISO||'9999-12-31').localeCompare(String(b.dateISO||'9999-12-31')))
    .map(e=>({...e,myRegistration:mine.get(e.id)||null})));
});

hubModulesRouter.post('/events/:id/register',requireModule('events'),async(req,res)=>{
  const event=await getDoc(tableNames.events,req.churchId,req.params.id);
  if(!event||event.active===false)return res.status(404).json({error:'Event not found'});
  const memberId=req.identity.member?.id||'',registrationId=`${event.id}__${memberId}`;
  const existing=await getDoc(tableNames.eventRegistrations,req.churchId,registrationId);
  const status=req.body?.attending===false?'cancelled':'registered';
  const doc={...(existing||{}),id:registrationId,eventId:event.id,memberId,memberName:req.identity.member?.fullName||'',status,hiddenByMember:req.body?.hide===true,partySize:Math.max(1,Math.min(20,Number(req.body?.partySize||1))),notes:clean(req.body?.notes,300),updatedAt:nowIso(),createdAt:existing?.createdAt||nowIso()};
  await putDoc(tableNames.eventRegistrations,req.churchId,doc.id,doc,{eventId:doc.eventId,memberId,status:doc.status});
  await appendHistory(req.churchId,{eventType:`event.registration.${status}`,memberId,dateISO:event.dateISO,source:'member',details:{eventId:event.id,partySize:doc.partySize,hiddenByMember:doc.hiddenByMember===true}});
  res.json({ok:true,registration:doc});
});

// Hiding is a presentation preference, not a deletion. The event and its latest RSVP status remain reportable.
hubModulesRouter.post('/events/:id/dismiss',requireModule('events'),async(req,res)=>{
  const event=await getDoc(tableNames.events,req.churchId,req.params.id);
  if(!event)return res.status(404).json({error:'Event not found'});
  const memberId=req.identity.member?.id||'',registrationId=`${event.id}__${memberId}`;
  const old=await getDoc(tableNames.eventRegistrations,req.churchId,registrationId);
  const doc={...(old||{}),id:registrationId,eventId:event.id,memberId,memberName:req.identity.member?.fullName||'',status:old?.status||'dismissed',hiddenByMember:true,partySize:Number(old?.partySize||1),createdAt:old?.createdAt||nowIso(),updatedAt:nowIso()};
  await putDoc(tableNames.eventRegistrations,req.churchId,doc.id,doc,{eventId:doc.eventId,memberId,status:doc.status});
  await appendHistory(req.churchId,{eventType:'event.hidden_by_member',memberId,dateISO:event.dateISO,source:'member',details:{eventId:event.id,status:doc.status}});
  res.json({ok:true});
});

hubModulesRouter.get('/admin/events',requireAdmin,requireModule('events'),async(req,res)=>{
  const [events,registrations]=await Promise.all([listDocs(tableNames.events,req.churchId,{max:2000}),listDocs(tableNames.eventRegistrations,req.churchId,{max:10000})]);
  res.json({events,registrations});
});
hubModulesRouter.post('/admin/events',requireAdmin,requireModule('events'),async(req,res)=>{
  if(!clean(req.body?.titleEn||req.body?.titleEs)||!dateOk(req.body?.dateISO))return res.status(400).json({error:'Event title and valid date are required.'});
  const eventId=id('event'),doc={id:eventId,titleEn:clean(req.body.titleEn),titleEs:clean(req.body.titleEs),descriptionEn:clean(req.body.descriptionEn,2000),descriptionEs:clean(req.body.descriptionEs,2000),dateISO:req.body.dateISO,startTime:clean(req.body.startTime,5),location:clean(req.body.location),capacity:Math.max(0,Number(req.body.capacity||0)),active:true,createdAt:nowIso(),createdBy:req.identity.member?.id||''};
  await putDoc(tableNames.events,req.churchId,eventId,doc,{dateISO:doc.dateISO,active:true});
  res.status(201).json(doc);
});
hubModulesRouter.put('/admin/events/:id',requireAdmin,requireModule('events'),async(req,res)=>{
  const old=await getDoc(tableNames.events,req.churchId,req.params.id);if(!old)return res.status(404).json({error:'Event not found'});
  const doc={...old,...req.body,id:old.id,updatedAt:nowIso(),updatedBy:req.identity.member?.id||''};
  await putDoc(tableNames.events,req.churchId,doc.id,doc,{dateISO:doc.dateISO||'',active:doc.active!==false});res.json(doc);
});

// Tasks expire from the assignee screen after 11:59 PM on dueDate but remain in storage/reports
// with the final status reached (open, in_progress, completed, or cancelled).
hubModulesRouter.get('/followups/mine',requireModule('followups'),async(req,res)=>{
  const memberId=req.identity.member?.id||'';
  const [rows,today]=await Promise.all([
    listDocs(tableNames.followUps,req.churchId,{filter:`assignedTo eq '${escFilter(memberId)}'`,max:1000}),
    churchTodayISO(req.churchId)
  ]);
  res.json(rows
    .filter(x=>x.hiddenByAssignee!==true&&(!x.dueDate||x.dueDate>=today))
    .sort((a,b)=>String(a.dueDate||'9999-12-31').localeCompare(String(b.dueDate||'9999-12-31'))));
});

hubModulesRouter.put('/followups/:id',requireModule('followups'),async(req,res)=>{
  const old=await getDoc(tableNames.followUps,req.churchId,req.params.id);
  if(!old||old.assignedTo!==req.identity.member?.id)return res.status(404).json({error:'Task not found'});
  const allowed=['open','in_progress','completed','cancelled'];
  const status=allowed.includes(req.body?.status)?req.body.status:old.status;
  const doc={...old,status,hiddenByAssignee:req.body?.hiddenByAssignee===true?true:old.hiddenByAssignee===true,updatedAt:nowIso(),updatedBy:req.identity.member?.id||''};
  await putDoc(tableNames.followUps,req.churchId,doc.id,doc,{status:doc.status,assignedTo:doc.assignedTo||'',dueDate:doc.dueDate||''});
  await appendHistory(req.churchId,{eventType:'followup.member_updated',memberId:req.identity.member?.id||'',source:'member',details:{followUpId:doc.id,status:doc.status,hiddenByAssignee:doc.hiddenByAssignee===true}});
  res.json(doc);
});

// DELETE means "remove from my screen" for the assignee; the record is retained for reporting/audit.
hubModulesRouter.delete('/followups/:id',requireModule('followups'),async(req,res)=>{
  const old=await getDoc(tableNames.followUps,req.churchId,req.params.id);
  if(!old||old.assignedTo!==req.identity.member?.id)return res.status(404).json({error:'Task not found'});
  const doc={...old,hiddenByAssignee:true,hiddenAt:nowIso(),updatedAt:nowIso(),updatedBy:req.identity.member?.id||''};
  await putDoc(tableNames.followUps,req.churchId,doc.id,doc,{status:doc.status||'open',assignedTo:doc.assignedTo||'',dueDate:doc.dueDate||''});
  await appendHistory(req.churchId,{eventType:'followup.hidden_by_assignee',memberId:req.identity.member?.id||'',source:'member',details:{followUpId:doc.id,status:doc.status||'open'}});
  res.json({ok:true});
});

hubModulesRouter.get('/admin/followups',requireAdmin,requireModule('followups'),async(req,res)=>{const rows=await listDocs(tableNames.followUps,req.churchId,{max:5000});res.json(rows.sort((a,b)=>String(a.dueDate||'').localeCompare(String(b.dueDate||''))));});
hubModulesRouter.post('/admin/followups',requireAdmin,requireModule('followups'),async(req,res)=>{const title=clean(req.body?.title);if(!title)return res.status(400).json({error:'Follow-up title is required.'});const followId=id('followup'),doc={id:followId,title,sourceType:clean(req.body.sourceType,40),sourceId:clean(req.body.sourceId,100),assignedTo:clean(req.body.assignedTo,100),dueDate:dateOk(req.body.dueDate)?req.body.dueDate:'',status:'open',hiddenByAssignee:false,notes:clean(req.body.notes,2000),createdAt:nowIso(),createdBy:req.identity.member?.id||''};await putDoc(tableNames.followUps,req.churchId,followId,doc,{status:doc.status,assignedTo:doc.assignedTo,dueDate:doc.dueDate});await appendHistory(req.churchId,{eventType:'followup.created',memberId:req.identity.member?.id||'',source:'admin',details:{followUpId:followId,sourceType:doc.sourceType,sourceId:doc.sourceId}});res.status(201).json(doc);});
hubModulesRouter.put('/admin/followups/:id',requireAdmin,requireModule('followups'),async(req,res)=>{const old=await getDoc(tableNames.followUps,req.churchId,req.params.id);if(!old)return res.status(404).json({error:'Follow-up not found'});const allowed=['open','in_progress','completed','cancelled'],doc={...old,...req.body,id:old.id,status:allowed.includes(req.body?.status)?req.body.status:old.status,updatedAt:nowIso(),updatedBy:req.identity.member?.id||''};await putDoc(tableNames.followUps,req.churchId,doc.id,doc,{status:doc.status,assignedTo:doc.assignedTo||'',dueDate:doc.dueDate||''});await appendHistory(req.churchId,{eventType:'followup.updated',memberId:req.identity.member?.id||'',source:'admin',details:{followUpId:doc.id,status:doc.status}});res.json(doc);});
