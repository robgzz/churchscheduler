import { parseDateFromText, parseDateRangeFromText } from './dates.js';
import { Operation, SpeechAct } from '../dce/frame.js';

const P=(domain,resource,patterns,weight=1)=>({domain,resource,patterns,weight});
const patterns=[
 P('worship','assignment',['asignacion','asignaciones','me toca','sirvo','servir','programado','assigned','assignment','assignments','serve']),
 P('worship','program',['programa','predica','predicar','sermon','meditacion','cantos','cantar','cantor','clase','maestro','teacher','teaching','vigilancia','security','comunion','scripture','oracion','who is preaching','who has']),
 P('worship','participation',['participado','participacion','participo','sirvio','serve','served','participated','participation']),
 P('worship','replacement',['reemplazo','reemplazar','cubrir','cubra','replacement','replace','cover me']),
 P('worship','availability',['ausencia','disponibilidad','no estare','no voy a estar','unavailable','availability','away']),
 P('songs','song',['canto','cantos','cancion','canciones','song','songs']),
 P('publications','bulletin',['boletin','bulletin']),
 P('publications','announcement',['anuncio','anuncios','noticias','announcement','announcements','confraternidad','fellowship']),
 P('events','event',['evento','eventos','event','events','rsvp']),
 P('tasks','task',['tarea','tareas','task','tasks','seguimiento','follow up']),
 P('prayer','petition',['peticion','peticiones','oracion','prayer','petition']),
 P('children','child',['hijo','hija','nino','nina','ninos','children','child','kid','nursery','toddlers','pickup','recogida','cuidador','caregiver']),
 P('members','member',['miembro','miembros','member','members','perfil para','profile for']),
 P('profile','profile',['mi perfil','my profile','correo','email','telefono','phone','preferencias','preferences']),
 P('notifications','notification',['notificacion','notificaciones','notification','notifications','avisos']),
 P('services','service',['horario','horarios','servicios habituales','service times','when is worship','what time is worship']),
 P('reports','report',['reporte','reportes','report center','reports']),
 P('communications','communication',['comunicaciones','communications','sms','email queue','cola de mensajes']),
 P('audit','audit',['auditoria','audit','historial de cambios','audit log']),
 P('modules','module',['modulo','modulos','module','modules']),
 P('visitors','visitor',['visitante','visitantes','visitor','visitors','solicitud de acceso','access request']),
 P('navigation','screen',['abre','abrir','open','go to','llevame','ve a']),
 P('summary','summary',['esta semana','this week','resumen','summary'])
];
function scorePattern(text,p){let s=0,e=[];for(const x of p.patterns){if(text.includes(x)){s+=x.includes(' ')?4:2;e.push(`${p.domain}:${x}`);}}return {s:s*p.weight,e};}
export function detectDomain(text,{actor}={}){
  const admin=Boolean(actor?.isAdmin);
  const memberEligibilityChange=admin&&/\b(cambia|cambiar|modifica|modificar|edita|editar|actualiza|actualizar|pon|poner|quita|quitar|agrega|agregar|asigna|asignar|remueve|remover|change|update|edit|add|remove|assign|eligible|ineligible|puede servir|no puede servir|no debe servir|can serve|cannot serve|can sing|no canta)\b/.test(text)&&/\b(miembro|member|ministerio|ministerios|ministry|ministries|cantos?|songs?|clase|class|meditacion|sermon|peticiones|comunion|ofrenda|vigilancia|seguridad|bienvenida|lectura|oracion|prayer|worship|adoracion|miercoles|wednesday|domingo|sunday)\b/.test(text);
  if(memberEligibilityChange)return {domain:'members',resource:'eligibility',score:20,evidence:['members:eligibility-change'],second:null};
  const memberEligibilityQuery=admin&&(/\b(que ministerio|que ministerios|en que ministerio|en que ministerios|ministerio de|ministerios de|what ministry|what ministries|ministry eligibility|elegibilidad ministerial)\b/.test(text)||/\b(puede|can)\b.*\b(servir|cantar|serve|sing)\b/.test(text));
  if(memberEligibilityQuery)return {domain:'members',resource:'eligibility',score:18,evidence:['members:eligibility-query'],second:null};
  const month=/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(text);
  const thirdPartyHistory=month&&/\b(particip\w*|sirvio|servido|serve|served|participated)\b/.test(text)&&!/\b(mi|mis|me|yo|my|i)\b/.test(text);
  if(thirdPartyHistory)return {domain:'worship',resource:'participation',score:12,evidence:['worship:historical-participation'],second:null};
  let candidates=[];for(const p of patterns){const r=scorePattern(text,p);if(!r.s)continue;candidates.push({domain:p.domain,resource:p.resource,score:r.s,evidence:r.e});}
  if(!candidates.length)return null;
  if(candidates.some(c=>!['summary','navigation'].includes(c.domain)))candidates=candidates.filter(c=>c.domain!=='summary');
  candidates.sort((a,b)=>b.score-a.score);return {...candidates[0],second:candidates[1]||null};
}

