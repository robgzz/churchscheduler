import { fold } from './normalize.js';
const months={enero:1,january:1,febrero:2,february:2,marzo:3,march:3,abril:4,april:4,mayo:5,may:5,junio:6,june:6,julio:7,july:7,agosto:8,august:8,septiembre:9,setiembre:9,september:9,octubre:10,october:10,noviembre:11,november:11,diciembre:12,december:12};
export function churchDateISO(timezone='America/Chicago',date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
function isoFromParts(y,m,d){return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
function validParts(y,m,d){if(!Number.isInteger(y)||!Number.isInteger(m)||!Number.isInteger(d)||y<1900||y>2200||m<1||m>12||d<1||d>31)return false;const dt=new Date(Date.UTC(y,m-1,d));return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d;}
function safeIso(y,m,d){return validParts(y,m,d)?isoFromParts(y,m,d):'';}
export function numericDateInfo(text){
  const s=fold(text),m=s.match(/(?:^|\s)(\d{1,2})\/(\d{1,2})\/(\d{4})(?=\s|$|[?.!,])/);if(!m)return null;
  const a=Number(m[1]),b=Number(m[2]),y=Number(m[3]);let month=0,day=0,ambiguous=false,alternatives=[];
  if(a>12&&b<=12){day=a;month=b;}else if(b>12&&a<=12){month=a;day=b;}else if(a<=12&&b<=12){ambiguous=true;const us=safeIso(y,a,b),intl=safeIso(y,b,a);alternatives=[...new Set([us,intl].filter(Boolean))];if(alternatives.length===1){ambiguous=false;return {date:alternatives[0],ambiguous:false,alternatives};}return {date:'',ambiguous:true,alternatives};}else return {date:'',ambiguous:false,alternatives:[]};
  return {date:safeIso(y,month,day),ambiguous:false,alternatives:[]};
}
export function parseDateFromText(text,{timezone='America/Chicago',todayISO=churchDateISO(timezone)}={}){
  const s=fold(text),today=new Date(`${todayISO}T12:00:00Z`),year=today.getUTCFullYear();
  let m=s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);if(m)return safeIso(Number(m[1]),Number(m[2]),Number(m[3]));
  const numeric=numericDateInfo(s);if(numeric?.date&&!numeric.ambiguous)return numeric.date;if(numeric?.ambiguous)return '';
  m=s.match(/\b(\d{1,2})\s+(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(?:de\s+)?(\d{4}))?\b/);
  if(m){let y=Number(m[3]||year),iso=safeIso(y,months[m[2]],Number(m[1]));if(!iso)return '';if(!m[3]&&iso<todayISO)iso=safeIso(y+1,months[m[2]],Number(m[1]));return iso;}
  m=s.match(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?\b/);
  if(m){let y=Number(m[3]||year),iso=safeIso(y,months[m[1]],Number(m[2]));if(!iso)return '';if(!m[3]&&iso<todayISO)iso=safeIso(y+1,months[m[1]],Number(m[2]));return iso;}
  if(/\bhoy\b|\btoday\b/.test(s))return todayISO;
  if(/\bmanana\b|\btomorrow\b/.test(s)){today.setUTCDate(today.getUTCDate()+1);return today.toISOString().slice(0,10);}
  const target=/miercoles|wednesday/.test(s)?3:/domingo|sunday/.test(s)?0:null;
  if(target!==null){const day=today.getUTCDay();
    if(/pasado|pasada|anterior|last|previous/.test(s)){let delta=(day-target+7)%7;if(delta===0)delta=7;today.setUTCDate(today.getUTCDate()-delta);return today.toISOString().slice(0,10);}
    const delta=(target-day+7)%7||(/proxim|next|siguiente/.test(s)?7:0);today.setUTCDate(today.getUTCDate()+delta);return today.toISOString().slice(0,10);}
  return '';
}
export function parseTimeFromText(text){const s=fold(text);let m=s.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);if(m){let h=Number(m[1]),min=Number(m[2]||0);if(h<1||h>12||min>59)return '';if(m[3]==='pm'&&h<12)h+=12;if(m[3]==='am'&&h===12)h=0;return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;}m=s.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);return m?`${String(Number(m[1])).padStart(2,'0')}:${m[2]}`:'';}

export function parseDateRangeFromText(text,{timezone='America/Chicago',todayISO=churchDateISO(timezone)}={}){
  const s=fold(text),today=new Date(`${todayISO}T12:00:00Z`),day=today.getUTCDay();
  const startOfWeek=new Date(today);startOfWeek.setUTCDate(today.getUTCDate()-day);
  const endOfWeek=new Date(startOfWeek);endOfWeek.setUTCDate(startOfWeek.getUTCDate()+6);
  const iso=d=>d.toISOString().slice(0,10);
  if(/esta semana.*(proxima|que viene|siguiente|otra)|this week.*next week/.test(s)){const end=new Date(endOfWeek);end.setUTCDate(end.getUTCDate()+7);return {from:todayISO,to:iso(end)};}
  if(/proximas dos semanas|siguientes dos semanas|next two weeks/.test(s)){const end=new Date(today);end.setUTCDate(end.getUTCDate()+13);return {from:todayISO,to:iso(end)};}
  if(/proxima semana|semana que viene|siguiente semana|next week/.test(s)){const from=new Date(startOfWeek);from.setUTCDate(from.getUTCDate()+7);const to=new Date(from);to.setUTCDate(to.getUTCDate()+6);return {from:iso(from),to:iso(to)};}
  if(/esta semana|this week/.test(s))return {from:todayISO,to:iso(endOfWeek)};
  const one=parseDateFromText(text,{timezone,todayISO});return one?{from:one,to:one}:null;
}
