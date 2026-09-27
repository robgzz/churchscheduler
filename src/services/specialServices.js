import crypto from 'node:crypto';

const datePattern=/^\d{4}-\d{2}-\d{2}$/;
const timePattern=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
const clean=(value,max=160)=>String(value??'').trim().slice(0,max);
function validDate(value){return datePattern.test(value)&&!Number.isNaN(Date.parse(`${value}T12:00:00Z`))&&new Date(`${value}T12:00:00Z`).toISOString().slice(0,10)===value;}
export function validateService(input,{old=null,forceSpecial=false}={}){
  if(!input||typeof input!=='object'||Array.isArray(input))throw Object.assign(new Error('Invalid service'),{statusCode:400});
  const labelEn=clean(input.labelEn??input.label??old?.labelEn,100), labelEs=clean(input.labelEs??input.label??old?.labelEs,100);
  if(!labelEn||!labelEs)throw Object.assign(new Error('Service names required'),{statusCode:400});
  const startTime=clean(input.startTime??old?.startTime??'10:00',5);
  if(!timePattern.test(startTime))throw Object.assign(new Error('Invalid start time'),{statusCode:400});
  const active=typeof input.active==='boolean'?input.active:(old?.active??(forceSpecial?false:true));
  const category=old?.category|| (forceSpecial?'special':'regular');
  const location=clean(input.location??old?.location??'',150), address=clean(input.address??old?.address??'',250);
  const r=input.recurrence??old?.recurrence??{frequency:'once',date:''};
  if(!r||typeof r!=='object'||Array.isArray(r))throw Object.assign(new Error('Invalid recurrence'),{statusCode:400});
  const freq=r.frequency;
  if(!['once','daily','weekly','every_n_weeks','monthly'].includes(freq))throw Object.assign(new Error('Invalid recurrence frequency'),{statusCode:400});
  let recurrence;
  if(freq==='once'){
    const date=clean(r.date,10);if(date&&!validDate(date))throw Object.assign(new Error('Invalid service date'),{statusCode:400});
    if(active&&!date)throw Object.assign(new Error('Set a date before activating the event'),{statusCode:400});
    recurrence={frequency:'once',date};
  }else{
    const weekday=Number(r.weekday??0);
    if(!Number.isInteger(weekday)||weekday<0||weekday>6)throw Object.assign(new Error('Invalid weekday'),{statusCode:400});
    const intervalWeeks=Number(r.intervalWeeks??1), everyMonths=Number(r.everyMonths??1),ordinal=Number(r.ordinal??1);
    if(!Number.isInteger(intervalWeeks)||intervalWeeks<1||intervalWeeks>52||!Number.isInteger(everyMonths)||everyMonths<1||everyMonths>12||![1,2,3,4,5,-1].includes(ordinal))throw Object.assign(new Error('Invalid recurrence interval'),{statusCode:400});
    const startDate=clean(r.startDate,10),endDate=clean(r.endDate,10);
    if((startDate&&!validDate(startDate))||(endDate&&!validDate(endDate))||(startDate&&endDate&&startDate>endDate))throw Object.assign(new Error('Invalid recurrence dates'),{statusCode:400});
    recurrence={frequency:freq,weekday,intervalWeeks,everyMonths,ordinal,startDate,endDate};
  }
  return {label:labelEn,labelEn,labelEs,startTime,active,category,location,address,recurrence};
}
export function validateTemplateItems(items,ministries){
  if(!Array.isArray(items)||items.length>32)throw Object.assign(new Error('Invalid program template (maximum 32 lines)'),{statusCode:400});
  const mids=new Set(ministries.map(m=>m.id));const keys=new Map();
  return items.map((it,i)=>{
    if(!it||typeof it!=='object'||!mids.has(it.ministryId))throw Object.assign(new Error('Invalid ministry'),{statusCode:400});
    const labelEs=clean(it.labelEs??it.label,100),labelEn=clean(it.labelEn??it.label,100);
    if(!labelEs||!labelEn)throw Object.assign(new Error('Assignment labels required'),{statusCode:400});
    const assignmentKeys=it.assignmentKeys;
    if(!Array.isArray(assignmentKeys)||!assignmentKeys.length||assignmentKeys.length>6||assignmentKeys.some(k=>!/^[-a-zA-Z0-9_]{1,70}$/.test(k)))throw Object.assign(new Error('Invalid assignment keys'),{statusCode:400});
    for(const k of assignmentKeys){if(keys.has(k)&&keys.get(k)!==it.ministryId)throw Object.assign(new Error('Linked positions must share a ministry'),{statusCode:400});keys.set(k,it.ministryId);}
    return {id:clean(it.id||`item_${i+1}`,70),label:labelEs,labelEn,labelEs,ministryId:it.ministryId,assignmentKeys,linked:it.linked===true,...(it.ministryId==='ministry_songs'&&['main','invitation','communion','offering'].includes(it.songSection)?{songSection:it.songSection}:{})};
  });
}
export function newServiceId(){return `svc_${crypto.randomUUID().replace(/-/g,'').slice(0,12)}`;}

