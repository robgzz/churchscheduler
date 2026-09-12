import { intentCatalog } from './catalog.js';
import { fold, normalizeInput } from './normalize.js';

// Concepts are deliberately bilingual and include common Spanglish. They are not permissions.
const concepts={
  navigation:['abre','abrir','ve a','ir a','llevame','open','go to','take me to','show screen'],
  profile:['perfil','correo','email','telefono','phone','preferencias','settings','ministerios','ministries'],
  notification:['notificacion','notificaciones','aviso','avisos','notification','notifications'],
  search:['busca','buscar','encuentra','find','search'],visitor:['visitante','visitantes','visitor','visitors','solicitud de acceso','access request'],
  week:['semana','esta semana','proxima semana','this week','next week','week'],service:['servicio','servicios','service','services','adoracion','worship','clase dominical','sunday class','miercoles','wednesday'],
  assignment:['asignacion','asignaciones','servir','sirvo','toca','ministerio','turno','programado','scheduled','assigned','serve'],self:['me','mi','mis','yo','my','i'],
  replacement:['reemplazo','reemplazar','reemplace','cubrir','cubra','no puedo servir','quitarme','replacement','replace','cover','cannot serve','cant serve'],
  availability:['no estare','no voy a estar','ausencia','disponible','disponibilidad','voy a faltar','no me programes','unavailable','availability','away'],
  songs:['cantos','canciones','canto','cancion','cantar','canta','cantor','cantores','song','songs','sing','singing','singer','dirige cantos'],history:['historial','anteriores','pasado','ultima vez','history','previous','last time'],
  announcement:['anuncio','anuncios','noticias','confraternidad','fellowship','announcement','announcements'],event:['evento','eventos','event','events'],prayer:['oracion','peticion','peticiones','prayer','petition'],
  pickupCode:['codigo','recoger','recogida','pickup code','code'],children:['hijo','hija','nino','nina','ninos','children','child','kid','nursery','toddlers'],pickup:['recoger','recogida','pickup','pick up'],verification:['verificacion','codigo temporal','sin codigo','no recuerdo el codigo','verification','alternate'],caregiver:['cuidador','cuidadora','salon','area de cuidado','caregiver','room','roster'],
  program:['programa','programador','listo','ready','program','schedule'],participation:['participado','participo','participacion','sirvio','servido','participated','participation','served'],programQuery:['predica','predicar','predicador','sermon','meditacion','mensaje','quien sirve','quien tiene','who is preaching','who has','who is serving','programa del domingo','sunday program','vigilancia','security','comunion','communion','escritura','scripture','clase','class','teacher','teaching','maestro','profesor','cantar','canta','sing','singing'],
  pending:['falta','faltan','pendiente','pendientes','pending','missing'],memberSearch:['busca','buscar','encuentra','miembro','miembros','perfil','find','search','member','members'],member:['miembro','miembros','cuenta de miembro','member','member account'],bulletin:['boletin','bulletin'],upload:['sube','subir','carga','upload'],
  count:['cuantos','cuantas','cantidad','numero','how many','count'],list:['que anuncios','que peticiones','cuales','lista','muestrame','mostrar','ver','list','show','what announcements'],rsvp:['rsvp','registrado','registro','confirmacion','asistencia','registered','attendance'],register:['registrame','registrar','acepto','asistir','register','attending','sign me up'],cancel:['cancela','cancelar','ya no voy','cancel','not attending'],dismiss:['oculta','ocultar','quita de mi pantalla','remove from my screen','hide','dismiss'],
  task:['tarea','tareas','task','tasks','seguimiento','follow up'],complete:['completa','completada','termine','terminada','complete','completed','finished','done'],create:['crea','crear','nuevo','nueva','agrega','agregar','publica','asigna','genera','create','new','add','publish','assign','generate'],delete:['elimina','eliminar','borra','borrar','delete','remove'],
  module:['modulo','modulos','module','modules'],toggle:['activa','activar','desactiva','desactivar','habilita','enable','disable','turn on','turn off'],status:['estado','status','activo','activos','enabled','ready'],admin:['todas','privadas','admin','all','private'],
  adminConsole:['administracion','administrador','consola','panel','admin console','admin portal','administration'],report:['reporte','reportes','reports','report center'],communication:['comunicaciones','correo','sms','mensajes','cola','communications','email','message queue'],audit:['auditoria','historial de cambios','audit','audit log']
};
function wordBoundaryPhrase(text,phrase){const f=normalizeInput(phrase).normalized||fold(phrase);if(!f)return false;if(f.includes(' '))return text.includes(f);return new RegExp(`(^|\\s)${f.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}(?=\\s|$)`).test(text);}
function has(text,concept){return (concepts[concept]||[]).some(w=>wordBoundaryPhrase(text,w));}

