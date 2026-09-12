import { fold } from './normalize.js';
const months={enero:1,january:1,febrero:2,february:2,marzo:3,march:3,abril:4,april:4,mayo:5,may:5,junio:6,june:6,julio:7,july:7,agosto:8,august:8,septiembre:9,setiembre:9,september:9,octubre:10,october:10,noviembre:11,november:11,diciembre:12,december:12};
export function churchDateISO(timezone='America/Chicago',date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
function isoFromParts(y,m,d){return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
export function parseDateFromText(text,{timezone='America/Chicago',todayISO=churchDateISO(timezone)}={}){
  const s=fold(text),today=new Date(`${todayISO}T12:00:00Z`),year=today.getUTCFullYear();
  let m=s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);if(m)return `${m[1]}-${m[2]}-${m[3]}`;
  m=s.match(/\b(\d{1,2})\s+(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(?:de\s+)?(\d{4}))?\b/);
  if(m){let y=Number(m[3]||year),iso=isoFromParts(y,months[m[2]],Number(m[1]));if(!m[3]&&iso<todayISO)iso=isoFromParts(y+1,months[m[2]],Number(m[1]));return iso;}
  m=s.match(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?\b/);
  if(m){let y=Number(m[3]||year),iso=isoFromParts(y,months[m[1]],Number(m[2]));if(!m[3]&&iso<todayISO)iso=isoFromParts(y+1,months[m[1]],Number(m[2]));return iso;}
  if(/\bhoy\b|\btoday\b/.test(s))return todayISO;
  if(/\bmanana\b|\btomorrow\b/.test(s)){today.setUTCDate(today.getUTCDate()+1);return today.toISOString().slice(0,10);}
  const target=/miercoles|wednesday/.test(s)?3:/domingo|sunday/.test(s)?0:null;
  if(target!==null){const day=today.getUTCDay(),delta=(target-day+7)%7||(/proxim|next|siguiente/.test(s)?7:0);today.setUTCDate(today.getUTCDate()+delta);return today.toISOString().slice(0,10);}
  return '';
}
export function parseTimeFromText(text){const s=fold(text);let m=s.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);if(m){let h=Number(m[1]),min=Number(m[2]||0);if(m[3]==='pm'&&h<12)h+=12;if(m[3]==='am'&&h===12)h=0;return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;}m=s.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);return m?`${String(Number(m[1])).padStart(2,'0')}:${m[2]}`:'';}

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
