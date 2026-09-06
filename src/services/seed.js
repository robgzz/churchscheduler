import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, tableNames } from '../config.js';
import { getDoc, putDoc, listDocs, nowIso } from '../storage/repository.js';

const here=path.dirname(fileURLToPath(import.meta.url));
const SEED_VERSION=4;
async function readSeed(name){
  const file=path.resolve(here,`../../seed/${config.seedProfile}/${name}`);
  return JSON.parse(await fs.readFile(file,'utf8'));
}

function mergeTemplate(existing,seed){
  if(!existing) return seed;
  const seedItems=new Map((seed.items||[]).map(i=>[i.id,i]));
  return {
    ...seed,
    ...existing,
    labelEn:existing.labelEn||seed.labelEn||seed.label,
    labelEs:existing.labelEs||seed.labelEs||seed.label,
    items:(existing.items||seed.items||[]).map(item=>{
      const si=seedItems.get(item.id)||{};
      return {...si,...item,labelEn:item.labelEn||si.labelEn||item.label||si.label||'',labelEs:item.labelEs||si.labelEs||item.label||si.label||''};
    })
  };
}

export async function seedIfNeeded(churchId=config.churchId){
  if (!config.seedProfile) return {seeded:false,reason:'SEED_PROFILE not set'};
  const marker=await getDoc(tableNames.settings,churchId,'seed');
  if (marker?.version>=SEED_VERSION) return {seeded:false,version:marker.version};
  const [church,ministries,services,templates,members,songDoc]=await Promise.all([
    readSeed('church.json'),readSeed('ministries.json'),readSeed('services.json'),readSeed('templates.json'),readSeed('members.json'),readSeed('songs.json')
  ]);

  if(String(church.id||'') !== String(churchId)) throw new Error(`Seed profile ${config.seedProfile} belongs to ${church.id}, not ${churchId}. Refusing cross-church seed.`);

  const existingChurch=await getDoc(tableNames.settings,churchId,'church');
  if(!existingChurch){
    await putDoc(tableNames.settings,churchId,'church',{...church,id:'church',seededAt:nowIso()});
  }else{
    const merged={
      ...church,
      ...existingChurch,
      churchName:existingChurch.churchName||church.churchName,
      churchNameEn:existingChurch.churchNameEn||existingChurch.churchName||church.churchNameEn||church.churchName,
      churchNameEs:existingChurch.churchNameEs||existingChurch.churchName||church.churchNameEs||church.churchName,
      logoUrl:existingChurch.logoUrl||church.logoUrl||'',
      updatedAt:nowIso()
    };
    await putDoc(tableNames.settings,churchId,'church',merged);
  }

  for(const m of ministries){
    const old=await getDoc(tableNames.ministries,churchId,m.id);
    const merged=old?{...m,...old,labelEn:old.labelEn||m.labelEn||m.label,labelEs:old.labelEs||old.label||m.labelEs||m.label}:{...m};
    await putDoc(tableNames.ministries,churchId,m.id,merged,{active:merged.active!==false,label:merged.labelEs||merged.label||merged.labelEn});
  }
  for(const s of services){
    const old=await getDoc(tableNames.services,churchId,s.id);
    const merged=old?{...s,...old,labelEn:old.labelEn||old.label||s.labelEn||s.label,labelEs:old.labelEs||s.labelEs||old.label||s.label}:{...s};
    await putDoc(tableNames.services,churchId,s.id,merged,{active:merged.active!==false,label:merged.labelEn||merged.label||merged.labelEs});
  }
  for(const t of templates){
    const old=await getDoc(tableNames.templates,churchId,t.id);
    const merged=mergeTemplate(old,t);
    await putDoc(tableNames.templates,churchId,t.id,merged,{serviceId:merged.serviceId});
  }

  let memberCount=0;
  for(const m of members){
    const old=await getDoc(tableNames.members,churchId,m.id);
    if(!old){
      await putDoc(tableNames.members,churchId,m.id,{...m,preferences:m.preferences||{locale:church.defaultLocale||'es',theme:'system'}},{username:m.username||'',active:m.active!==false,adminAccess:false,churchAdministrator:false});
      memberCount++;
    }else if(!old.preferences){
      old.preferences={locale:church.defaultLocale||'es',theme:'system'};
      await putDoc(tableNames.members,churchId,old.id,old,{username:old.username||'',active:old.active!==false,adminAccess:old.adminAccess===true,churchAdministrator:old.churchAdministrator===true});
    }
  }

  for(const s of songDoc.songs||[]){
    const old=await getDoc(tableNames.songs,churchId,s.id);
    const merged=old?{...s,...old,titleEs:old.titleEs||old.title||s.titleEs||s.title,titleEn:old.titleEn||s.titleEn||''}:{...s};
    await putDoc(tableNames.songs,churchId,s.id,merged,{title:merged.titleEs||merged.title||merged.titleEn||'',number:String(merged.number||''),active:merged.active!==false});
  }

  await putDoc(tableNames.settings,churchId,'seed',{id:'seed',version:SEED_VERSION,profile:config.seedProfile,completedAt:nowIso(),memberCount,songCount:(songDoc.songs||[]).length});
  return {seeded:true,version:SEED_VERSION,memberCount,songCount:(songDoc.songs||[]).length};
}

export async function bootstrapSummary(churchId=config.churchId){
  const [church,members,users]=await Promise.all([
    getDoc(tableNames.settings,churchId,'church'),listDocs(tableNames.members,churchId),listDocs(tableNames.users,churchId)
  ]);
  const owner=users.find(u=>u.churchAdministrator===true);
  return { church, memberCount:members.length, ownerConfigured:!!owner, initialOwnerUsername:config.initialOwnerUsername };
}
