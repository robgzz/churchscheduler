import { tableNames, config } from '../config.js';
import { listDocs, getDoc, downloadBuffer } from '../storage/repository.js';

const safe=v=>String(v??'');
const inRange=(value,from,to)=>{const d=safe(value).slice(0,10);return (!from||d>=from)&&(!to||d<=to);};
const yes=v=>v===true?'Yes':'No';
const pct=(n,d)=>d?Math.round((n/d)*100):0;
const terminalStatus=s=>['completed','cancelled','canceled','closed','done'].includes(safe(s).toLowerCase());
function csvCell(v){let s=safe(v);if(/^[=+\-@\t\r]/.test(s))s=`'${s}`;return /[",\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s;}
function validDate(v){return !v||/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(`${v}T12:00:00Z`));}
function reportError(message,code='INVALID_REPORT'){return Object.assign(new Error(message),{statusCode:400,code});}
function addDays(iso,days){const d=new Date(`${iso}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
function periodDays(from,to){if(!from||!to)return 0;return Math.max(1,Math.round((new Date(`${to}T12:00:00Z`)-new Date(`${from}T12:00:00Z`))/86400000)+1);}
function previousPeriod(from,to){const days=periodDays(from,to);if(!days)return {from:'',to:''};return {to:addDays(from,-1),from:addDays(from,-days)};}
function localToday(timezone='America/Chicago'){return new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function groupCount(rows,key){const m=new Map();for(const r of rows){const k=typeof key==='function'?key(r):r[key];if(k)m.set(k,(m.get(k)||0)+1);}return [...m.entries()].sort((a,b)=>b[1]-a[1]);}
function average(nums){const clean=nums.filter(Number.isFinite);return clean.length?clean.reduce((a,b)=>a+b,0)/clean.length:0;}
function metric(id,label,value,{display='',detail='',tone='neutral',delta=null,deltaLabel=''}={}){return {id,label,value,display:display||safe(value),detail,tone,delta,deltaLabel};}
function finding(title,detail,tone='info'){return {title,detail,tone};}
function attention(title,detail,{severity='medium',date='',owner='',kind='',id=''}={}){return {title,detail,severity,date,owner,kind,id};}
function chart(id,title,items,{subtitle='',type='bar'}={}){return {id,title,subtitle,type,items:items.filter(x=>Number(x.value)>=0)};}
function statusLabel(v){return safe(v||'open').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());}

export const reportCatalog=[
  {id:'leadership-overview',title:'Monthly Leadership Overview',purpose:'A concise executive view of readiness, follow-up, communications, people and operational exceptions.',audience:'Church leadership',featured:true,defaultDays:30},
  {id:'worship-readiness',title:'Weekly Worship Readiness',purpose:'Shows whether upcoming services are prepared, what is missing, and where volunteer coverage needs attention.',audience:'Program administrators and ministry leaders',featured:true,defaultDays:14},
  {id:'followup-accountability',title:'Follow-up Accountability',purpose:'Surfaces open, overdue and unassigned follow-up work with clear ownership and completion context.',audience:'Church leadership and follow-up owners',featured:true,defaultDays:30},
  {id:'worship-participation',title:'Worship & Scheduling Detail',purpose:'Detailed scheduled-assignment records. A scheduled assignment is not proof that a member actually served.',audience:'Program administrators'},
  {id:'communications',title:'Communications Health',purpose:'Delivery attempts, channel results, failures, skips and recorded provider responses.',audience:'Administrators'},
  {id:'announcements-bulletins',title:'Publications',purpose:'Published bulletin and announcement activity for the selected period.',audience:'Administrators'},
  {id:'visitors',title:'Visitor Registrations',purpose:'Visitor registrations and the contact information/status recorded in Church Hub.',audience:'Authorized leaders'},
  {id:'petitions',title:'Prayer Ministry Activity',purpose:'Counts and safe metadata for prayer requests; private petition content remains withheld.',audience:'Authorized leaders'},
  {id:'children',title:"Children Care Operations",purpose:'Check-in, room utilization and handoff operations without exposing unnecessary care details.',audience:'Authorized leaders'},
  {id:'events',title:'Events & RSVP',purpose:'Event capacity, registrations and cancellations. RSVP does not represent confirmed attendance.',audience:'Church leadership'},
  {id:'followups',title:'Follow-up Task Detail',purpose:'Detailed task records for analysis and data exchange.',audience:'Administrators'}
];

function buildProgramGroups(assignments,services,members,history){
  const sm=new Map(services.map(x=>[x.id,x.labelEn||x.label||x.labelEs||x.id]));
  const mm=new Map(members.map(x=>[x.id,x.fullName||x.id]));
  const groups=new Map();
  for(const a of assignments){
    const id=a.programId||`${a.dateISO}|${a.serviceId}`;
    if(!groups.has(id))groups.set(id,{id,date:a.dateISO||'',serviceId:a.serviceId||'',service:sm.get(a.serviceId)||a.serviceId||'',assignments:[]});
    groups.get(id).assignments.push(a);
  }
  return [...groups.values()].map(g=>{
    const unique=[...new Map(g.assignments.map(a=>[a.id||a.assignmentKey,a])).values()];
    const open=unique.filter(a=>!a.currentMemberId||a.status==='unfilled');
    const missingSongs=unique.filter(a=>a.ministryId==='ministry_songs'&&a.currentMemberId&&a.status!=='unfilled'&&(!Array.isArray(a.songIds)||a.songIds.length===0));
    const replacements=history.filter(h=>h.eventType==='replacement.requested'&&(h.programId===g.id||(!h.programId&&h.dateISO===g.date))).length;
    return {...g,total:unique.length,filled:unique.length-open.length,open:open.length,missingSongs:missingSongs.length,replacements,ready:open.length===0&&missingSongs.length===0,openAssignments:open,missingSongAssignments:missingSongs,assignedNames:[...new Set(unique.map(a=>mm.get(a.currentMemberId)).filter(Boolean))]};
  }).sort((a,b)=>a.date.localeCompare(b.date)||a.service.localeCompare(b.service));
}

function rangeRows(data,from,to){
  return {
    assignments:data.assignments.filter(x=>inRange(x.dateISO,from,to)),
    history:data.history.filter(x=>inRange(x.occurredAt||x.dateISO||x.createdAt,from,to)),
    notifications:data.notifications.filter(x=>inRange(x.occurredAt||x.createdAt,from,to)),
    content:data.content.filter(x=>inRange(x.publishedAt||x.createdAt,from,to)),
    visitors:data.visitors.filter(x=>inRange(x.createdAt,from,to)),
    petitions:data.petitions.filter(x=>inRange(x.createdAt,from,to)),
    checkIns:data.checkIns.filter(x=>inRange(x.checkInAt||x.dateISO,from,to)),
    events:data.events.filter(x=>inRange(x.dateISO,from,to)),
    followUps:data.followUps.filter(x=>inRange(x.createdAt||x.dueDate||x.updatedAt,from,to))
  };
}

function leadershipModel({filtered,prior,data,from,to,today,mm,xm,sm}){
  const {assignments:af,history:hf,notifications:nf,content:cf,visitors:vf,petitions:pf,checkIns:kif,followUps:ff}=filtered;
  const groups=buildProgramGroups(af,data.services,data.members,hf);
  const upcomingGroups=groups.filter(g=>!g.date||g.date>=today);
  const readinessBase=upcomingGroups.length?upcomingGroups:groups;
  const ready=readinessBase.filter(g=>g.ready).length;
  const openTasks=data.followUps.filter(x=>!terminalStatus(x.status));
  const overdue=openTasks.filter(x=>x.dueDate&&x.dueDate<today);
  const unassigned=openTasks.filter(x=>!x.assignedTo);
  const notifAttempts=nf.filter(x=>x.status!=='skipped');
  const notifFails=nf.filter(x=>x.status==='failed');
  const replacementCount=hf.filter(x=>x.eventType==='replacement.requested').length;
  const priorGroups=buildProgramGroups(prior.assignments,data.services,data.members,prior.history);
  const priorReady=priorGroups.filter(g=>g.ready).length;
  const priorFails=prior.notifications.filter(x=>x.status==='failed').length;
  const priorAttempts=prior.notifications.filter(x=>x.status!=='skipped').length;
  const priorRepl=prior.history.filter(x=>x.eventType==='replacement.requested').length;
  const visitors=vf.filter(x=>x.kind==='visitor_contact');
  const metrics=[
    metric('readiness','Upcoming worship readiness',pct(ready,readinessBase.length),{display:readinessBase.length?`${pct(ready,readinessBase.length)}%`:'—',detail:`${ready} of ${readinessBase.length} service programs are ready`,tone:ready===readinessBase.length&&readinessBase.length?'good':readinessBase.length?'warning':'neutral',delta:priorGroups.length?pct(ready,readinessBase.length)-pct(priorReady,priorGroups.length):null,deltaLabel:'vs previous period'}),
    metric('overdue','Overdue follow-up',overdue.length,{detail:`${openTasks.length} open · ${unassigned.length} without an owner`,tone:overdue.length?'warning':'good'}),
    metric('communications','Communication failures',notifFails.length,{display:notifAttempts.length?`${pct(notifFails.length,notifAttempts.length)}%`:'0%',detail:`${notifFails.length} failed of ${notifAttempts.length} attempted`,tone:notifFails.length?'warning':'good',delta:priorAttempts.length?pct(notifFails.length,notifAttempts.length)-pct(priorFails,priorAttempts):null,deltaLabel:'failure-rate points'}),
    metric('visitors','New visitor registrations',visitors.length,{detail:`Recorded during the selected period`,tone:'neutral'}),
    metric('replacements','Replacement requests',replacementCount,{detail:`${af.length?`${pct(replacementCount,af.length)} per 100 scheduled assignments`: 'No scheduled assignments in period'}`,tone:replacementCount?'neutral':'good',delta:priorRepl!=null?replacementCount-priorRepl:null,deltaLabel:'vs previous period'}),
    metric('children','Children check-in visits',kif.length,{detail:`${new Set(kif.map(x=>x.childId).filter(Boolean)).size} unique children`,tone:'neutral'})
  ];
  const findings=[];
  if(readinessBase.length)findings.push(finding('Worship readiness',ready===readinessBase.length?'All upcoming service programs in the selected period are currently ready.':`${readinessBase.length-ready} of ${readinessBase.length} upcoming service programs still need attention.`,ready===readinessBase.length?'good':'warning'));
  if(overdue.length)findings.push(finding('Follow-up accountability',`${overdue.length} open task${overdue.length===1?' is':'s are'} overdue; ${unassigned.length} open task${unassigned.length===1?' has':'s have'} no owner.`,'warning'));
  else findings.push(finding('Follow-up accountability',`${openTasks.length} open follow-up task${openTasks.length===1?' remains':'s remain'}; none are currently overdue.`,'good'));
  if(notifAttempts.length)findings.push(finding('Communication health',`${notifAttempts.length-notifFails.length} of ${notifAttempts.length} recorded attempts did not fail. Provider acceptance is not the same as message readership.` ,notifFails.length?'info':'good'));
  if(replacementCount)findings.push(finding('Volunteer stability',`${replacementCount} replacement request${replacementCount===1?' was':'s were'} recorded. Review the worship detail to see where they occurred.`,'info'));
  const attentionItems=[];
  for(const g of readinessBase.filter(x=>!x.ready).slice(0,8))attentionItems.push(attention(`${g.service} is not ready`,`${g.open} open assignment${g.open===1?'':'s'} · ${g.missingSongs} Cantos selection${g.missingSongs===1?'':'s'} pending`,{severity:g.date&&g.date<=addDays(today,3)?'high':'medium',date:g.date,kind:'worship',id:g.id}));
  for(const t of overdue.sort((a,b)=>safe(a.dueDate).localeCompare(safe(b.dueDate))).slice(0,8))attentionItems.push(attention(`Overdue: ${t.title||'Follow-up task'}`,t.assignedTo?`Assigned to ${mm.get(t.assignedTo)||t.assignedTo}`:'No owner assigned',{severity:'high',date:t.dueDate||'',owner:mm.get(t.assignedTo)||'',kind:'followup',id:t.id}));
  for(const n of notifFails.slice(-5))attentionItems.push(attention('Communication failure',`${n.channel||'channel'} · ${n.metadata?.reason||n.error||'No failure reason recorded'}`,{severity:'medium',date:safe(n.occurredAt).slice(0,10),owner:mm.get(n.memberId)||'',kind:'communications',id:n.id}));
  const assignmentByMinistry=groupCount(af,a=>xm.get(a.ministryId)||a.ministryId||'Other').slice(0,8).map(([label,value])=>({label,value}));
  const ownerLoad=groupCount(openTasks,t=>mm.get(t.assignedTo)||t.assignedTo||'Unassigned').slice(0,8).map(([label,value])=>({label,value}));
  const commByChannel=groupCount(nf,n=>n.channel||'Unknown').slice(0,8).map(([label,value])=>({label,value}));
  const rows=[
    ...groups.map(g=>({Area:'Worship readiness',Date:g.date,Item:g.service,Status:g.ready?'Ready':'Needs attention',Detail:`${g.filled}/${g.total} filled; ${g.missingSongs} song selection(s) pending`,Owner:''})),
    ...ff.filter(x=>!terminalStatus(x.status)).map(t=>({Area:'Follow-up',Date:t.dueDate||'',Item:t.title||'',Status:statusLabel(t.status),Detail:t.dueDate&&t.dueDate<today?'Overdue':'Open',Owner:mm.get(t.assignedTo)||t.assignedTo||'Unassigned'}))
  ];
  return {metrics,findings,attention:attentionItems,charts:[chart('assignments-ministry','Scheduled assignments by ministry',assignmentByMinistry,{subtitle:'Selected period'}),chart('followup-load','Open follow-up load by owner',ownerLoad),chart('communications-channel','Communication records by channel',commByChannel)],rows,methodology:['Worship readiness reflects recorded assignments and required Cantos selections; it does not prove that a person actually served.','RSVP and registration data are not treated as attendance.','Communication logs describe recorded delivery attempts/provider outcomes; they do not measure message readership.','Private prayer request content is excluded from leadership analytics.'],summary:metrics.map(m=>[m.label,m.display])};
}

function worshipReadinessModel({filtered,data,today,mm,xm}){
  const groups=buildProgramGroups(filtered.assignments,data.services,data.members,filtered.history);
  const scope=groups.filter(g=>!g.date||g.date>=today);
  const rows=(scope.length?scope:groups).map(g=>({Date:g.date,Service:g.service,Readiness:g.ready?'Ready':'Needs attention',Filled:g.filled,Total:g.total,OpenAssignments:g.open,PendingSongSelections:g.missingSongs,ReplacementRequests:g.replacements,ScheduledMembers:g.assignedNames.join('; ')}));
  const used=scope.length?scope:groups;
  const ready=used.filter(g=>g.ready).length,open=used.reduce((n,g)=>n+g.open,0),missing=used.reduce((n,g)=>n+g.missingSongs,0),repl=used.reduce((n,g)=>n+g.replacements,0);
  const metrics=[metric('ready','Services ready',ready,{display:`${ready}/${used.length}`,detail:used.length?`${pct(ready,used.length)}% ready`:'No service programs in range',tone:ready===used.length&&used.length?'good':used.length?'warning':'neutral'}),metric('open','Open assignments',open,{tone:open?'warning':'good',detail:'Positions with no currently scheduled member'}),metric('songs','Pending Cantos selections',missing,{tone:missing?'warning':'good',detail:'Scheduled Cantos assignments without recorded songs'}),metric('replacements','Replacement requests',repl,{detail:'Recorded for service programs in range'})];
  const att=[];
  for(const g of used.filter(x=>!x.ready)){
    for(const a of g.openAssignments.slice(0,5))att.push(attention(`${g.service}: open ${xm.get(a.ministryId)||a.ministryId||a.assignmentKey}`,`Assignment ${a.assignmentKey||a.id||''} has no scheduled member.`,{severity:g.date&&g.date<=addDays(today,3)?'high':'medium',date:g.date,kind:'worship',id:a.id}));
    for(const a of g.missingSongAssignments.slice(0,5))att.push(attention(`${g.service}: Cantos selection pending`,`${mm.get(a.currentMemberId)||a.currentMemberId||'Assigned member'} still needs recorded song selections.`,{severity:g.date&&g.date<=addDays(today,3)?'high':'medium',date:g.date,owner:mm.get(a.currentMemberId)||'',kind:'songs',id:a.id}));
  }
  const openByMinistry=groupCount(used.flatMap(g=>g.openAssignments),a=>xm.get(a.ministryId)||a.ministryId||'Other').map(([label,value])=>({label,value}));
  const load=groupCount(filtered.assignments.filter(a=>a.currentMemberId),a=>mm.get(a.currentMemberId)||a.currentMemberId).slice(0,10).map(([label,value])=>({label,value}));
  const findings=[finding('Preparation status',used.length?`${ready} of ${used.length} service programs are ready based on assignment coverage and required song selections.`:'No worship programs are recorded for the selected range.',ready===used.length&&used.length?'good':'info')];
  if(open)findings.push(finding('Volunteer coverage',`${open} assignment${open===1?' is':'s are'} currently unfilled.`,'warning'));
  if(missing)findings.push(finding('Cantos readiness',`${missing} assigned Cantos position${missing===1?' still needs':'s still need'} song selections.`,'warning'));
  return {metrics,findings,attention:att,charts:[chart('open-ministry','Open assignments by ministry',openByMinistry),chart('assignment-load','Scheduled assignment load by member',load,{subtitle:'This is scheduling load, not verified service history.'})],rows,methodology:['Readiness is computed from recorded assignment coverage plus required Cantos selections.','Scheduled assignments are not treated as proof that a member actually served.','Replacement requests reflect recorded replacement events, not a judgment of member reliability.'],summary:metrics.map(m=>[m.label,m.display])};
}

function followupModel({data,today,mm,from,to}){
  const all=data.followUps;
  const relevant=all.filter(f=>inRange(f.createdAt||f.dueDate||f.updatedAt,from,to)||(!terminalStatus(f.status)&&(f.dueDate||'')<=to));
  const open=all.filter(f=>!terminalStatus(f.status));
  const overdue=open.filter(f=>f.dueDate&&f.dueDate<today),unassigned=open.filter(f=>!f.assignedTo);
  const completed=relevant.filter(f=>safe(f.status).toLowerCase()==='completed');
  const completionDays=completed.map(f=>{const start=safe(f.createdAt).slice(0,10),end=safe(f.completedAt||f.updatedAt).slice(0,10);if(!validDate(start)||!validDate(end)||!start||!end)return NaN;return Math.max(0,(new Date(`${end}T12:00:00Z`)-new Date(`${start}T12:00:00Z`))/86400000);});
  const metrics=[metric('open','Open follow-up',open.length,{detail:`${overdue.length} overdue`,tone:overdue.length?'warning':'good'}),metric('overdue','Overdue',overdue.length,{tone:overdue.length?'warning':'good',detail:'Open tasks past their due date'}),metric('unassigned','Without owner',unassigned.length,{tone:unassigned.length?'warning':'good',detail:'Open tasks with no assigned person'}),metric('completed','Completed in period',completed.length,{detail:completionDays.filter(Number.isFinite).length?`Average recorded completion time: ${average(completionDays).toFixed(1)} days`:'Completion time requires created/updated timestamps'})];
  const att=[...overdue.sort((a,b)=>safe(a.dueDate).localeCompare(safe(b.dueDate))).map(t=>attention(`Overdue: ${t.title||'Follow-up task'}`,t.assignedTo?`Owner: ${mm.get(t.assignedTo)||t.assignedTo}`:'No owner assigned',{severity:'high',date:t.dueDate||'',owner:mm.get(t.assignedTo)||'',kind:'followup',id:t.id})),...unassigned.filter(t=>!overdue.includes(t)).map(t=>attention(`Unassigned: ${t.title||'Follow-up task'}`,'Assign an owner so responsibility is explicit.',{severity:'medium',date:t.dueDate||'',kind:'followup',id:t.id}))];
  const rows=relevant.sort((a,b)=>safe(a.dueDate).localeCompare(safe(b.dueDate))).map(f=>({Created:safe(f.createdAt).slice(0,10),Due:f.dueDate||'',Task:f.title||'',Source:f.sourceType||'',AssignedTo:mm.get(f.assignedTo)||f.assignedTo||'Unassigned',Status:statusLabel(f.status),Overdue:!terminalStatus(f.status)&&f.dueDate&&f.dueDate<today?'Yes':'No',CompletedAt:f.completedAt||(/completed/i.test(f.status||'')?f.updatedAt||'':''),Updated:f.updatedAt||''}));
  const statusChart=groupCount(all,f=>statusLabel(f.status)).map(([label,value])=>({label,value}));
  const ownerChart=groupCount(open,f=>mm.get(f.assignedTo)||f.assignedTo||'Unassigned').slice(0,10).map(([label,value])=>({label,value}));
  const findings=[];if(overdue.length)findings.push(finding('Overdue work',`${overdue.length} open task${overdue.length===1?' is':'s are'} past the recorded due date.`,'warning'));else findings.push(finding('Overdue work','No currently open follow-up tasks are overdue.','good'));if(unassigned.length)findings.push(finding('Ownership',`${unassigned.length} open task${unassigned.length===1?' needs':'s need'} an assigned owner.`,'warning'));
  return {metrics,findings,attention:att,charts:[chart('followup-status','Follow-up task status',statusChart),chart('followup-owner','Open follow-up by owner',ownerChart)],rows,methodology:['A follow-up task indicates assigned work; it does not prove a visitor or member was successfully contacted.','Actual contact outcomes should be recorded explicitly before they are reported as completed outreach.'],summary:metrics.map(m=>[m.label,m.display])};
}

export async function buildReport(churchId,type,{from='',to=''}={}){
  const catalog=reportCatalog.find(x=>x.id===type);if(!catalog)throw reportError('Unknown report type.');
  if(!validDate(from)||!validDate(to)||from&&to&&from>to)throw reportError('Choose a valid report date range.','INVALID_DATE_RANGE');
  const church=await getDoc(tableNames.settings,churchId,'church')||{};
  const today=localToday(church.timezone||config.defaultTimezone);
  if(!to)to=today;if(!from)from=addDays(to,-(catalog.defaultDays||30)+1);
  const [members,assignments,history,notifications,content,visitors,petitions,children,checkIns,services,ministries,events,eventRegistrations,followUps]=await Promise.all([
    listDocs(tableNames.members,churchId,{max:10000}),listDocs(tableNames.assignments,churchId,{max:10000}),listDocs(tableNames.history,churchId,{max:10000}),listDocs(tableNames.notificationLogs,churchId,{max:10000}),listDocs(tableNames.content,churchId,{max:5000}),listDocs(tableNames.visitorContacts,churchId,{max:5000}),listDocs(tableNames.petitions,churchId,{max:5000}),listDocs(tableNames.children,churchId,{max:5000}),listDocs(tableNames.childCheckIns,churchId,{max:10000}),listDocs(tableNames.services,churchId,{max:1000}),listDocs(tableNames.ministries,churchId,{max:1000}),listDocs(tableNames.events,churchId,{max:5000}),listDocs(tableNames.eventRegistrations,churchId,{max:10000}),listDocs(tableNames.followUps,churchId,{max:5000})
  ]);
  const data={members,assignments,history,notifications,content,visitors,petitions,children,checkIns,services,ministries,events,eventRegistrations,followUps};
  const mm=new Map(members.map(x=>[x.id,x.fullName||x.id])),sm=new Map(services.map(x=>[x.id,x.labelEn||x.label||x.labelEs||x.id])),xm=new Map(ministries.map(x=>[x.id,x.labelEn||x.label||x.labelEs||x.id]));
  const filtered=rangeRows(data,from,to),priorRange=previousPeriod(from,to),prior=rangeRows(data,priorRange.from,priorRange.to);
  let model={metrics:[],findings:[],attention:[],charts:[],rows:[],methodology:[],summary:[]};
  if(type==='leadership-overview')model=leadershipModel({filtered,prior,data,from,to,today,mm,xm,sm});
  else if(type==='worship-readiness')model=worshipReadinessModel({filtered,data,today,mm,xm});
  else if(type==='followup-accountability')model=followupModel({data,today,mm,from,to});
  else if(type==='worship-participation'){
    model.rows=filtered.assignments.map(a=>({Date:a.dateISO||'',Service:sm.get(a.serviceId)||a.serviceId||'',Ministry:xm.get(a.ministryId)||a.ministryId||'',ScheduledMember:mm.get(a.currentMemberId)||a.currentMemberId||'Unfilled',Status:a.status||'',OriginalMember:mm.get(a.originalMemberId)||a.originalMemberId||'',ReplacementCount:(a.replacements||[]).length,Songs:(a.songIds||[]).length}));
    model.metrics=[metric('assignments','Scheduled assignments',model.rows.length),metric('unfilled','Unfilled',filtered.assignments.filter(x=>!x.currentMemberId||x.status==='unfilled').length,{tone:'warning'}),metric('replacements','Replacement requests',filtered.history.filter(x=>x.eventType==='replacement.requested').length)];model.methodology=['These are schedule records. They do not establish that a member actually served.'];
  } else if(type==='communications'){
    model.rows=filtered.notifications.map(n=>({When:n.occurredAt||'',Channel:n.channel||'',Status:n.status||'',Member:mm.get(n.memberId)||n.memberId||'',Recipient:n.recipient||'',Event:n.eventKey||'',SuccessCount:n.metadata?.successCount??'',FailureCount:n.metadata?.failureCount??'',Reason:n.metadata?.reason||'',Error:n.error||''}));const attempts=filtered.notifications.filter(x=>x.status!=='skipped'),failed=filtered.notifications.filter(x=>x.status==='failed');model.metrics=[metric('attempts','Recorded attempts',attempts.length),metric('failed','Failures',failed.length,{display:attempts.length?`${pct(failed.length,attempts.length)}%`:'0%',detail:`${failed.length} failed attempt(s)`,tone:failed.length?'warning':'good'}),metric('skipped','Skipped',filtered.notifications.filter(x=>x.status==='skipped').length)];model.charts=[chart('channels','Records by channel',groupCount(filtered.notifications,x=>x.channel||'Unknown').map(([label,value])=>({label,value})))];model.methodology=['Provider acceptance/delivery metadata is not equivalent to confirmed human readership.'];
  } else if(type==='announcements-bulletins'){
    model.rows=filtered.content.map(c=>({PublishedAt:c.publishedAt||c.createdAt||'',Kind:c.kind||'',Title:c.titleEn||c.title||c.titleEs||'',IsPublished:yes(c.published!==false),Address:c.address||'',Attachment:c.attachment?.fileName||''}));model.metrics=[metric('publications','Publications',model.rows.length),metric('announcements','Announcements',filtered.content.filter(x=>x.kind==='announcement').length),metric('bulletins','Bulletins',filtered.content.filter(x=>x.kind==='bulletin').length)];model.methodology=['Publication activity does not measure readership unless explicit engagement tracking is added.'];
  } else if(type==='visitors'){
    model.rows=filtered.visitors.filter(x=>x.kind==='visitor_contact').map(v=>({Registered:v.createdAt||'',Name:v.fullName||'',Phone:v.phone||'',Email:v.email||'',FirstVisit:yes(v.firstVisit),Status:v.status||'',Interests:(v.interests||[]).join('; ')}));model.metrics=[metric('visitors','Visitor registrations',model.rows.length),metric('first','First visits',model.rows.filter(x=>x.FirstVisit==='Yes').length)];model.methodology=['Registration/contact records are reported as recorded; successful follow-up requires a recorded outcome.'];
  } else if(type==='petitions'){
    model.rows=filtered.petitions.map(p=>({Created:p.createdAt||'',Member:p.memberName||mm.get(p.memberId)||'',Privacy:p.private===true?'Private':'Public',Status:p.status||'',Summary:p.private===true?'Private petition — content withheld from report':safe(p.text).slice(0,160)}));model.metrics=[metric('requests','Prayer requests',model.rows.length),metric('private','Private',filtered.petitions.filter(x=>x.private===true).length),metric('public','Public',filtered.petitions.filter(x=>x.private!==true).length)];model.methodology=['Private petition content is intentionally withheld from the report.'];
  } else if(type==='children'){
    model.rows=filtered.checkIns.map(c=>({Date:c.dateISO||safe(c.checkInAt).slice(0,10),Child:c.childName||'',Age:c.childAge??'',CareArea:c.careArea||'',ParentGuardian:mm.get(c.memberId)||c.memberId||'',CheckIn:c.checkInAt||'',Pickup:c.pickupAt||'',Status:c.status||'',Service:sm.get(c.serviceId)||c.serviceId||'',CheckedInBy:mm.get(c.checkedInBy)||c.checkedInBy||'',ReleasedBy:mm.get(c.releasedBy)||c.releasedBy||'',ParentAlerts:filtered.history.filter(h=>h.eventType==='children.parent_alert'&&h.details?.checkInId===c.id).length}));const unresolved=checkIns.filter(x=>['checked_in','pickup_requested'].includes(x.status));model.metrics=[metric('visits','Check-in visits',model.rows.length),metric('children','Unique children',new Set(filtered.checkIns.map(x=>x.childId).filter(Boolean)).size),metric('active','Currently in care',unresolved.length,{tone:unresolved.length?'info':'neutral'})];model.charts=[chart('rooms','Visits by care area',groupCount(filtered.checkIns,x=>x.careArea||'Unspecified').map(([label,value])=>({label,value})))];model.methodology=['General leadership reporting avoids unnecessary sensitive care details.'];
  } else if(type==='events'){
    model.rows=filtered.events.map(e=>{const regs=eventRegistrations.filter(r=>r.eventId===e.id&&r.status==='registered');return {Date:e.dateISO||'',Time:e.startTime||'',Event:e.titleEn||e.titleEs||'',Location:e.location||'',Capacity:e.capacity||'',RegisteredPeople:regs.reduce((n,r)=>n+Number(r.partySize||1),0),RegisteredNames:regs.map(r=>r.memberName||mm.get(r.memberId)||r.memberId||'').filter(Boolean).join('; '),Active:yes(e.active!==false)};});const registered=model.rows.reduce((n,r)=>n+Number(r.RegisteredPeople||0),0);model.metrics=[metric('events','Events',model.rows.length),metric('registered','Registered people',registered)];model.methodology=['RSVP/registration is not treated as confirmed event attendance.'];
  } else if(type==='followups'){
    model.rows=followUps.filter(f=>inRange(f.createdAt||f.dueDate||f.updatedAt,from,to)).map(f=>({Created:f.createdAt||'',Due:f.dueDate||'',Task:f.title||'',Source:f.sourceType||'',AssignedTo:mm.get(f.assignedTo)||f.assignedTo||'',Status:f.status||'',Updated:f.updatedAt||''}));model.metrics=[metric('tasks','Task records',model.rows.length),metric('open','Open',model.rows.filter(x=>!terminalStatus(x.Status)).length)];model.methodology=['Task records represent workflow state; they do not prove a real-world contact outcome unless that outcome is explicitly recorded.'];
  }
  if(!model.summary?.length)model.summary=model.metrics.map(m=>[m.label,m.display]);
  const limits={members:10000,assignments:10000,history:10000,notifications:10000,content:5000,visitors:5000,petitions:5000,children:5000,checkIns:10000,services:1000,ministries:1000,events:5000,eventRegistrations:10000,followUps:5000};
  const loaded={members,assignments,history,notifications,content,visitors,petitions,children,checkIns,services,ministries,events,eventRegistrations,followUps};
  const possiblyTruncated=Object.keys(loaded).filter(k=>loaded[k].length>=limits[k]);
  return {type,title:catalog.title,purpose:catalog.purpose,audience:catalog.audience,featured:catalog.featured===true,church,from,to,priorRange,generatedAt:new Date().toISOString(),...model,completeness:{complete:possiblyTruncated.length===0,rowCount:model.rows.length,possiblyTruncated}};
}

async function logoBuffer(report){try{if(report.church?.logo?.blobName)return (await downloadBuffer(config.attachmentsContainer,report.church.logo.blobName)).buffer;}catch{}return null;}
export function reportCsv(report){const headers=Object.keys(report.rows[0]||{Message:'No records'});return [headers.map(csvCell).join(','),...report.rows.map(r=>headers.map(h=>csvCell(r[h])).join(','))].join('\r\n');}

export async function reportXlsx(report){
  const { default: ExcelJS }=await import('exceljs');
  const wb=new ExcelJS.Workbook();wb.creator='Westbury Church Hub by Exonuvia';wb.created=new Date();
  const navy='17324D',light='EAF0F5',gold='C5A46D',green='E8F4EC',amber='FFF4D8';
  const overview=wb.addWorksheet('Overview');overview.views=[{state:'frozen',ySplit:4}];
  const churchName=report.church.churchNameEn||report.church.churchName||'Westbury Church of Christ';
  overview.mergeCells('A1:H1');overview.getCell('A1').value=churchName;overview.getCell('A1').font={bold:true,size:20,color:{argb:`FF${navy}`}};
  overview.mergeCells('A2:H2');overview.getCell('A2').value=report.title;overview.getCell('A2').font={bold:true,size:15};
  overview.mergeCells('A3:H3');overview.getCell('A3').value=`${report.from} — ${report.to} | Generated ${new Date(report.generatedAt).toLocaleString('en-US')}`;overview.getCell('A3').font={size:9,color:{argb:'FF666666'}};
  let row=5;overview.getCell(`A${row}`).value='Executive metrics';overview.getCell(`A${row}`).font={bold:true,size:12,color:{argb:`FF${navy}`}};row++;
  for(const m of report.metrics||[]){overview.getCell(`A${row}`).value=m.label;overview.getCell(`B${row}`).value=m.display;overview.getCell(`C${row}`).value=m.detail||'';overview.getCell(`A${row}`).font={bold:true};overview.getCell(`B${row}`).font={bold:true,size:12};overview.getCell(`A${row}`).fill=overview.getCell(`B${row}`).fill={type:'pattern',pattern:'solid',fgColor:{argb:`FF${m.tone==='good'?green:m.tone==='warning'?amber:light}`}};row++;}
  row++;overview.getCell(`A${row}`).value='Key findings';overview.getCell(`A${row}`).font={bold:true,size:12,color:{argb:`FF${navy}`}};row++;
  for(const f of report.findings||[]){overview.getCell(`A${row}`).value=f.title;overview.getCell(`B${row}`).value=f.detail;overview.mergeCells(`B${row}:H${row}`);overview.getCell(`A${row}`).font={bold:true};row++;}
  if((report.attention||[]).length){row++;overview.getCell(`A${row}`).value='Items needing attention';overview.getCell(`A${row}`).font={bold:true,size:12,color:{argb:`FF${navy}`}};row++;overview.addRow(['Severity','Date','Item','Detail','Owner']);const hr=overview.lastRow;hr.font={bold:true,color:{argb:'FFFFFFFF'}};hr.eachCell(c=>c.fill={type:'pattern',pattern:'solid',fgColor:{argb:`FF${navy}`}});for(const a of report.attention)overview.addRow([a.severity,a.date,a.title,a.detail,a.owner]);row=overview.lastRow.number+1;}
  if((report.methodology||[]).length){row++;overview.getCell(`A${row}`).value='Interpretation notes';overview.getCell(`A${row}`).font={bold:true,size:11,color:{argb:`FF${navy}`}};row++;for(const n of report.methodology){overview.getCell(`A${row}`).value=`• ${n}`;overview.mergeCells(`A${row}:H${row}`);row++;}}
  overview.columns=[{width:26},{width:20},{width:34},{width:24},{width:24},{width:18},{width:18},{width:18}];
  const detail=wb.addWorksheet('Detail');const headers=Object.keys(report.rows[0]||{Message:'No records for selected period'});detail.addRow(headers);detail.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};detail.getRow(1).eachCell(c=>c.fill={type:'pattern',pattern:'solid',fgColor:{argb:`FF${navy}`}});for(const r of report.rows)detail.addRow(headers.map(h=>r[h]??''));detail.columns=headers.map(h=>({key:h,width:Math.min(48,Math.max(14,h.length+4))}));detail.autoFilter={from:'A1',to:{row:1,column:headers.length}};detail.views=[{state:'frozen',ySplit:1}];
  const logo=await logoBuffer(report);if(logo){try{const imageId=wb.addImage({buffer:logo,extension:report.church.logo?.contentType==='image/jpeg'?'jpeg':'png'});overview.addImage(imageId,{tl:{col:7,row:0},ext:{width:95,height:48}});}catch{}}
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const COLORS={navy:'#17324D',ink:'#1F2933',muted:'#667085',line:'#D7DEE5',soft:'#F4F7FA',gold:'#C5A46D',green:'#2E7D4F',amber:'#A66A00',red:'#B42318',white:'#FFFFFF'};
function pdfSafe(v,max=240){const s=safe(v).replace(/\s+/g,' ').trim();return s.length>max?`${s.slice(0,max-1)}…`:s;}
function pdfNeedPage(doc,y,height=80){if(y+height>735){doc.addPage();return 54;}return y;}
function pdfSection(doc,title,y){y=pdfNeedPage(doc,y,34);doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(12).text(title,42,y);doc.moveTo(42,y+18).lineTo(570,y+18).strokeColor(COLORS.line).lineWidth(.7).stroke();return y+30;}
function pdfMetricCard(doc,m,x,y,w){doc.roundedRect(x,y,w,72,7).fillAndStroke(m.tone==='good'?'#EEF7F1':m.tone==='warning'?'#FFF7E8':COLORS.soft,COLORS.line);doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(7.5).text(pdfSafe(m.label,54).toUpperCase(),x+11,y+9,{width:w-22});doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(18).text(pdfSafe(m.display,18),x+11,y+25,{width:w-22});doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7).text(pdfSafe(m.detail,78),x+11,y+49,{width:w-22,height:18});}
function pdfBarChart(doc,c,y){y=pdfNeedPage(doc,y,95+Math.min(8,(c.items||[]).length)*22);doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(10).text(c.title,42,y);if(c.subtitle)doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7.5).text(c.subtitle,42,y+14);y+=c.subtitle?32:22;const items=(c.items||[]).slice(0,8),max=Math.max(1,...items.map(x=>Number(x.value)||0));for(const item of items){doc.fillColor(COLORS.ink).font('Helvetica').fontSize(7.5).text(pdfSafe(item.label,34),42,y,{width:145});doc.roundedRect(190,y+1,320,8,4).fill(COLORS.soft);doc.roundedRect(190,y+1,Math.max(3,320*(Number(item.value||0)/max)),8,4).fill(COLORS.navy);doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(7.5).text(safe(item.value),518,y-1,{width:52,align:'right'});y+=20;}return y+4;}
function pdfAttention(doc,items,y){y=pdfSection(doc,'Items needing attention',y);if(!items.length){doc.fillColor(COLORS.green).font('Helvetica').fontSize(9).text('No attention items were identified from the recorded data in this report.',42,y,{width:528});return y+28;}for(const a of items.slice(0,12)){y=pdfNeedPage(doc,y,44);const sev=a.severity==='high'?COLORS.red:a.severity==='medium'?COLORS.amber:COLORS.navy;doc.circle(48,y+7,3).fill(sev);doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(8.5).text(pdfSafe(a.title,84),58,y,{width:330});doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7.3).text(pdfSafe(a.detail,130),58,y+13,{width:408,height:20});doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7.2).text([a.date,a.owner].filter(Boolean).join(' · '),470,y,{width:100,align:'right'});y+=40;}return y+4;}

export async function reportPdf(report){
  const { default: PDFDocument }=await import('pdfkit');
  return new Promise(async(resolve,reject)=>{try{
    const doc=new PDFDocument({size:'LETTER',margin:42,bufferPages:true,info:{Title:report.title,Author:'Westbury Church Hub by Exonuvia'}}),chunks=[];doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);
    const churchName=report.church.churchNameEn||report.church.churchName||'Westbury Church of Christ',logo=await logoBuffer(report);
    doc.rect(0,0,612,118).fill(COLORS.navy);if(logo){try{doc.image(logo,42,28,{fit:[66,58]});}catch{}}
    const tx=logo?124:42;doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(18).text(churchName,tx,31,{width:445});doc.fillColor('#DCE6EE').font('Helvetica').fontSize(9).text('Leadership Reporting • Westbury Church Hub by Exonuvia',tx,57,{width:445});doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(14).text(report.title,42,126,{width:528});doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text(`${report.from} — ${report.to}  •  Generated ${new Date(report.generatedAt).toLocaleString('en-US')}`,42,149,{width:528});
    if(report.purpose)doc.fillColor(COLORS.ink).font('Helvetica').fontSize(9).text(report.purpose,42,171,{width:528,lineGap:2});
    let y=Math.max(205,doc.y+16);const metrics=(report.metrics||[]).slice(0,6),cardW=254,gap=20;for(let i=0;i<metrics.length;i++){const row=Math.floor(i/2),col=i%2;pdfMetricCard(doc,metrics[i],42+col*(cardW+gap),y+row*84,cardW);}y+=Math.ceil(metrics.length/2)*84+10;
    if((report.findings||[]).length){y=pdfSection(doc,'Leadership findings',y);for(const f of report.findings.slice(0,6)){y=pdfNeedPage(doc,y,48);const mark=f.tone==='warning'?COLORS.amber:f.tone==='good'?COLORS.green:COLORS.gold;doc.rect(42,y,4,36).fill(mark);doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(8.8).text(pdfSafe(f.title,76),56,y,{width:490});doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7.6).text(pdfSafe(f.detail,180),56,y+14,{width:490,height:24});y+=44;}}
    y=pdfAttention(doc,report.attention||[],y);
    for(const c of (report.charts||[]).slice(0,3)){y=pdfSection(doc,'Visual analysis',y);y=pdfBarChart(doc,c,y);}
    y=pdfSection(doc,'Detailed appendix',y);const rows=report.rows?.length?report.rows:[{Message:'No records for selected period'}],headers=Object.keys(rows[0]);for(const r of rows.slice(0,350)){y=pdfNeedPage(doc,y,54);const primary=headers.slice(0,3).map(h=>`${h}: ${pdfSafe(r[h],50)}`).join('  •  ');doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(7.8).text(primary,42,y,{width:528});const detail=headers.slice(3).map(h=>`${h}: ${pdfSafe(r[h],42)}`).join('  •  ');if(detail)doc.fillColor(COLORS.muted).font('Helvetica').fontSize(6.8).text(detail,42,y+14,{width:528,height:28});doc.moveTo(42,y+45).lineTo(570,y+45).strokeColor(COLORS.line).lineWidth(.5).stroke();y+=52;}
    if((report.methodology||[]).length){y=pdfSection(doc,'Interpretation notes',y);for(const n of report.methodology){y=pdfNeedPage(doc,y,30);doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7.4).text(`• ${n}`,48,y,{width:516});y=doc.y+7;}}
    if(report.completeness?.complete===false){y=pdfNeedPage(doc,y,42);doc.fillColor(COLORS.amber).font('Helvetica-Bold').fontSize(7.5).text(`Data completeness notice: one or more source collections reached their configured retrieval limit (${report.completeness.possiblyTruncated.join(', ')}).`,42,y,{width:528});}
    const range=doc.bufferedPageRange();for(let i=range.start;i<range.start+range.count;i++){doc.switchToPage(i);doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7).text('Westbury Church Hub • Leadership report',42,756,{width:380});doc.text(`Page ${i-range.start+1} of ${range.count}`,470,756,{width:100,align:'right'});}
    doc.end();
  }catch(e){reject(e);}});
}
