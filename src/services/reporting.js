import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { tableNames, config } from '../config.js';
import { listDocs, getDoc, downloadBuffer } from '../storage/repository.js';

const safe=v=>String(v??'');
const inRange=(value,from,to)=>{const d=safe(value).slice(0,10);return (!from||d>=from)&&(!to||d<=to);};
const yes=v=>v===true?'Yes':'No';
function csvCell(v){let s=safe(v);if(/^[=+\-@\t\r]/.test(s))s=`'${s}`;return /[",\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s;}
function validDate(v){return !v||/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(`${v}T12:00:00Z`));}
function reportError(message,code='INVALID_REPORT'){return Object.assign(new Error(message),{statusCode:400,code});}

export const reportCatalog=[
  {id:'leadership-overview',title:'Leadership Overview'},
  {id:'worship-participation',title:'Worship & Scheduling'},
  {id:'communications',title:'Communications'},
  {id:'announcements-bulletins',title:'Announcements & Bulletins'},
  {id:'visitors',title:'Visitor Registrations'},
  {id:'petitions',title:'Prayer Petition Activity'},
  {id:'children',title:"Children's Check-in & Pickup"},
  {id:'events',title:'Events & RSVP'},
  {id:'followups',title:'Follow-up Tasks'}
];

export async function buildReport(churchId,type,{from='',to=''}={}){
  if(!reportCatalog.some(x=>x.id===type))throw reportError('Unknown report type.');
  if(!validDate(from)||!validDate(to)||from&&to&&from>to)throw reportError('Choose a valid report date range.','INVALID_DATE_RANGE');
  const church=await getDoc(tableNames.settings,churchId,'church')||{};
  const title=reportCatalog.find(x=>x.id===type)?.title||'Leadership Report';
  const [members,assignments,history,notifications,content,visitors,petitions,children,checkIns,services,ministries,events,eventRegistrations,followUps]=await Promise.all([
    listDocs(tableNames.members,churchId,{max:10000}),listDocs(tableNames.assignments,churchId,{max:10000}),listDocs(tableNames.history,churchId,{max:10000}),listDocs(tableNames.notificationLogs,churchId,{max:10000}),listDocs(tableNames.content,churchId,{max:5000}),listDocs(tableNames.visitorContacts,churchId,{max:5000}),listDocs(tableNames.petitions,churchId,{max:5000}),listDocs(tableNames.children,churchId,{max:5000}),listDocs(tableNames.childCheckIns,churchId,{max:10000}),listDocs(tableNames.services,churchId,{max:1000}),listDocs(tableNames.ministries,churchId,{max:1000}),listDocs(tableNames.events,churchId,{max:5000}),listDocs(tableNames.eventRegistrations,churchId,{max:10000}),listDocs(tableNames.followUps,churchId,{max:5000})
  ]);
  const mm=new Map(members.map(x=>[x.id,x.fullName||x.id])),sm=new Map(services.map(x=>[x.id,x.labelEn||x.label||x.labelEs||x.id])),xm=new Map(ministries.map(x=>[x.id,x.labelEn||x.label||x.labelEs||x.id]));
  const af=assignments.filter(x=>inRange(x.dateISO,from,to)),hf=history.filter(x=>inRange(x.occurredAt||x.dateISO,from,to)),nf=notifications.filter(x=>inRange(x.occurredAt,from,to)),cf=content.filter(x=>inRange(x.publishedAt||x.createdAt,from,to)),vf=visitors.filter(x=>inRange(x.createdAt,from,to)),pf=petitions.filter(x=>inRange(x.createdAt,from,to)),kif=checkIns.filter(x=>inRange(x.checkInAt||x.dateISO,from,to));
  let rows=[];let summary=[];
  if(type==='leadership-overview'){
    const uniqueChildren=new Set(kif.map(x=>x.childId).filter(Boolean)).size,attempted=nf.filter(x=>x.status!=='skipped').length;
    summary=[['Active members (current)',members.filter(x=>x.active!==false).length],['Worship members (current)',members.filter(x=>(x.groups||[]).includes('worship')&&x.active!==false).length],['Assignments',af.length],['Unfilled assignments',af.filter(x=>x.status==='unfilled').length],['Replacements',hf.filter(x=>x.eventType==='replacement.requested').length],['Announcements/Bulletins',cf.length],['Visitors',vf.filter(x=>x.kind==='visitor_contact').length],['Prayer petitions',pf.length],['Child check-in visits',kif.length],['Unique children',uniqueChildren],['Currently in care',checkIns.filter(x=>['checked_in','pickup_requested'].includes(x.status)).length],['Notification attempts',attempted],['Notifications skipped',nf.filter(x=>x.status==='skipped').length],['Notification failures',nf.filter(x=>x.status==='failed').length]];
    rows=summary.map(([Metric,Value])=>({Metric,Value}));
  } else if(type==='worship-participation'){
    rows=af.map(a=>({Date:a.dateISO||'',Service:sm.get(a.serviceId)||a.serviceId||'',Ministry:xm.get(a.ministryId)||a.ministryId||'',Member:mm.get(a.currentMemberId)||a.currentMemberId||'Unfilled',Status:a.status||'',OriginalMember:mm.get(a.originalMemberId)||a.originalMemberId||'',ReplacementCount:(a.replacements||[]).length,Songs:(a.songIds||[]).length}));
  } else if(type==='communications'){
    rows=nf.map(n=>({When:n.occurredAt||'',Channel:n.channel||'',Status:n.status||'',Member:mm.get(n.memberId)||n.memberId||'',Recipient:n.recipient||'',Event:n.eventKey||'',SuccessCount:n.metadata?.successCount??'',FailureCount:n.metadata?.failureCount??'',Reason:n.metadata?.reason||'',Error:n.error||''}));
  } else if(type==='announcements-bulletins'){
    rows=cf.map(c=>({PublishedAt:c.publishedAt||c.createdAt||'',Kind:c.kind||'',Title:c.titleEn||c.title||c.titleEs||'',IsPublished:yes(c.published!==false),Address:c.address||'',Attachment:c.attachment?.fileName||''}));
  } else if(type==='visitors'){
    rows=vf.filter(x=>x.kind==='visitor_contact').map(v=>({Registered:v.createdAt||'',Name:v.fullName||'',Phone:v.phone||'',Email:v.email||'',FirstVisit:yes(v.firstVisit),Status:v.status||'',Interests:(v.interests||[]).join('; ')}));
  } else if(type==='petitions'){
    rows=pf.map(p=>({Created:p.createdAt||'',Member:p.memberName||mm.get(p.memberId)||'',Privacy:p.private===true?'Private':'Public',Status:p.status||'',Summary:p.private===true?'Private petition — content withheld from report':safe(p.text).slice(0,160)}));
  } else if(type==='children'){
    rows=kif.map(c=>({Date:c.dateISO||safe(c.checkInAt).slice(0,10),Child:c.childName||'',Age:c.childAge??'',Gender:c.childGender||'',CareArea:c.careArea||'',ParentGuardian:mm.get(c.memberId)||c.memberId||'',CheckIn:c.checkInAt||'',Pickup:c.pickupAt||'',Status:c.status||'',Service:sm.get(c.serviceId)||c.serviceId||'',ParentAlerts:hf.filter(h=>h.eventType==='children.parent_alert'&&h.details?.checkInId===c.id).length,CheckedInBy:mm.get(c.checkedInBy)||c.checkedInBy||'',ReleasedBy:mm.get(c.releasedBy)||c.releasedBy||'',ReceivedBy:c.receivedByName||''}));
  } else if(type==='events'){
    rows=events.filter(e=>inRange(e.dateISO,from,to)).map(e=>{const regs=eventRegistrations.filter(r=>r.eventId===e.id&&r.status==='registered');return {Date:e.dateISO||'',Time:e.startTime||'',Event:e.titleEn||e.titleEs||'',Location:e.location||'',Capacity:e.capacity||'',RegisteredPeople:regs.reduce((n,r)=>n+Number(r.partySize||1),0),RegisteredNames:regs.map(r=>r.memberName||mm.get(r.memberId)||r.memberId||'').filter(Boolean).join('; '),Active:yes(e.active!==false)};});
  } else if(type==='followups'){
    rows=followUps.filter(f=>inRange(f.createdAt||f.dueDate,from,to)).map(f=>({Created:f.createdAt||'',Due:f.dueDate||'',Task:f.title||'',Source:f.sourceType||'',AssignedTo:mm.get(f.assignedTo)||f.assignedTo||'',Status:f.status||'',Updated:f.updatedAt||''}));
  }
  const limits={members:10000,assignments:10000,history:10000,notifications:10000,content:5000,visitors:5000,petitions:5000,children:5000,checkIns:10000,services:1000,ministries:1000,events:5000,eventRegistrations:10000,followUps:5000};
  const loaded={members,assignments,history,notifications,content,visitors,petitions,children,checkIns,services,ministries,events,eventRegistrations,followUps};
  const possiblyTruncated=Object.keys(loaded).filter(k=>loaded[k].length>=limits[k]);
  return {type,title,church,from,to,generatedAt:new Date().toISOString(),rows,summary,completeness:{complete:possiblyTruncated.length===0,rowCount:rows.length,possiblyTruncated}};
}

async function logoBuffer(report){try{if(report.church?.logo?.blobName)return (await downloadBuffer(config.attachmentsContainer,report.church.logo.blobName)).buffer;}catch{}return null;}
export function reportCsv(report){const headers=Object.keys(report.rows[0]||{Message:'No records'});return [headers.map(csvCell).join(','),...report.rows.map(r=>headers.map(h=>csvCell(r[h])).join(','))].join('\r\n');}
export async function reportXlsx(report){const wb=new ExcelJS.Workbook();wb.creator='Westbury Church Hub by Exonuvia';const ws=wb.addWorksheet(report.title.slice(0,31));const churchName=report.church.churchNameEn||report.church.churchName||'Westbury Church of Christ';ws.mergeCells('A1:H1');ws.getCell('A1').value=churchName;ws.getCell('A1').font={bold:true,size:18};ws.mergeCells('A2:H2');ws.getCell('A2').value=report.title;ws.getCell('A2').font={bold:true,size:14};ws.mergeCells('A3:H3');ws.getCell('A3').value=`${report.from||'All dates'} — ${report.to||'All dates'} | Generated ${report.generatedAt}`;const logo=await logoBuffer(report);if(logo){try{const imageId=wb.addImage({buffer:logo,extension:report.church.logo?.contentType==='image/jpeg'?'jpeg':'png'});ws.addImage(imageId,{tl:{col:8,row:0},ext:{width:120,height:55}});}catch{}}const headers=Object.keys(report.rows[0]||{Message:'No records'});ws.addRow([]);ws.addRow(headers);const header=ws.lastRow;header.font={bold:true};header.eachCell(c=>{c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE9EEF5'}};});for(const r of report.rows)ws.addRow(headers.map(h=>r[h]??''));ws.columns=headers.map(h=>({key:h,width:Math.min(42,Math.max(14,h.length+3))}));ws.views=[{state:'frozen',ySplit:5}];return Buffer.from(await wb.xlsx.writeBuffer());}
export async function reportPdf(report){return new Promise(async(resolve,reject)=>{try{const doc=new PDFDocument({size:'LETTER',margin:42,bufferPages:true});const chunks=[];doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);const churchName=report.church.churchNameEn||report.church.churchName||'Westbury Church of Christ';const logo=await logoBuffer(report);if(logo){try{doc.image(logo,42,36,{fit:[72,54]});}catch{}}doc.fontSize(18).font('Helvetica-Bold').text(churchName,126,42,{align:'left'});doc.fontSize(13).text(report.title,126,66);doc.fontSize(8).font('Helvetica').fillColor('#555').text(`${report.from||'All dates'} — ${report.to||'All dates'} | Generated ${report.generatedAt}`,126,84);doc.moveTo(42,104).lineTo(570,104).strokeColor('#999').stroke();doc.fillColor('#000');let y=120;const rows=report.rows.length?report.rows:[{Message:'No records for selected period'}];const headers=Object.keys(rows[0]);for(const r of rows){if(y>710){doc.addPage();y=52;}doc.fontSize(9).font('Helvetica-Bold').text(headers.slice(0,2).map(h=>`${h}: ${safe(r[h])}`).join('   |   '),42,y,{width:528});y+=14;doc.fontSize(7.5).font('Helvetica').fillColor('#333');const detail=headers.slice(2).map(h=>`${h}: ${safe(r[h])}`).join('   •   ');doc.text(detail,42,y,{width:528});y=doc.y+10;doc.fillColor('#000').moveTo(42,y-4).lineTo(570,y-4).strokeColor('#ddd').stroke();}doc.end();}catch(e){reject(e);}});}
