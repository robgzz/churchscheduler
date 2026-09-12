import crypto from 'node:crypto';
import { tableNames } from '../config.js';
import { getDoc, listDocs, putDoc, nowIso } from '../storage/repository.js';
import { parseCsv, parseXlsx, parseSpreadsheetXml, splitAssignmentHeader, inferServiceSchedule, songTemplateRows, memberTemplateRows, norm, findValue, hasColumn } from './importFormats.js';
import { provisionAccountsBatch } from './accountProvisioning.js';
import { destroyAllUserSessions } from '../auth/sessions.js';
export { parseCsv, parseXlsx, parseSpreadsheetXml, splitAssignmentHeader, inferServiceSchedule, songTemplateRows, memberTemplateRows } from './importFormats.js';

const safe=v=>v==null?'':String(v);
const slug=v=>norm(v).replace(/\s+/g,'_').slice(0,48)||crypto.randomUUID().slice(0,8);
const truthy=v=>['1','true','yes','y','x','checked','si','sí','✓'].includes(norm(v));
const FALSEY=new Set(['0','false','no','n','']);

function splitList(v){return String(v||'').split(';').map(x=>x.trim()).filter(Boolean);}

function csvEscape(v){const s=safe(v);return /[",\n\r]/.test(s)?`"${s.replaceAll('"','""')}"`:s;}
export function rowsToCsv(rows){
  const headers=Object.keys(rows[0]||{});
  return [headers.map(csvEscape).join(','),...rows.map(r=>headers.map(h=>csvEscape(r[h])).join(','))].join('\r\n');
}
function xmlEsc(v){return safe(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');}
export function rowsToExcelXml(rows,sheetName='Sheet1'){
  const headers=Object.keys(rows[0]||{});
  const rowXml=r=>`<Row>${headers.map(h=>`<Cell><Data ss:Type="String">${xmlEsc(r[h])}</Data></Cell>`).join('')}</Row>`;
  return `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="${xmlEsc(sheetName)}"><Table><Row>${headers.map(h=>`<Cell><Data ss:Type="String">${xmlEsc(h)}</Data></Cell>`).join('')}</Row>${rows.map(rowXml).join('')}</Table></Worksheet></Workbook>`;
}

export async function parseTabularUpload({fileName='',contentType='',buffer}){
  const lower=String(fileName).toLowerCase(),ct=String(contentType).toLowerCase();
  if(lower.endsWith('.csv')||ct.includes('csv')||ct.startsWith('text/csv')) return parseCsv(buffer.toString('utf8').replace(/^\uFEFF/,''));
  if(lower.endsWith('.xlsx')||ct.includes('openxmlformats-officedocument.spreadsheetml')) return parseXlsx(buffer);
  if(lower.endsWith('.xls')||ct.includes('ms-excel')){const text=buffer.toString('utf8');if(/^\s*<\?xml|<Workbook\b/i.test(text))return parseSpreadsheetXml(text);throw Object.assign(new Error('Legacy binary .xls files are not supported. Save the file as .xlsx or .csv and upload it again.'),{statusCode:400,code:'LEGACY_XLS_UNSUPPORTED'});}
  throw Object.assign(new Error('Upload a CSV, XLSX, or Excel XML (.xls) file.'),{statusCode:400,code:'UNSUPPORTED_IMPORT_FILE'});
}

function roleBase(label){
  const raw=String(label||'').trim();
  const base=raw.replace(/\s+(?:#?\d+|[A-C])$/i,'').trim();
  const n=norm(base);
  if(/^(songs?|cantos?|song leader|director de cantos)$/.test(n))return {key:'songs',labelEn:'Songs',labelEs:'Cantos',id:'ministry_songs'};
  return {key:slug(base),labelEn:base,labelEs:base,id:`ministry_${slug(base)}`};
}
async function ensureMinistry(churchId,assignmentName,existingByNorm){
  const role=roleBase(assignmentName);let found=existingByNorm.get(norm(role.labelEn))||existingByNorm.get(norm(role.labelEs));
  if(found)return found;
  found={id:role.id,label:role.labelEn,labelEn:role.labelEn,labelEs:role.labelEs,active:true,createdAt:nowIso(),source:'bulk_import'};
  await putDoc(tableNames.ministries,churchId,found.id,found,{active:true,label:found.label});existingByNorm.set(norm(found.labelEn),found);existingByNorm.set(norm(found.labelEs),found);return found;
}
async function ensureService(churchId,serviceName,servicesByNorm){
  let s=servicesByNorm.get(norm(serviceName));if(s)return s;
  const id=`svc_${slug(serviceName)}`;const schedule=inferServiceSchedule(serviceName);const templateId=`tpl_${slug(serviceName)}`;
  s={id,label:serviceName,labelEn:serviceName,labelEs:serviceName,active:!schedule.scheduleNeedsReview,startTime:schedule.startTime,recurrence:schedule.recurrence,templateId,scheduleNeedsReview:schedule.scheduleNeedsReview,createdAt:nowIso(),source:'bulk_import'};
  await putDoc(tableNames.services,churchId,id,s,{active:s.active!==false,label:s.label});
  await putDoc(tableNames.templates,churchId,templateId,{id:templateId,serviceId:id,label:`${serviceName} Program`,items:[],createdAt:nowIso(),source:'bulk_import'},{serviceId:id});
  servicesByNorm.set(norm(serviceName),s);return s;
}
async function ensureAssignmentDefinition(churchId,service,assignmentName,ministry){
  const template=await getDoc(tableNames.templates,churchId,service.templateId)||{id:service.templateId,serviceId:service.id,label:`${service.label} Program`,items:[]};
  const existing=(template.items||[]).find(i=>norm(i.labelEn||i.labelEs||i.label)===norm(assignmentName));
  if(existing)return {template,item:existing,created:false};
  const keyBase=slug(assignmentName);let key=keyBase,c=2;const used=new Set((template.items||[]).flatMap(i=>i.assignmentKeys||[]));while(used.has(key))key=`${keyBase}_${c++}`;
  const item={id:`item_${slug(service.label)}_${key}`,label:assignmentName,labelEn:assignmentName,labelEs:assignmentName,ministryId:ministry.id,assignmentKeys:[key]};
  template.items=[...(template.items||[]),item];template.updatedAt=nowIso();await putDoc(tableNames.templates,churchId,template.id,template,{serviceId:service.id});
  return {template,item,created:true};
}

export async function importSongs(churchId,rows){
  const existing=await listDocs(tableNames.songs,churchId,{max:10000});const byNumber=new Map(existing.filter(s=>safe(s.number)).map(s=>[norm(s.number),s]));let created=0,updated=0,skipped=0;
  for(const row of rows){const number=findValue(row,['Number','Song Number','Hymn Number','Numero','Número']);const titleEs=findValue(row,['Title Spanish','Spanish Title','Titulo Espanol','Título Español','Title','Song Title']);const titleEn=findValue(row,['Title English','English Title','Titulo Ingles','Título Inglés']);const activeRaw=findValue(row,['Active','Activo']);if(!number&&!titleEs&&!titleEn){skipped++;continue;}const old=number?byNumber.get(norm(number)):null;const id=old?.id||`song_${crypto.randomUUID().replace(/-/g,'').slice(0,12)}`;const doc={...(old||{}),id,number,title:titleEs||titleEn,titleEs:titleEs||old?.titleEs||old?.title||'',titleEn:titleEn||old?.titleEn||'',active:activeRaw?(!FALSEY.has(norm(activeRaw))):old?.active!==false,updatedAt:nowIso(),createdAt:old?.createdAt||nowIso(),source:old?.source||'bulk_import'};if(!doc.title){skipped++;continue;}await putDoc(tableNames.songs,churchId,id,doc,{title:doc.title,number:doc.number,active:doc.active});if(old)updated++;else{created++;if(number)byNumber.set(norm(number),doc);}}
  return {created,updated,skipped,total:rows.length};
}

export async function importMembersAndAssignments(churchId,rows){
  if(!Array.isArray(rows)||!rows.length) throw Object.assign(new Error('The member file does not contain any data rows.'),{statusCode:400,code:'EMPTY_MEMBER_IMPORT'});

  const [members,services,ministries]=await Promise.all([
    listDocs(tableNames.members,churchId,{max:10000}),
    listDocs(tableNames.services,churchId,{max:2000}),
    listDocs(tableNames.ministries,churchId,{max:2000})
  ]);

  const byEmail=new Map(members.filter(m=>m.email).map(m=>[norm(m.email),m]));
  const byName=new Map(members.map(m=>[norm(m.fullName),m]));
  const servicesByNorm=new Map();
  for(const service of services)for(const label of [service.label,service.labelEn,service.labelEs])if(label)servicesByNorm.set(norm(label),service);
  const ministriesByNorm=new Map();
  for(const ministry of ministries)for(const label of [ministry.label,ministry.labelEn,ministry.labelEs])if(label)ministriesByNorm.set(norm(label),ministry);

  const firstRow=rows[0]||{};
  const headers=Object.keys(firstRow);
  const assignmentHeaders=headers.map(header=>({header,parsed:splitAssignmentHeader(header)})).filter(x=>x.parsed);
  const hasSnapshotColumns=['Ministries','Services','AssignmentEligibility'].every(name=>hasColumn(firstRow,[name]));
  const snapshotMode=hasSnapshotColumns&&hasColumn(firstRow,['AssignmentEligibilityMode','Assignment Eligibility Mode']);
  const adminColumnPresent=hasColumn(firstRow,['Admin','Administrator','Administrador','Admin Access']);
  const ownerColumnPresent=hasColumn(firstRow,['ChurchAdministrator','Church Administrator']);

  // Ownership is intentionally NOT transferable by spreadsheet. A roster may preserve the
  // existing owner marker, but cannot create a second Church Administrator or transfer ownership.
  // Validate this before any import writes so a malformed file cannot partially mutate the church.
  if(ownerColumnPresent){
    for(const row of rows){
      const requestedOwner=truthy(findValue(row,['ChurchAdministrator','Church Administrator']));
      if(!requestedOwner)continue;
      let fullName=findValue(row,['Full Name','Name','Nombre Completo','Nombre']);
      const first=findValue(row,['First Name','First Name / Nombre','Nombre']);
      const last=findValue(row,['Last Name','Last Name / Apellido','Apellido']);
      if(!fullName)fullName=`${first} ${last}`.trim();
      const email=findValue(row,['Email','Correo']);
      const existing=(email&&byEmail.get(norm(email)))||byName.get(norm(fullName));
      if(!existing?.churchAdministrator){
        throw Object.assign(new Error(`ChurchAdministrator cannot be assigned by roster import (${fullName||'unknown member'}). Preserve the existing Church Administrator or use the ownership-transfer workflow.`),{statusCode:409,code:'OWNER_IMPORT_FORBIDDEN'});
      }
    }
  }

  const defs=new Map();
  let servicesCreated=0,assignmentsCreated=0,ministriesCreated=0;
  for(const {header,parsed} of assignmentHeaders){
    const beforeService=servicesByNorm.has(norm(parsed.serviceName));
    const service=await ensureService(churchId,parsed.serviceName,servicesByNorm);
    if(!beforeService)servicesCreated++;
    const role=roleBase(parsed.assignmentName);
    const beforeMinistry=ministriesByNorm.has(norm(role.labelEn))||ministriesByNorm.has(norm(role.labelEs));
    const ministry=await ensureMinistry(churchId,parsed.assignmentName,ministriesByNorm);
    if(!beforeMinistry)ministriesCreated++;
    const definition=await ensureAssignmentDefinition(churchId,service,parsed.assignmentName,ministry);
    if(definition.created)assignmentsCreated++;
    defs.set(header,{service,ministry,item:definition.item});
  }

  let membersCreated=0,membersUpdated=0,skipped=0,eligibilityLinks=0;
  let adminAccessGranted=0,adminAccessRevoked=0;
  const accountEntries=[];

  for(const row of rows){
    let fullName=findValue(row,['Full Name','Name','Nombre Completo','Nombre']);
    const first=findValue(row,['First Name','First Name / Nombre','Nombre']);
    const last=findValue(row,['Last Name','Last Name / Apellido','Apellido']);
    if(!fullName)fullName=`${first} ${last}`.trim();
    const email=findValue(row,['Email','Correo']);
    const phone=findValue(row,['Phone','Telefono','Teléfono']);
    const username=findValue(row,['Username','Usuario']).toLowerCase();
    const activeRaw=findValue(row,['Active','Activo']);
    if(!fullName){skipped++;continue;}

    let member=(email&&byEmail.get(norm(email)))||byName.get(norm(fullName));
    const isNew=!member;
    member=member?{...member}:{
      id:`m_${crypto.randomUUID().replace(/-/g,'').slice(0,12)}`,
      fullName,username,email,phone,active:true,groups:['members','worship'],ministries:[],serviceAvailability:[],
      unavailability:[],assignmentEligibility:[],assignmentEligibilityMode:'explicit',adminAccess:false,churchAdministrator:false,createdAt:nowIso()
    };

    const previousAdmin=member.adminAccess===true;
    member.fullName=fullName;
    member.email=email||member.email||'';
    member.phone=phone||member.phone||'';
    member.username=username||member.username||'';
    if(activeRaw)member.active=!FALSEY.has(norm(activeRaw));
    member.groups=Array.from(new Set([...(member.groups||[]),'members','worship']));
    member.ministries=Array.from(new Set(member.ministries||[]));
    member.serviceAvailability=Array.from(new Set(member.serviceAvailability||[]));
    member.assignmentEligibility=Array.from(new Set(member.assignmentEligibility||[]));
    member.assignmentEligibilityMode='explicit';

    if(adminColumnPresent){
      const requestedAdmin=truthy(findValue(row,['Admin','Administrator','Administrador','Admin Access']));
      // The Church Administrator necessarily retains admin access even if the row says No.
      member.adminAccess=member.churchAdministrator===true?true:requestedAdmin;
      if(!previousAdmin&&member.adminAccess)adminAccessGranted++;
      if(previousAdmin&&!member.adminAccess)adminAccessRevoked++;
    }

    if(snapshotMode&&norm(findValue(row,['AssignmentEligibilityMode','Assignment Eligibility Mode']))==='explicit'){
      const requestedMinistries=splitList(findValue(row,['Ministries','Ministerios']));
      const requestedServices=splitList(findValue(row,['Services','Servicios']));
      const requestedEligibility=splitList(findValue(row,['AssignmentEligibility','Assignment Eligibility']));
      member.ministries=requestedMinistries.map(label=>ministriesByNorm.get(norm(label))?.id).filter(Boolean);
      member.serviceAvailability=requestedServices.map(label=>servicesByNorm.get(norm(label))?.id).filter(Boolean);
      member.assignmentEligibility=requestedEligibility.filter(token=>/^svc_[a-z0-9_]+::[a-z0-9_]+$/i.test(token));
      member.assignmentEligibilityMode='explicit';
      eligibilityLinks+=member.assignmentEligibility.length;
    }else{
      for(const {header} of assignmentHeaders){
        if(!truthy(row[header]))continue;
        const definition=defs.get(header);if(!definition)continue;
        if(!member.ministries.includes(definition.ministry.id))member.ministries.push(definition.ministry.id);
        if(!member.serviceAvailability.includes(definition.service.id))member.serviceAvailability.push(definition.service.id);
        for(const key of definition.item.assignmentKeys||[]){
          const token=`${definition.service.id}::${key}`;
          if(!member.assignmentEligibility.includes(token)){member.assignmentEligibility.push(token);eligibilityLinks++;}
        }
      }
    }

    member.updatedAt=nowIso();
    await putDoc(tableNames.members,churchId,member.id,member,{username:member.username||'',active:member.active!==false,adminAccess:member.adminAccess===true,churchAdministrator:member.churchAdministrator===true});
    accountEntries.push({member,firstName:first,lastName:last});
    if(isNew){
      membersCreated++;
      if(email)byEmail.set(norm(email),member);
      byName.set(norm(fullName),member);
    }else membersUpdated++;
  }

  // Batch account provisioning creates deterministic usernames for members without accounts.
  // Existing accounts are never re-created or have their password replaced.
  const provisioned=await provisionAccountsBatch(churchId,accountEntries,{initialPassword:'welcome'});
  const accountsCreated=provisioned.created;

  // Synchronize imported administrative capability to existing user records as well as member
  // profiles. Role changes invalidate existing sessions so the new authorization state is applied
  // immediately at the next sign-in. Password hashes are never touched here.
  let accountRoleSyncs=0,sessionsRevoked=0;
  for(const result of provisioned.results||[]){
    const member=result.member,user=result.user;
    if(!user||!result.username)continue;
    const desiredAdmin=member.adminAccess===true;
    const desiredOwner=member.churchAdministrator===true;
    const desiredActive=member.active!==false;
    const desiredGroups=member.groups||user.groups||[];
    const roleChanged=user.adminAccess!==desiredAdmin||user.churchAdministrator!==desiredOwner||user.active!==desiredActive||JSON.stringify(user.groups||[])!==JSON.stringify(desiredGroups);
    if(!roleChanged)continue;
    const nextUser={...user,adminAccess:desiredAdmin,churchAdministrator:desiredOwner,active:desiredActive,groups:desiredGroups,updatedAt:nowIso()};
    await putDoc(tableNames.users,churchId,result.username,nextUser,{memberId:member.id,active:desiredActive,adminAccess:desiredAdmin,churchAdministrator:desiredOwner});
    accountRoleSyncs++;
    if(result.created===false){await destroyAllUserSessions(churchId,result.username);sessionsRevoked++;}
  }

  return {
    membersCreated,membersUpdated,accountsCreated,accountsPreserved:provisioned.preserved,
    initialPassword:accountsCreated?'welcome':undefined,skipped,servicesCreated,ministriesCreated,assignmentsCreated,eligibilityLinks,
    adminColumnApplied:adminColumnPresent,adminAccessGranted,adminAccessRevoked,accountRoleSyncs,sessionsRevoked,
    totalRows:rows.length,assignmentColumns:assignmentHeaders.length,authoritativeSnapshot:snapshotMode,
    servicesNeedingScheduleReview:[...servicesByNorm.values()].filter(s=>s.source==='bulk_import'&&s.scheduleNeedsReview).map(s=>s.label)
  };
}
