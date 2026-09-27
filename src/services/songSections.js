// Song lists belong to the position in a program, not merely the assigned singer.
// Existing assignments store songIds for the main block: retain them without a data migration.
export function songSectionForItem(item){
  if(item?.songSection)return String(item.songSection);
  const label=String(item?.labelEs||item?.label||item?.labelEn||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(/invitacion|invitation/.test(label))return 'invitation';
  if(/canto.*(cena|comunion)|communion song/.test(label))return 'communion';
  if(/canto.*ofrenda|offering song/.test(label))return 'offering';
  return 'main';
}
export function songSectionsFor(template,assignmentKey){
  const map=new Map();
  for(const item of template?.items||[]){
    if(item.ministryId!=='ministry_songs'||!(item.assignmentKeys||[]).includes(assignmentKey))continue;
    const key=songSectionForItem(item);
    if(!map.has(key))map.set(key,{key,labelEs:item.labelEs||item.label||key,labelEn:item.labelEn||item.label||key,single:key!=='main'});
  }
  return [...map.values()];
}
export function songPartsFor(assignment){
  const raw=assignment?.songParts&&typeof assignment.songParts==='object'&&!Array.isArray(assignment.songParts)?assignment.songParts:{};
  return {...raw,main:Array.isArray(raw.main)?raw.main:(Array.isArray(assignment?.songIds)?assignment.songIds:[])};
}
export function allSongIds(assignment){
  return [...new Set(Object.values(songPartsFor(assignment)).flatMap(ids=>Array.isArray(ids)?ids:[]))];
}
export function missingSongSections(assignment,sections){
  const parts=songPartsFor(assignment);
  return sections.filter(s=>!Array.isArray(parts[s.key])||parts[s.key].length===0);
}
export function songSelectionComplete(assignment,sections){return sections.length>0&&missingSongSections(assignment,sections).length===0;}

export function repeatedSongsInOtherSections(assignment,sectionKey,requested){
  const own=songPartsFor(assignment);
  const other=new Set(Object.entries(own).filter(([key])=>key!==sectionKey).flatMap(([,ids])=>Array.isArray(ids)?ids:[]));
  return requested.map(String).filter(id=>other.has(id));
}
