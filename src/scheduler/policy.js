import { isSameWeek } from './dates.js';

export function isUnavailable(member,dateISO){
  return (member.unavailability || []).some(r=>r?.from && r?.to && r.from<=dateISO && dateISO<=r.to);
}

export function hardEligible(member,{ministryId,serviceId,assignmentKey='',dateISO,assignedInProgram=new Set(),sameDayAssignments=[],excludeMemberIds=new Set()}){
  if (!member || member.active===false) return false;
  if (excludeMemberIds.has(member.id)) return false;
  if (!(member.ministries || []).includes(ministryId)) return false;
  if (!(member.serviceAvailability || []).includes(serviceId)) return false;
  if(member.assignmentEligibilityMode==='explicit' && Array.isArray(member.assignmentEligibility) && member.assignmentEligibility.length){
    const token=`${serviceId}::${assignmentKey}`;
    if(!assignmentKey || !member.assignmentEligibility.includes(token)) return false;
  }
  if (isUnavailable(member,dateISO)) return false;
  if (assignedInProgram.has(member.id)) return false;
  const sameDay=sameDayAssignments.filter(a=>a.currentMemberId===member.id);
  if (!sameDay.length) return true;
  if (sameDay.some(a=>a.serviceId===serviceId)) return false;
  return member.allowSameDayMultipleServices===true;
}

export function replacementPenaltyEligible(requestDateISO, serviceDateISO, weekStartsOn=0){
  return isSameWeek(requestDateISO,serviceDateISO,weekStartsOn);
}
