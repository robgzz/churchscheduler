import express from 'express';
import crypto from 'node:crypto';
import { requireLogin, requireGroup, requireAnyGroup } from '../auth/middleware.js';
import { tableNames } from '../config.js';
import { putDoc, listDocs, getDoc, nowIso } from '../storage/repository.js';
import { myAssignments, listProgramViews } from '../services/programs.js';
import { addUnavailability } from '../services/unavailability.js';
import { requestReplacement } from '../services/replacements.js';
import { threeWeekWindow } from '../scheduler/dates.js';
import { appendHistory } from '../scheduler/history.js';
import { enqueueAdminAlert } from '../communications/notifications.js';
import { songSelectionContext, validateNoDuplicateSongsInProgram } from '../services/songSelection.js';
import { syncProgramStatus } from '../communications/programAdmin.js';

export const memberRouter=express.Router();
memberRouter.use(requireLogin);

memberRouter.get('/assignments',requireGroup('worship'),async(req,res)=>res.json(await myAssignments(req.churchId,req.identity.member.id)));

memberRouter.get('/notifications',async(req,res)=>{
  const rows=await listDocs(tableNames.appNotifications,req.churchId,{filter:`memberId eq '${String(req.identity.member.id).replace(/'/g,"''")}'`,max:200});
  res.json(rows.sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).slice(0,50));
});
memberRouter.put('/notifications/:id/read',async(req,res)=>{
  const row=await getDoc(tableNames.appNotifications,req.churchId,req.params.id);
  if(!row||row.memberId!==req.identity.member.id)return res.status(404).json({error:'Notification not found'});
  row.status='read'; row.readAt=nowIso();
  await putDoc(tableNames.appNotifications,req.churchId,row.id,row,{memberId:row.memberId,status:row.status,createdAt:row.createdAt||'',eventKey:row.eventKey||''});
  res.json({ok:true});
});

memberRouter.get('/programs',requireAnyGroup('members','worship'),async(req,res)=>{
  const settings=await getDoc(tableNames.settings,req.churchId,'church') || {timezone:'America/Chicago',weekStartsOn:0};
  const w=threeWeekWindow(settings.timezone||'America/Chicago',Number(settings.weekStartsOn??0));
  res.json(await listProgramViews(req.churchId,{from:w.start,to:w.end}));
});
memberRouter.post('/unavailability',requireGroup('worship'),async(req,res)=>res.status(201).json(await addUnavailability(req.churchId,req.identity.member.id,req.body)));
memberRouter.post('/replacement/:assignmentId',requireGroup('worship'),async(req,res)=>res.json(await requestReplacement(req.churchId,req.identity.member.id,req.params.assignmentId,{reason:'member_request'})));
memberRouter.get('/petitions',requireGroup('members'),async(req,res)=>{
  const rows=await listDocs(tableNames.petitions,req.churchId,{max:500});
  res.json(rows.filter(p=>p.private!==true).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).map(p=>({id:p.id,memberId:p.memberId,memberName:p.memberName,text:p.text,createdAt:p.createdAt,status:p.status})));
});
memberRouter.post('/petitions',requireGroup('members'),async(req,res)=>{
  const id=`petition_${crypto.randomUUID().replace(/-/g,'').slice(0,14)}`;
  const doc={id,memberId:req.identity.member.id,memberName:req.identity.member.fullName,text:String(req.body.text||'').trim(),private:req.body.private!==false,status:'new',createdAt:nowIso()};
  if(!doc.text) return res.status(400).json({error:'Petition text is required.',code:'PETITION_REQUIRED'});
  await putDoc(tableNames.petitions,req.churchId,id,doc,{memberId:doc.memberId,status:'new',createdAt:doc.createdAt});
  await enqueueAdminAlert(req.churchId,{type:'petition',id,summary:`New prayer petition from ${doc.memberName}. Open the Church Scheduler Admin console.`});
  res.status(201).json({ok:true,id});
});
memberRouter.get('/songs',requireGroup('worship'),async(req,res)=>res.json((await listDocs(tableNames.songs,req.churchId,{max:2000})).filter(s=>s.active!==false)));

memberRouter.get('/assignments/:assignmentId/song-options',requireGroup('worship'),async(req,res)=>{
  const assignment=await getDoc(tableNames.assignments,req.churchId,req.params.assignmentId);
  if(!assignment)return res.status(404).json({error:'Assignment not found',code:'ASSIGNMENT_NOT_FOUND'});
  if(assignment.currentMemberId!==req.identity.member.id)return res.status(403).json({error:'This assignment does not belong to this member',code:'ASSIGNMENT_NOT_YOURS'});
  if(assignment.ministryId!=='ministry_songs')return res.status(409).json({error:'Songs can only be selected for a Cantos assignment',code:'SONG_ASSIGNMENT_ONLY'});
  res.json(await songSelectionContext(req.churchId,assignment,req.identity.member.id));
});

