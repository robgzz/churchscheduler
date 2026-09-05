import { tableNames } from '../config.js';
import { listDocs, getDoc } from '../storage/repository.js';
import { renderProgramItems } from '../scheduler/template.js';

export async function listProgramViews(churchId,{from='',to=''}={}){
  const filters=[]; if(from) filters.push(`dateISO ge '${from}'`); if(to) filters.push(`dateISO le '${to}'`);
  const [programs,services,templates,members,assignments]=await Promise.all([
    listDocs(tableNames.programs,churchId,{filter:filters.join(' and '),max:500}),
    listDocs(tableNames.services,churchId),listDocs(tableNames.templates,churchId),listDocs(tableNames.members,churchId),
    listDocs(tableNames.assignments,churchId,{filter:filters.join(' and '),max:3000})
  ]);
  const svc=new Map(services.map(x=>[x.id,x])), tpl=new Map(templates.map(x=>[x.id,x])), mem=new Map(members.map(x=>[x.id,x]));
  const byProgram=new Map(); for(const a of assignments){ if(!byProgram.has(a.programId)) byProgram.set(a.programId,{}); byProgram.get(a.programId)[a.assignmentKey]=a; }
  return programs.sort((a,b)=>a.dateISO.localeCompare(b.dateISO)||String(a.startTime).localeCompare(String(b.startTime))).map(p=>({
    ...p, service:svc.get(p.serviceId)||null,
    items:renderProgramItems(tpl.get(p.templateId),byProgram.get(p.id)||{},mem)
  }));
}

export async function myAssignments(churchId,memberId){
  const rows=await listDocs(tableNames.assignments,churchId,{filter:`currentMemberId eq '${memberId}' and status eq 'scheduled'`,max:500});
  const [services,ministries,programs,templates]=await Promise.all([
    listDocs(tableNames.services,churchId),listDocs(tableNames.ministries,churchId),listDocs(tableNames.programs,churchId),listDocs(tableNames.templates,churchId)
  ]);
  const sm=new Map(services.map(s=>[s.id,s])), mm=new Map(ministries.map(m=>[m.id,m])), pm=new Map(programs.map(p=>[p.id,p])), tm=new Map(templates.map(t=>[t.id,t]));
  return rows.sort((a,b)=>a.dateISO.localeCompare(b.dateISO)||String(a.serviceId).localeCompare(String(b.serviceId))).map(a=>{
    const program=pm.get(a.programId), template=program?tm.get(program.templateId):null;
    const labels=(template?.items||[]).filter(i=>(i.assignmentKeys||[]).includes(a.assignmentKey)).map(i=>i.label);
    return {...a,service:sm.get(a.serviceId)||null,ministry:mm.get(a.ministryId)||null,programLabels:labels};
  });
}
