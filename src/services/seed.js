import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, tableNames } from '../config.js';
import { getDoc, putDoc, listDocs, nowIso } from '../storage/repository.js';

const here=path.dirname(fileURLToPath(import.meta.url));
async function readSeed(name){
  const file=path.resolve(here,`../../seed/${config.seedProfile}/${name}`);
  return JSON.parse(await fs.readFile(file,'utf8'));
}

export async function seedIfNeeded(churchId=config.churchId){
  if (!config.seedProfile) return {seeded:false,reason:'SEED_PROFILE not set'};
  const marker=await getDoc(tableNames.settings,churchId,'seed');
  if (marker?.version>=3) return {seeded:false,version:marker.version};
  const [church,ministries,services,templates,members,songDoc]=await Promise.all([
    readSeed('church.json'),readSeed('ministries.json'),readSeed('services.json'),readSeed('templates.json'),readSeed('members.json'),readSeed('songs.json')
  ]);
  if (!await getDoc(tableNames.settings,churchId,'church')) await putDoc(tableNames.settings,churchId,'church',{...church,id:'church',seededAt:nowIso()});
  for (const m of ministries) if (!await getDoc(tableNames.ministries,churchId,m.id)) await putDoc(tableNames.ministries,churchId,m.id,m,{active:m.active!==false,label:m.label});
  for (const s of services) if (!await getDoc(tableNames.services,churchId,s.id)) await putDoc(tableNames.services,churchId,s.id,s,{active:s.active!==false,label:s.label});
  for (const t of templates) if (!await getDoc(tableNames.templates,churchId,t.id)) await putDoc(tableNames.templates,churchId,t.id,t,{serviceId:t.serviceId});
  let memberCount=0;
  for (const m of members){
    if (!await getDoc(tableNames.members,churchId,m.id)) {
      await putDoc(tableNames.members,churchId,m.id,m,{username:m.username || '',active:m.active!==false,adminAccess:false,churchAdministrator:false});
      memberCount++;
    }
  }
  for (const s of songDoc.songs || []) if (!await getDoc(tableNames.songs,churchId,s.id)) await putDoc(tableNames.songs,churchId,s.id,s,{title:s.title || '',number:String(s.number || '')});
  await putDoc(tableNames.settings,churchId,'seed',{id:'seed',version:3,profile:config.seedProfile,completedAt:nowIso(),memberCount,songCount:(songDoc.songs||[]).length});
  return {seeded:true,version:3,memberCount,songCount:(songDoc.songs||[]).length};
}

export async function bootstrapSummary(churchId=config.churchId){
  const [church,members,users]=await Promise.all([
    getDoc(tableNames.settings,churchId,'church'),listDocs(tableNames.members,churchId),listDocs(tableNames.users,churchId)
  ]);
  const owner=users.find(u=>u.churchAdministrator===true);
  return { church, memberCount:members.length, ownerConfigured:!!owner, initialOwnerUsername:config.initialOwnerUsername };
}
