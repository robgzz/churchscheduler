import express from 'express';
import crypto from 'node:crypto';
import { requireLogin, requireGroup } from '../auth/middleware.js';
import { tableNames } from '../config.js';
import { putDoc, listDocs, getDoc, nowIso } from '../storage/repository.js';
import { myAssignments, listProgramViews } from '../services/programs.js';
import { addUnavailability } from '../services/unavailability.js';
import { requestReplacement } from '../services/replacements.js';
import { threeWeekWindow } from '../scheduler/dates.js';

export const memberRouter=express.Router();
memberRouter.use(requireLogin);

memberRouter.get('/assignments',requireGroup('worship'),async(req,res)=>res.json(await myAssignments(req.churchId,req.identity.member.id)));
memberRouter.get('/programs',requireGroup('worship'),async(req,res)=>{
  const settings=await getDoc(tableNames.settings,req.churchId,'church') || {timezone:'America/Chicago',weekStartsOn:0};
  const w=threeWeekWindow(settings.timezone||'America/Chicago',Number(settings.weekStartsOn??0));
  res.json(await listProgramViews(req.churchId,{from:w.start,to:w.end}));
});
memberRouter.post('/unavailability',requireGroup('worship'),async(req,res)=>res.status(201).json(await addUnavailability(req.churchId,req.identity.member.id,req.body)));
memberRouter.post('/replacement/:assignmentId',requireGroup('worship'),async(req,res)=>res.json(await requestReplacement(req.churchId,req.identity.member.id,req.params.assignmentId,{reason:'member_request'})));
memberRouter.post('/petitions',requireGroup('members'),async(req,res)=>{
  const id=`petition_${crypto.randomUUID().replace(/-/g,'').slice(0,14)}`;
  const doc={id,memberId:req.identity.member.id,memberName:req.identity.member.fullName,text:String(req.body.text||'').trim(),private:req.body.private===true,status:'new',createdAt:nowIso()};
  if(!doc.text) return res.status(400).json({error:'Petition text is required.'});
  await putDoc(tableNames.petitions,req.churchId,id,doc,{memberId:doc.memberId,status:'new',createdAt:doc.createdAt});
  res.status(201).json({ok:true,id});
});
memberRouter.get('/songs',requireGroup('worship'),async(req,res)=>res.json(await listDocs(tableNames.songs,req.churchId,{max:1000})));
