export function assignmentUnits(template){
  const units=new Map();
  for (const item of template?.items || []){
    const keys=Array.isArray(item.assignmentKeys) ? item.assignmentKeys : [];
    for (const key of keys){
      if (!units.has(key)) units.set(key,{ key, ministryId:item.ministryId, labels:[item.label] });
      else units.get(key).labels.push(item.label);
    }
  }
  return [...units.values()];
}

export function renderProgramItems(template, assignmentsByKey, membersById){
  return (template?.items || []).map(item=>({
    ...item,
    assignees:(item.assignmentKeys || []).map(key=>{
      const a=assignmentsByKey[key];
      const member=a?.currentMemberId ? membersById.get(a.currentMemberId) : null;
      return { assignmentId:a?.id || null, assignmentKey:key, memberId:member?.id || null, fullName:member?.fullName || 'Unfilled', status:a?.status || 'unfilled', ministryId:a?.ministryId || item.ministryId };
    })
  }));
}
