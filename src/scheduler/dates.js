export function datePartsInZone(date, timeZone){
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year:'numeric', month:'2-digit', day:'2-digit', weekday:'short',
    hour:'2-digit', minute:'2-digit', hourCycle:'h23'
  }).formatToParts(date).reduce((a,p)=>{ a[p.type]=p.value; return a; },{});
  return parts;
}
export function todayIso(timeZone){
  const p=datePartsInZone(new Date(), timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}
export function addDays(iso, days){
  const d=new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+days); return d.toISOString().slice(0,10);
}
export function weekday(iso){ return new Date(`${iso}T12:00:00Z`).getUTCDay(); }
export function startOfWeek(iso, weekStartsOn=0){
  const diff=(weekday(iso)-weekStartsOn+7)%7;
  return addDays(iso,-diff);
}
export function threeWeekWindow(timeZone, weekStartsOn=0){
  const today=todayIso(timeZone); const start=startOfWeek(today,weekStartsOn); return { start, end:addDays(start,20), today };
}
export function daysBetween(fromIso, toIso){
  if (!fromIso) return 9999;
  return Math.max(0, Math.floor((Date.parse(`${toIso}T12:00:00Z`)-Date.parse(`${fromIso.slice(0,10)}T12:00:00Z`))/86400000));
}
export function isSameWeek(dateA, dateB, weekStartsOn=0){ return startOfWeek(dateA,weekStartsOn)===startOfWeek(dateB,weekStartsOn); }

function nthWeekday(year, month1, dayOfWeek, ordinal){
  const first=new Date(Date.UTC(year,month1-1,1,12));
  let day=1+((dayOfWeek-first.getUTCDay()+7)%7);
  if (ordinal===-1 || ordinal===5){
    const last=new Date(Date.UTC(year,month1,0,12));
    day=last.getUTCDate()-((last.getUTCDay()-dayOfWeek+7)%7);
  } else day += (Math.max(1,ordinal)-1)*7;
  const d=new Date(Date.UTC(year,month1-1,day,12));
  return d.getUTCMonth()===month1-1 ? d.toISOString().slice(0,10) : null;
}

export function occurrenceDates(service, startIso, endIso){
  const r=service.recurrence || {frequency:'weekly',weekday:0};
  const out=[];
  if (r.frequency==='daily'){
    for(let d=startIso; d<=endIso; d=addDays(d,1)) out.push(d);
    return out;
  }
  if (r.frequency==='weekly' || r.frequency==='every_n_weeks'){
    const target=Number(r.weekday ?? 0); let d=startIso;
    while(weekday(d)!==target && d<=endIso) d=addDays(d,1);
    const step=7*Math.max(1,Number(r.intervalWeeks||1));
    while(d<=endIso){ out.push(d); d=addDays(d,step); }
    return out;
  }
  if (r.frequency==='monthly'){
    const start=new Date(`${startIso}T12:00:00Z`); let y=start.getUTCFullYear(), m=start.getUTCMonth()+1;
    while(true){
      const d=nthWeekday(y,m,Number(r.weekday??0),Number(r.ordinal||1));
      if (d && d>=startIso && d<=endIso) out.push(d);
      m += Math.max(1,Number(r.everyMonths||1)); while(m>12){m-=12;y++;}
      if (`${y}-${String(m).padStart(2,'0')}-01`>endIso) break;
    }
    return out;
  }
  return out;
}
