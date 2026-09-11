import express from 'express';
import crypto from 'node:crypto';
import { tableNames, config } from '../config.js';
import { getDoc, listDocs, putDoc, nowIso, downloadBuffer, downloadStream } from '../storage/repository.js';
import { publicWriteLimiter } from '../security/rateLimit.js';
import { enqueueAdminAlert } from '../communications/notifications.js';
import { normalizedModules } from '../modules/registry.js';
import { requireModule } from '../modules/registry.js';

export const publicRouter=express.Router();
publicRouter.get('/bootstrap',async(req,res)=>{
  const [church,services,content]=await Promise.all([
    getDoc(tableNames.settings,req.churchId,'church'),listDocs(tableNames.services,req.churchId),listDocs(tableNames.content,req.churchId,{max:100})
  ]);
  const groups=req.identity?.member?.groups || req.identity?.user?.groups || [];
  const canSeeNews=groups.includes('members') || groups.includes('worship') || req.identity?.user?.adminAccess===true || req.identity?.user?.churchAdministrator===true;
  const allowedKinds=canSeeNews ? ['announcement','bulletin'] : ['bulletin'];
  const modules=normalizedModules(church||{});
  const visible=modules.publications?content.filter(x=>x.published!==false && allowedKinds.includes(x.kind)).sort((a,b)=>String(b.publishedAt||b.createdAt).localeCompare(String(a.publishedAt||a.createdAt))):[];
  const churchView=church?{...church,logoUrl:church.logo?.blobName?`/api/public/church-logo?v=${encodeURIComponent(church.updatedAt||church.logo.blobName)}`:(church.logoUrl||'')}:church;
  res.json({church:churchView,modules,services:modules.worship?services.filter(s=>s.active!==false):[],content:visible});
});

publicRouter.get('/church-logo',async(req,res)=>{
  const church=await getDoc(tableNames.settings,req.churchId,'church');
  if(church?.logo?.blobName){
    const f=await downloadBuffer(config.attachmentsContainer,church.logo.blobName);
    res.type(f.contentType); res.setHeader('Cache-Control','public, max-age=300'); return res.send(f.buffer);
  }
  if(church?.logoUrl) return res.redirect(church.logoUrl);
  res.status(204).end();
});

publicRouter.post('/visitor-contact',requireModule('visitors'),publicWriteLimiter,async(req,res)=>{
  const id=`visitor_${crypto.randomUUID().replace(/-/g,'').slice(0,14)}`;
  const doc={id,kind:'visitor_contact',fullName:String(req.body.fullName||'').trim(),email:String(req.body.email||'').trim(),phone:String(req.body.phone||'').trim(),address:String(req.body.address||'').trim(),firstVisit:req.body.firstVisit===true,prayerRequest:String(req.body.prayerRequest||'').trim(),interests:Array.isArray(req.body.interests)?req.body.interests:[],createdAt:nowIso(),status:'new'};
  if(!doc.fullName) return res.status(400).json({error:'Name is required.'});
  await putDoc(tableNames.visitorContacts,req.churchId,id,doc,{status:'new',createdAt:doc.createdAt});
  await enqueueAdminAlert(req.churchId,{type:'visitor',id,summary:`New visitor form from ${doc.fullName}. Open the Church Hub Admin console.`});
  res.status(201).json({ok:true,id});
});
publicRouter.post('/member-access-request',publicWriteLimiter,async(req,res)=>{
  const id=`access_${crypto.randomUUID().replace(/-/g,'').slice(0,14)}`;
  const firstName=String(req.body.firstName||'').trim(),lastName=String(req.body.lastName||'').trim();
  const doc={id,kind:'member_access_request',fullName:`${firstName} ${lastName}`.trim(),firstName,lastName,email:String(req.body.email||'').trim(),phone:String(req.body.phone||'').trim(),createdAt:nowIso(),status:'new'};
  if(!firstName||!lastName) return res.status(400).json({error:'First and last name are required.',code:'NAME_REQUIRED'});
  await putDoc(tableNames.visitorContacts,req.churchId,id,doc,{status:'new',createdAt:doc.createdAt});
  await enqueueAdminAlert(req.churchId,{type:'member_access_request',id,summary:`New member access request from ${doc.fullName}. Open the Admin console.`});
  res.status(201).json({ok:true,id});
});

publicRouter.get('/files/:contentId',async(req,res)=>{
  const doc=await getDoc(tableNames.content,req.churchId,req.params.contentId);
  if(!doc?.attachment?.blobName) return res.status(404).json({error:'File not found'});
  const isPublic = doc.published!==false && ['announcement','bulletin'].includes(doc.kind);
  const groups = req.identity?.member?.groups || req.identity?.user?.groups || [];
  const isMember = groups.includes('members') || groups.includes('worship') || req.identity?.user?.adminAccess===true || req.identity?.user?.churchAdministrator===true;
  if(!isPublic && !isMember) return res.status(403).json({error:'Access denied'});
  const f=await downloadStream(config.attachmentsContainer,doc.attachment.blobName);
  res.type(f.contentType); res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'; sandbox"); res.setHeader('Content-Disposition',`inline; filename="${(doc.attachment.fileName||'file').replace(/[\r\n"]/g,'')}"`);
  res.setHeader('Cache-Control',doc.published!==false?'public, max-age=86400, immutable':'private, max-age=300');
  if(f.contentLength!==undefined)res.setHeader('Content-Length',String(f.contentLength));
  if(f.etag)res.setHeader('ETag',f.etag);
  if(f.lastModified)res.setHeader('Last-Modified',new Date(f.lastModified).toUTCString());
  if(req.headers['if-none-match']&&f.etag&&req.headers['if-none-match']===f.etag){f.stream?.destroy?.();return res.status(304).end();}
  f.stream.on('error',e=>{if(!res.headersSent)res.status(502).end();else res.destroy(e);});
  f.stream.pipe(res);
});