// Grammar boosts let natural variations resolve without enumerating every sentence.
function grammarBoost(id,text,{isAdmin,normalized}){
  const q=normalized.isQuestion,r=normalized.isRequest;
  const H=c=>has(text,c);
  let s=0;
  if(id==='assignments.mine'&&H('assignment')&&H('self'))s+=42;
  if(id==='program.query'&&(H('programQuery')||(H('program')&&q)))s+=52;
  if(id==='program.participation'&&H('participation'))s+=58;
  if(id==='replacement.request'&&H('replacement'))s+=42;
  if(id==='availability.add'&&H('availability'))s+=42;
  if(id==='announcements.count'&&H('announcement')&&H('count'))s+=48;
  if(id==='announcements.list'&&H('announcement')&&H('list'))s+=42;
  if(id==='announcements.query'&&H('announcement')&&q)s+=48;
  if(id==='announcements.query'&&H('event')&&!H('announcement'))s-=70;
  if(id==='events.query'&&H('event')&&q&&!H('rsvp'))s+=58;
  if(id==='events.query'&&H('announcement')&&!H('event'))s-=35;
  if(id==='events.myRsvp'&&H('event')&&H('rsvp')&&H('self')&&q)s+=42;
  if(id==='events.register'&&H('event')&&H('register'))s+=48;
  if(id==='events.cancelRsvp'&&H('event')&&H('cancel'))s+=48;
  if(id==='events.dismiss'&&H('event')&&H('dismiss'))s+=52;
  if(id==='tasks.mine'&&H('task')&&H('self')&&q)s+=40;
  if(id==='tasks.complete'&&H('task')&&H('complete'))s+=50;
  if(id==='tasks.cancel'&&H('task')&&H('cancel'))s+=50;
  if(id==='tasks.dismiss'&&H('task')&&H('dismiss'))s+=52;
  if(id==='prayer.list'&&H('prayer')&&H('list')&&!H('self'))s+=38;
  if(id==='prayer.mine'&&H('prayer')&&(H('self')||/\b(tengo|i have|do i have)\b/.test(text)))s+=52;
  if(id==='prayer.create'&&H('prayer')&&H('create'))s+=52;
  if(id==='prayer.delete'&&H('prayer')&&H('delete'))s+=52;
  if(id==='children.pickupCode'&&H('pickupCode')&&q)s+=40;
  if(id==='children.parentVerification'&&H('children')&&H('verification'))s+=46;
  if(id==='children.pickupRequest'&&H('children')&&H('pickup')&&r)s+=42;
  if(id==='children.workerStatus'&&H('children')&&H('caregiver')&&q)s+=40;
  if(id==='navigation.open'&&H('navigation'))s+=38;
  if(id==='services.query'&&H('service')&&q)s+=36;
  if(isAdmin){
    if(id==='admin.memberCreate'&&H('member')&&H('create'))s+=62;
    if(id==='admin.memberSearch'&&H('memberSearch')&&!H('create'))s+=38;
    if(id==='admin.bulletinUpload'&&H('bulletin')&&H('upload'))s+=58;
    if(id==='admin.announcementCreate'&&H('announcement')&&H('create'))s+=58;
    if(id==='admin.eventCreate'&&H('event')&&H('create'))s+=58;
    if(id==='admin.taskCreate'&&H('task')&&H('create'))s+=58;
    if(id==='admin.prayer.list'&&H('prayer')&&H('admin'))s+=48;
    if(id==='admin.moduleToggle'&&H('module')&&H('toggle'))s+=58;
    if(id==='admin.reports.query'&&H('report'))s+=48;
    if(id==='admin.communications.query'&&H('communication'))s+=48;
    if(id==='admin.audit.query'&&H('audit'))s+=48;
    if(id==='admin.childrenStatus'&&H('children')&&H('admin'))s+=36;
    if(id==='admin.console'&&H('adminConsole'))s+=55;
  }
  return s;
}

export function resolveIntent(normalized,{isAdmin=false,lastIntent=''}={}){
  const text=normalized.normalized;let best={id:'unknown',score:0,reasons:[]},second={id:'unknown',score:0};
  for(const item of intentCatalog){let score=0,reasons=[];
    for(const p of item.phrases){const f=normalizeInput(p).normalized;if(wordBoundaryPhrase(text,f)){const pts=Math.min(100,38+f.split(' ').length*12);score+=pts;reasons.push(p);}}
    for(const c of item.concepts||[]){if(has(text,c)){score+=18;reasons.push(c);}}
    const grammar=grammarBoost(item.id,text,{isAdmin,normalized});if(grammar){score+=grammar;reasons.push('grammar');}
    if(item.id.startsWith('admin.'))score+=isAdmin?14:-80;
    if(item.id===lastIntent&&score>0)score+=6;
    if(normalized.isQuestion&&item.readOnly===true)score+=8;
    if(normalized.isRequest&&item.readOnly===false)score+=12;
    if(normalized.isRequest&&item.readOnly===true&&!['navigation.open','admin.console'].includes(item.id))score-=10;
    if(item.id==='admin.eventRsvpList'&&/\b(mi|mis|estoy|my|myself)\b/.test(text))score-=50;
    if(item.id==='prayer.list'&&isAdmin&&/\b(todas|privadas|all|private)\b/.test(text))score-=20;
    if(score>best.score){second={id:best.id,score:best.score};best={id:item.id,score,reasons,item};}else if(score>second.score)second={id:item.id,score};
  }
  const confidence=Math.max(0,Math.min(1,best.score/120)),gap=best.score-second.score;
  return {...best,confidence,ambiguous:best.score<50||(second.score>38&&gap<9),second};
}
export function knownHighlights(normalized){const hits=[];for(const [name,words] of Object.entries(concepts))for(const w of words){if(wordBoundaryPhrase(normalized.normalized,w)){hits.push({concept:name,text:w});break;}}return hits.filter(h=>h.concept!=='self').slice(0,10);}