const roles=[
 ['meditation',/\b(predic\w*|sermon|meditacion|mensaje|preach\w*|sermon)\b/],['songs',/\b(cantos?|canciones?|cantar|canta|cantor(?:es)?|songs?|sing(?:ing)?|singer)\b/],['security',/\b(vigilancia|seguridad|security)\b/],['communion',/\b(comunion|ofrenda|communion|offering)\b/],['scripture',/\b(escritura|scripture)\b/],['welcome',/\b(bienvenida|welcome)\b/],['class_teacher',/\b(clase|maestr[oa]|profesor(?:a)?|teacher|teaching|class)\b/],['prayer',/\b(oracion|prayer)\b/]
];
function roleFrom(text){for(const [id,re] of roles)if(re.test(text))return id;return '';}
function serviceFrom(text,role){if(/\b(miercoles|wednesday)\b/.test(text))return 'wednesday_class';if(/\b(clase dominical|sunday class)\b/.test(text))return 'sunday_class';if(/\b(adoracion|worship|culto)\b/.test(text))return 'sunday_worship';if(/\b(domingo|sunday)\b/.test(text)&&role==='class_teacher')return 'sunday_class';if(/\b(domingo|sunday)\b/.test(text)&&['meditation','communion','security'].includes(role))return 'sunday_worship';if(/\b(domingo|sunday)\b/.test(text))return 'sunday';return '';}
function projectionFrom(text){if(/\b(quien|quienes|who)\b/.test(text))return ['person'];if(/\b(cuando|when)\b/.test(text))return ['date','time'];if(/\b(donde|where)\b/.test(text))return ['location'];if(/\b(cuantos|cuantas|how many)\b/.test(text))return ['count'];return [];}
function subjectFrom(text){if(/\b(mi|mis|me|yo|estoy|soy|my|mine|i|i am|am i)\b/.test(text))return {scope:'self',type:'member',value:''};return {scope:'any',type:'',value:''};}
function occurrencesFrom(text){const m=text.match(/\b(proxim(?:os|as)?|next)\s+(\d+|dos|tres|cuatro|five|two|three|four)\b/);if(!m)return null;const map={dos:2,tres:3,cuatro:4,two:2,three:3,four:4,five:5};return Number(m[2])||map[m[2]]||null;}
export function extractSlots(text,{frame}){const role=roleFrom(text),service=serviceFrom(text,role),projection=projectionFrom(text),subject=subjectFrom(text),timeRange=parseDateRangeFromText(text),one=parseDateFromText(text);const count=occurrencesFrom(text);const time=count?{mode:'next_occurrences',count,weekday:service==='wednesday_class'?3:service.startsWith('sunday')?0:null}:timeRange?{mode:'range',...timeRange}:one?{mode:'date',date:one}:null;const filters={};if(role)filters.role=role;if(service)filters.serviceType=service;return {subject,filters,time,projection,quantifier:count,evidence:[role&&`role:${role}`,service&&`service:${service}`,time&&`time:${time.mode}`].filter(Boolean)};}

