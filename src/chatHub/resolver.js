import { intentCatalog } from './catalog.js';
import { fold, normalizeInput } from './normalize.js';
const concepts={
  week:['semana','esta semana','proxima semana','this week','week'],
  assignment:['asignacion','asignaciones','servir','sirvo','toca','ministerio','turno','scheduled','assigned','serve'],self:['me','mi','mis','yo','my','i'],
  replacement:['reemplazo','reemplazar','reemplace','cubrir','cubra','no puedo servir','quitarme','replacement','replace','cover','cannot serve','cant serve'],
  availability:['no estare','no voy a estar','ausencia','disponible','disponibilidad','unavailable','availability','fuera'],
  songs:['cantos','canciones','song','songs','dirige cantos'],history:['historial','anteriores','pasado','history','previous','use','utilice'],
  announcement:['anuncio','anuncios','confraternidad','fellowship','announcement','bulletin notice'],event:['evento','eventos','event'],prayer:['oracion','peticion','peticiones','prayer'],
  pickupCode:['codigo','recoger','recogida','pickup code','code'],children:['hijo','hija','nino','nina','ninos','children','child','kid'],pickup:['recoger','recogida','pickup','pick up'],
  program:['programa','listo','ready','program'],programQuery:['predica','predicar','predicador','sermon','meditacion','quien sirve','quien tiene','who is preaching','who has','who is serving','programa del domingo','sunday program'],
  pending:['falta','faltan','pendiente','pendientes','pending','missing'],memberSearch:['busca','buscar','encuentra','miembro','perfil','find','search','member'],bulletin:['boletin','bulletin'],
  count:['cuantos','cuantas','cantidad','numero','how many','count'],list:['que anuncios','cuales','lista','list','what announcements'],rsvp:['rsvp','registrado','confirmacion','asistencia','registered'],
  task:['tarea','tareas','task','tasks','seguimiento','follow up'],complete:['completa','completada','termine','terminada','complete','completed','finished'],create:['crea','crear','nuevo','nueva','agrega','publica','asigna','create','new','add','publish','assign'],
  module:['modulo','modulos','module','modules'],status:['estado','status','activo','activos','enabled']
};
function wordBoundaryPhrase(text,phrase){const f=normalizeInput(phrase).normalized||fold(phrase);if(!f)return false;if(f.includes(' '))return text.includes(f);return new RegExp(`(^|\\s)${f.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?=\\s|$)`).test(text);}
export function resolveIntent(normalized,{isAdmin=false,lastIntent=''}={}){
  const text=normalized.normalized;let best={id:'unknown',score:0,reasons:[]},second={id:'unknown',score:0};
  for(const item of intentCatalog){let score=0,reasons=[];
    for(const p of item.phrases){const f=normalizeInput(p).normalized;if(wordBoundaryPhrase(text,f)){const pts=Math.min(78,28+f.split(' ').length*10);score+=pts;reasons.push(p);}}
    for(const c of item.concepts||[]){if((concepts[c]||[]).some(w=>wordBoundaryPhrase(text,w))){score+=16;reasons.push(c);}}
    if(item.id.startsWith('admin.'))score+=isAdmin?7:-28;
    if(item.id===lastIntent&&score>0)score+=6;
    if(normalized.isQuestion&&item.readOnly===true)score+=5;
    if(normalized.isRequest&&item.readOnly===false)score+=7;
    if(normalized.isQuestion&&item.readOnly===false&&!/necesito|quiero|i need|i want/.test(text))score-=4;
    if(score>best.score){second={id:best.id,score:best.score};best={id:item.id,score,reasons,item};}else if(score>second.score)second={id:item.id,score};
  }
  const confidence=Math.max(0,Math.min(1,best.score/105));
  const gap=best.score-second.score;
  return {...best,confidence,ambiguous:best.score<50||(second.score>25&&gap<12),second};
}
export function knownHighlights(normalized){const hits=[];for(const [name,words] of Object.entries(concepts))for(const w of words){if(normalized.normalized.includes(fold(w))){hits.push({concept:name,text:w});break;}}return hits.slice(0,8);}
