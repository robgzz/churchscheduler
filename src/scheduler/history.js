import crypto from 'node:crypto';
import { tableNames } from '../config.js';
import { putDoc, listDocs, nowIso } from '../storage/repository.js';

export async function appendHistory(churchId, event){
  const occurredAt=event.occurredAt || nowIso();
  const id=`${occurredAt.replace(/[:.]/g,'')}_${crypto.randomUUID().slice(0,8)}`;
  const doc={ id, churchId, occurredAt, ...event };
  await putDoc(tableNames.history, churchId, id, doc, {
    eventType:String(doc.eventType || ''),
    memberId:String(doc.memberId || ''),
    dateISO:String(doc.dateISO || ''),
    penaltyEligible:doc.penaltyEligible === true
  });
  return doc;
}

export async function listHistory(churchId,{from='',to='',memberId='',eventType='',max=500}={}){
  const filters=[];
  if (from) filters.push(`dateISO ge '${from}'`);
  if (to) filters.push(`dateISO le '${to}'`);
  if (memberId) filters.push(`memberId eq '${String(memberId).replace(/'/g,"''")}'`);
  if (eventType) filters.push(`eventType eq '${String(eventType).replace(/'/g,"''")}'`);
  const rows=await listDocs(tableNames.history,churchId,{filter:filters.join(' and '),max});
  return rows.sort((a,b)=>String(b.occurredAt).localeCompare(String(a.occurredAt)));
}