export const FUNERAL_TEACHER_PRIORITY=Object.freeze(['Eduardo Ayala','Roberto Gonzalez','Luis Betanco']);
export function prioritizeFuneralTeachers(ranking){
  const order=new Map(FUNERAL_TEACHER_PRIORITY.map((name,i)=>[name,i]));
  return ranking.filter(r=>order.has(r.member.fullName)).sort((a,b)=>order.get(a.member.fullName)-order.get(b.member.fullName));
}
/** One-time profile migration: keep ALL older regular eligibility before enabling
 * the requested funeral pools. Never call this on every scheduler generation. */
export function initialFuneralEligibility(member,templates){
  if((member.serviceAvailability||[]).includes('svc_funeral') || (member.assignmentEligibility||[]).some(x=>x.startsWith('svc_funeral::')))return null;
  const funeralTemplate=templates.find(t=>t.id==='tpl_funeral');
  const sundayTemplate=templates.find(t=>t.id==='tpl_sunday_worship');
  if(!funeralTemplate||!sundayTemplate)return null;
  const sourceByMinistry=new Map();
  for(const item of sundayTemplate.items||[]){
    const keys=sourceByMinistry.get(item.ministryId)||new Set();
    for(const key of item.assignmentKeys||[])keys.add(key);
    sourceByMinistry.set(item.ministryId,keys);
  }
  const ministries=new Set(member.ministries||[]);
  const explicit=member.assignmentEligibilityMode==='explicit'&&Array.isArray(member.assignmentEligibility);
  const eligibility=new Set(member.assignmentEligibility||[]);
  if(!explicit){
    for(const service of member.serviceAvailability||[]){
      const template=templates.find(t=>t.serviceId===service);
      for(const slot of template?.items||[]){
        if(!ministries.has(slot.ministryId))continue;
        for(const key of slot.assignmentKeys||[])eligibility.add(`${service}::${key}`);
      }
    }
  }
  const worshipAvailable=(member.serviceAvailability||[]).includes('svc_sunday_worship');
  const teacher=FUNERAL_TEACHER_PRIORITY.includes(String(member.fullName||'').trim());
  let changed=false;
  for(const slot of funeralTemplate.items||[]){
    const keys=sourceByMinistry.get(slot.ministryId)||new Set();
    const inherited=worshipAvailable&&ministries.has(slot.ministryId)&&(!explicit||[...keys].some(key=>eligibility.has(`svc_sunday_worship::${key}`)));
    if(inherited || (slot.ministryId==='ministry_class_teacher'&&teacher)){
      ministries.add(slot.ministryId);
      for(const key of slot.assignmentKeys||[])eligibility.add(`svc_funeral::${key}`);
      changed=true;
    }
  }
  if(!changed)return null;
  return {...member,ministries:[...ministries],serviceAvailability:[...new Set([...(member.serviceAvailability||[]),'svc_funeral'])],assignmentEligibilityMode:'explicit',assignmentEligibility:[...eligibility]};
}
