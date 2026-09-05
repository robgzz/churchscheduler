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

export const memberRouter=express.Router();
memberRouter.use(requireLogin);

memberRouter.get('/assignments',requireGroup('worship'),async(req,res)=>res.json(await myAssignments(req.churchId,req.identity.member.id)));
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
  res.status(201).json({ok:true,id});
});
memberRouter.get('/songs',requireGroup('worship'),async(req,res)=>res.json((await listDocs(tableNames.songs,req.churchId,{max:2000})).filter(s=>s.active!==false)));

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

  assignment.songIds=requested;
  assignment.songsUpdatedAt=nowIso();
  assignment.songsUpdatedBy=req.identity.member.id;
  assignment.updatedAt=nowIso();
  await putDoc(tableNames.assignments,req.churchId,assignment.id,assignment,{serviceId:assignment.serviceId,dateISO:assignment.dateISO,status:assignment.status,currentMemberId:assignment.currentMemberId||'',ministryId:assignment.ministryId,programId:assignment.programId});
  await appendHistory(req.churchId,{eventType:'songs.updated',programId:assignment.programId,assignmentId:assignment.id,assignmentKey:assignment.assignmentKey,ministryId:assignment.ministryId,memberId:req.identity.member.id,dateISO:assignment.dateISO,details:{songIds:requested}});
  res.json({ok:true,assignmentId:assignment.id,songIds:requested,songs:requested.map(id=>songMap.get(id))});
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