function prayerIntent(frame,text,admin){if(admin&&/\b(todas|privadas|all|private)\b/.test(text))return 'admin.prayer.list';if(frame.operation===Operation.CREATE||frame.operation===Operation.REQUEST)return 'prayer.create';if(frame.operation===Operation.DELETE)return 'prayer.delete';if(frame.subject.scope==='self'||/\b(tengo|mis|mine|my)\b/.test(text))return 'prayer.mine';return 'prayer.list';}
function eventIntent(frame,text,admin){if(admin&&frame.operation===Operation.CREATE)return 'admin.eventCreate';if(admin&&/\b(rsvp|registrados|attendees|asistentes)\b/.test(text)&&frame.subject.scope!=='self')return 'admin.eventRsvpList';if(frame.operation===Operation.REGISTER)return 'events.register';if(frame.operation===Operation.CANCEL)return 'events.cancelRsvp';if(frame.operation===Operation.DISMISS)return 'events.dismiss';if(frame.subject.scope==='self'&&/\b(rsvp|registrad\w*|asist\w*)\b/.test(text))return 'events.myRsvp';return 'events.query';}
export function resolveFrame(frame,{text,actor}){const admin=Boolean(actor?.isAdmin),owner=Boolean(actor?.isOwner);let intent='unknown',boost=0;
  if(admin&&[Operation.ENABLE,Operation.DISABLE].includes(frame.operation)&&['events','tasks','prayer','children','publications','worship'].includes(frame.domain))return {intent:'admin.moduleToggle',boost:.2,patch:{entities:{...(frame.entities||{}),module:frame.domain}}};
  if(frame.speechAct===SpeechAct.NAVIGATION){if(/admin|administracion|consola/.test(text)&&admin)intent='admin.console';else intent='navigation.open';return {intent,boost:.18};}
  switch(frame.domain){
    case 'summary': intent='hub.upcomingSummary';break;
    case 'services': intent='services.query';break;
    case 'profile': intent='profile.mine';break;
    case 'notifications': intent='notifications.mine';break;
    case 'songs': intent=frame.operation===Operation.HISTORY?'songs.history':'songs.search';break;
    case 'worship':
      if(frame.resource==='replacement')intent='replacement.request';else if(frame.resource==='availability')intent='availability.add';else if(frame.resource==='participation')intent='program.participation';else if(frame.resource==='assignment'&&frame.subject.scope==='self')intent='assignments.mine';else intent='program.query';break;
    case 'publications':
      if(frame.resource==='bulletin')intent=admin&&frame.operation===Operation.UPLOAD?'admin.bulletinUpload':'bulletins.latest';
      else if(admin&&(frame.operation===Operation.CREATE||frame.operation===Operation.PUBLISH))intent='admin.announcementCreate';
      else if(frame.operation===Operation.COUNT)intent='announcements.count';else if(frame.operation===Operation.LIST)intent='announcements.list';else intent='announcements.query';break;
    case 'events': intent=eventIntent(frame,text,admin);break;
    case 'tasks':
      if(admin&&[Operation.CREATE,Operation.ASSIGN].includes(frame.operation))intent='admin.taskCreate';else if(admin&&frame.subject.scope!=='self'&&frame.operation!==Operation.COMPLETE)intent='admin.tasks.query';else if(frame.operation===Operation.COMPLETE)intent='tasks.complete';else if(frame.operation===Operation.CANCEL)intent='tasks.cancel';else if(frame.operation===Operation.DISMISS)intent='tasks.dismiss';else intent='tasks.mine';break;
    case 'prayer': intent=prayerIntent(frame,text,admin);break;
    case 'children':
      if(admin&&/\b(todos|todas|activo|activos|admin)\b/.test(text))intent='admin.childrenStatus';else if(/\b(codigo|code)\b/.test(text)&&/\b(no recuerdo|temporal|sin codigo|verification|verify|verificacion)\b/.test(text))intent='children.parentVerification';else if(/\b(codigo|code)\b/.test(text))intent='children.pickupCode';else if(/\b(recoger|recogida|pickup|pick up)\b/.test(text)&&frame.speechAct===SpeechAct.COMMAND)intent='children.pickupRequest';else if(/\b(cuidador|caregiver|roster|salon|room)\b/.test(text))intent='children.workerStatus';else intent='children.status';break;
    case 'members':
      if(admin&&frame.resource==='eligibility'){const changeEvidence=(frame.evidence||[]).includes('members:eligibility-change')||/\b(excepto|menos|except)\b/.test(text);intent=changeEvidence||[Operation.UPDATE,Operation.CREATE,Operation.ASSIGN,Operation.DELETE,Operation.REQUEST].includes(frame.operation)||frame.speechAct===SpeechAct.COMMAND?'admin.memberEligibilityUpdate':'admin.memberEligibilityQuery';}else if(admin&&(frame.operation===Operation.CREATE||/\b(nuevo|nueva|new|cuenta de miembro|member account)\b/.test(text)))intent='admin.memberCreate';else if(admin)intent='admin.memberSearch';break;
    case 'reports': intent=admin?'admin.reports.query':'unknown';break;
    case 'communications': intent=admin?'admin.communications.query':'unknown';break;
    case 'audit': intent=admin?'admin.audit.query':'unknown';break;
    case 'modules': intent=admin&&[Operation.ENABLE,Operation.DISABLE].includes(frame.operation)?'admin.moduleToggle':admin?'admin.modules.query':'unknown';break;
    case 'visitors': intent=admin?'admin.visitors.query':'unknown';break;
  }
  if(admin&&frame.domain==='worship'&&frame.operation===Operation.GENERATE)intent='admin.scheduleGenerate';
  if(admin&&frame.domain==='worship'&&frame.operation===Operation.STATUS)intent='admin.programStatus';
  if(admin&&frame.domain==='songs'&&/\b(pendiente|pending|missing)\b/.test(text))intent='admin.pendingSongs';
  if(intent!=='unknown')boost=.16;
  return {intent,boost};
}

export const churchHubDomainPack={detectDomain,extractSlots,resolveFrame};
