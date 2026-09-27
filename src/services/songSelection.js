import {songSectionsFor,songPartsFor,allSongIds,repeatedSongsInOtherSections} from './songSections.js';
import { tableNames } from '../config.js';
import { getDoc, listDocs } from '../storage/repository.js';

export async function songSelectionContext(churchId, assignment, memberId){
  if(!assignment) throw Object.assign(new Error('Assignment not found'),{statusCode:404});
  const [songs, siblings, services, program] = await Promise.all([
    listDocs(tableNames.songs,churchId,{max:2000}),
    listDocs(tableNames.assignments,churchId,{filter:`programId eq '${String(assignment.programId).replace(/'/g,"''")}'`,max:200}),
    listDocs(tableNames.services,churchId,{max:200}),
    getDoc(tableNames.programs,churchId,assignment.programId)
  ]);
  const activeSongs=songs.filter(s=>s.active!==false);
  const usedByOtherAssignments=new Set();
  for(const a of siblings){
    if(a.id===assignment.id) continue;
    if(a.ministryId!=='ministry_songs') continue;
    if(a.status==='cancelled'||a.status==='unfilled') continue;
    for(const id of allSongIds(a)) usedByOtherAssignments.add(String(id));
  }

  const allAssignments=await listDocs(tableNames.assignments,churchId,{filter:`serviceId eq '${String(assignment.serviceId).replace(/'/g,"''")}'`,max:5000});
  const songMap=new Map(songs.map(s=>[s.id,s]));
  const history=allAssignments
    .filter(a=>a.id!==assignment.id && a.assignmentKey===assignment.assignmentKey && a.dateISO<assignment.dateISO && Array.isArray(a.songIds) && a.songIds.length>0 && (a.songsUpdatedBy===memberId || a.currentMemberId===memberId || a.originalMemberId===memberId))
    .sort((a,b)=>String(b.dateISO).localeCompare(String(a.dateISO)))
    .slice(0,12)
    .map(a=>({
      assignmentId:a.id,
      dateISO:a.dateISO,
      songIds:(a.songIds||[]).filter(id=>songMap.has(id)),
      songs:(a.songIds||[]).map(id=>songMap.get(id)).filter(Boolean)
    }))
    .filter(x=>x.songIds.length>0);
  const service=services.find(s=>s.id===assignment.serviceId)||null;
  const template=program?await getDoc(tableNames.templates,churchId,program.templateId):null;
  return {songs:activeSongs,usedSongIds:[...usedByOtherAssignments],history,service,sections:songSectionsFor(template,assignment.assignmentKey),songParts:songPartsFor(assignment)};
}

export async function validateNoDuplicateSongsInProgram(churchId,assignment,requested,sectionKey=null){
  if(sectionKey){
    const repeated=repeatedSongsInOtherSections(assignment,sectionKey,requested);
    if(repeated.length)throw Object.assign(new Error('This song is already selected for another section of your assignment.'),{statusCode:409,code:'DUPLICATE_SERVICE_SONGS',conflicts:[{assignmentId:assignment.id,songIds:repeated}]});
  }
  const siblings=await listDocs(tableNames.assignments,churchId,{filter:`programId eq '${String(assignment.programId).replace(/'/g,"''")}'`,max:200});
  const conflicts=[];
  const requestedSet=new Set(requested.map(String));
  for(const a of siblings){
    if(a.id===assignment.id || a.ministryId!=='ministry_songs' || a.status==='cancelled' || a.status==='unfilled') continue;
    const overlap=allSongIds(a).map(String).filter(id=>requestedSet.has(id));
    if(overlap.length) conflicts.push({assignmentId:a.id,assignmentKey:a.assignmentKey,songIds:overlap});
  }
  if(conflicts.length){
    const err=Object.assign(new Error('A selected song is already being used by another song leader in this service.'),{statusCode:409,code:'DUPLICATE_SERVICE_SONGS',conflicts});
    throw err;
  }
  return true;
}
