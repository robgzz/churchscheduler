import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, tableNames } from '../config.js';
import { getDoc, putDoc, listDocs, nowIso } from '../storage/repository.js';
import { initialFuneralEligibility } from './specialServices.js';
import { completePastAssignments, rebalanceRegularScheduleFrom } from '../scheduler/engine.js';

const here=path.dirname(fileURLToPath(import.meta.url));
const SEED_VERSION=7;
const FAIRNESS_V3_MIGRATION_ID='migration_smart_fair_v3_october_2026';
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

// V6.4 anthology reconciliation: the supplied slide filenames are authoritative.
// Match by normalized title, NEVER by number alone: different old titles at the same
// number must not silently inherit historical program assignments.
function songTitleKey(value=''){
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}
export async function reconcileAuthoritativeSongs(churchId,canonicalSongs){
  const existing=await listDocs(tableNames.songs,churchId,{max:10000});
  const claimed=new Set();const canonicalIds=new Set();
  let matched=0,created=0,deactivated=0;
  for(const canonical of canonicalSongs){
    // Prefer identical title AND number, otherwise identical title with an older number.
    // Stable canonical IDs also make interrupted migrations safely resumable.
    const norm=songTitleKey(canonical.titleEs||canonical.title);
    const candidates=existing.filter(old=>!claimed.has(old.id)&&songTitleKey(old.titleEs||old.title)===norm);
    const old=existing.find(row=>row.id===canonical.id&&!claimed.has(row.id))||
      candidates.find(row=>String(row.number)===String(canonical.number))||candidates[0];
    if(old)claimed.add(old.id);
    const id=old?.id||canonical.id;canonicalIds.add(id);
    const row={...(old||{}),...canonical,id,active:true,
      // The submitted anthology always replaces historical numbering and lyrics.
      number:canonical.number,title:canonical.title,titleEs:canonical.titleEs,
      titleEn:old?.titleEn||canonical.titleEn||'',markdown:canonical.markdown,
      source:'anthology_user_supplied',authoritative:true,updatedAt:nowIso(),
      createdAt:old?.createdAt||nowIso()};
    await putDoc(tableNames.songs,churchId,id,row,{title:row.titleEs,number:row.number,active:true});
    if(old)matched++;else created++;
  }
  // Do not destroy old rows referenced by old service/program history; hide only.
  for(const old of existing){
    if(canonicalIds.has(old.id)||old.active===false)continue;
    await putDoc(tableNames.songs,churchId,old.id,{...old,active:false,
      replacedBy:'v6.4-authoritative-anthology',updatedAt:nowIso()},
      {title:old.titleEs||old.title||'',number:String(old.number||''),active:false});
    deactivated++;
  }
  return {matched,created,deactivated};
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
      algorithm:{
        ...(church.algorithm||{}),
        ...(existingChurch.algorithm||{}),
        mode:'SMART_FAIR_V3',
        fairnessBaselineDate:existingChurch.algorithm?.fairnessBaselineDate||church.algorithm?.fairnessBaselineDate||'2026-10-01',
        weights:existingChurch.algorithm?.mode==='SMART_FAIR_V3'?{...(church.algorithm?.weights||{}),...(existingChurch.algorithm?.weights||{})}:{...(church.algorithm?.weights||{})}
      },
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


  // One-time migration; skips previously configured funeral profiles. Explicit
  // admin changes, including inactive services, stay authoritative thereafter.
  const seededMembers=await listDocs(tableNames.members,churchId,{max:5000});
  for(const member of seededMembers){
    const initial=initialFuneralEligibility(member,templates);
    if(!initial)continue;
    const newMember={...initial,updatedAt:nowIso()};
    await putDoc(tableNames.members,churchId,member.id,newMember,{username:member.username||'',active:member.active!==false,adminAccess:member.adminAccess===true,churchAdministrator:member.churchAdministrator===true});
  }

  const anthology=await reconcileAuthoritativeSongs(churchId,songDoc.songs||[]);

  // Smart Fair V3 cutover requested for the live October rotation. The first
  // two programs are intentionally left untouched: Wednesday Oct 14 and Sunday
  // Class Oct 18. Rebalancing begins with Sunday Worship Oct 18 and continues
  // chronologically across the remaining visible three-week horizon.
  let fairnessMigration=await getDoc(tableNames.settings,churchId,FAIRNESS_V3_MIGRATION_ID);
  if(!fairnessMigration?.completedAt){
    const completedBeforeRebalance=await completePastAssignments(churchId);
    const preservedPrograms=['svc_wednesday_class__2026-10-14','svc_sunday_class__2026-10-18'];
    const rebalance=await rebalanceRegularScheduleFrom(churchId,{
      startDate:'2026-10-18',startServiceId:'svc_sunday_worship',preserveProgramIds:preservedPrograms,source:'v6.7.0-smart-fair-v3-migration'
    });
    fairnessMigration={id:FAIRNESS_V3_MIGRATION_ID,completedAt:nowIso(),baselineDate:'2026-10-01',completedBeforeRebalance,preservedPrograms,
      startProgramId:'svc_sunday_worship__2026-10-18',programCount:rebalance.programCount,reassigned:rebalance.reassigned,created:rebalance.created,protectedCount:rebalance.protectedCount};
    await putDoc(tableNames.settings,churchId,FAIRNESS_V3_MIGRATION_ID,fairnessMigration);
  }

  await putDoc(tableNames.settings,churchId,'seed',{id:'seed',version:SEED_VERSION,profile:config.seedProfile,completedAt:nowIso(),memberCount,songCount:(songDoc.songs||[]).length,anthology,fairnessMigration});
  return {seeded:true,version:SEED_VERSION,memberCount,songCount:(songDoc.songs||[]).length,anthology,fairnessMigration};
}

export async function bootstrapSummary(churchId=config.churchId){
  const [church,members,users]=await Promise.all([
    getDoc(tableNames.settings,churchId,'church'),listDocs(tableNames.members,churchId),listDocs(tableNames.users,churchId)
  ]);
  const owner=users.find(u=>u.churchAdministrator===true);
  return { church, memberCount:members.length, ownerConfigured:!!owner, initialOwnerUsername:config.initialOwnerUsername };
}
