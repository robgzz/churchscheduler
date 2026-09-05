export function assignmentUnits(template){
  const units=new Map();
  for (const item of template?.items || []){
    const keys=Array.isArray(item.assignmentKeys) ? item.assignmentKeys : [];
    for (const key of keys){
      if (!units.has(key)) units.set(key,{ key, ministryId:item.ministryId, labels:[item.labelEs||item.label||item.labelEn||''], labelEs:item.labelEs||item.label||'', labelEn:item.labelEn||item.label||'' });
      else units.get(key).labels.push(item.labelEs||item.label||item.labelEn||'');
    }
  }
  return [...units.values()];
}

export function renderProgramItems(template, assignmentsByKey, membersById, songsById=new Map()){
  return (template?.items || []).map(item=>({
    ...item,
    labelEs:item.labelEs||item.label||item.labelEn||'',
    labelEn:item.labelEn||item.label||item.labelEs||'',
    assignees:(item.assignmentKeys || []).map(key=>{
      const a=assignmentsByKey[key];
      const member=a?.currentMemberId ? membersById.get(a.currentMemberId) : null;
      const songs=(a?.songIds||[]).map(id=>songsById.get(id)).filter(Boolean);
      return {
        assignmentId:a?.id || null,
        assignmentKey:key,
        memberId:member?.id || null,
        fullName:member?.fullName || 'Unfilled',
        status:a?.status || 'unfilled',
        ministryId:a?.ministryId || item.ministryId,
        songIds:a?.songIds||[],
        songs
      };
    })
  }));
}