memberRouter.put('/assignments/:assignmentId/songs',requireGroup('worship'),async(req,res)=>{
  const assignment=await getDoc(tableNames.assignments,req.churchId,req.params.assignmentId);
  if(!assignment) return res.status(404).json({error:'Assignment not found',code:'ASSIGNMENT_NOT_FOUND'});
  if(assignment.currentMemberId!==req.identity.member.id) return res.status(403).json({error:'This assignment does not belong to this member',code:'ASSIGNMENT_NOT_YOURS'});
  if(assignment.ministryId!=='ministry_songs') return res.status(409).json({error:'Songs can only be selected for a Cantos assignment',code:'SONG_ASSIGNMENT_ONLY'});
  if(assignment.status!=='scheduled') return res.status(409).json({error:'Only scheduled assignments can be updated',code:'ASSIGNMENT_NOT_SCHEDULED'});

  const requested=[...new Set((Array.isArray(req.body.songIds)?req.body.songIds:[]).map(String).filter(Boolean))].slice(0,25);
  const songs=await listDocs(tableNames.songs,req.churchId,{max:2000});
  const songMap=new Map(songs.filter(s=>s.active!==false).map(s=>[s.id,s]));
  if(requested.some(id=>!songMap.has(id))) return res.status(400).json({error:'One or more selected songs are invalid or inactive',code:'INVALID_SONGS'});
  try{await validateNoDuplicateSongsInProgram(req.churchId,assignment,requested);}catch(e){return res.status(e.statusCode||409).json({error:e.message,code:e.code||'DUPLICATE_SERVICE_SONGS',conflicts:e.conflicts||[]});}

  assignment.songIds=requested;
  assignment.songsUpdatedAt=nowIso();
  assignment.songsUpdatedBy=req.identity.member.id;
  assignment.updatedAt=nowIso();
  await putDoc(tableNames.assignments,req.churchId,assignment.id,assignment,{serviceId:assignment.serviceId,dateISO:assignment.dateISO,status:assignment.status,currentMemberId:assignment.currentMemberId||'',ministryId:assignment.ministryId,programId:assignment.programId});
  await appendHistory(req.churchId,{eventType:'songs.updated',programId:assignment.programId,assignmentId:assignment.id,assignmentKey:assignment.assignmentKey,ministryId:assignment.ministryId,memberId:req.identity.member.id,dateISO:assignment.dateISO,details:{songIds:requested}});
  await syncProgramStatus(req.churchId,{programId:assignment.programId});
  res.json({ok:true,assignmentId:assignment.id,songIds:requested,songs:requested.map(id=>songMap.get(id))});
});

memberRouter.put('/contact',async(req,res)=>{
  const member=req.identity.member;
  if(!member) return res.status(400).json({error:'Member profile not found',code:'MEMBER_NOT_FOUND'});
  const email=String(req.body.email??member.email??'').trim();
  const phone=String(req.body.phone??member.phone??'').trim();
  if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({error:'Enter a valid email address.',code:'INVALID_EMAIL'});
  member.email=email; member.phone=phone; member.updatedAt=nowIso();
  await putDoc(tableNames.members,req.churchId,member.id,member,{username:member.username||'',active:member.active!==false,adminAccess:member.adminAccess===true,churchAdministrator:member.churchAdministrator===true});
  res.json({ok:true,member});
});

memberRouter.put('/preferences',async(req,res)=>{
  const member=req.identity.member;
  if(!member) return res.status(400).json({error:'Member profile not found',code:'MEMBER_NOT_FOUND'});
  const locale=['en','es'].includes(req.body.locale)?req.body.locale:(member.preferences?.locale||'es');
  const theme=['system','light','dark'].includes(req.body.theme)?req.body.theme:(member.preferences?.theme||'system');
  member.preferences={...(member.preferences||{}),locale,theme};
  member.updatedAt=nowIso();
  await putDoc(tableNames.members,req.churchId,member.id,member,{username:member.username||'',active:member.active!==false,adminAccess:member.adminAccess===true,churchAdministrator:member.churchAdministrator===true});
  res.json({ok:true,preferences:member.preferences});
});
