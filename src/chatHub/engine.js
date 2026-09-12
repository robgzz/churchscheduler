import crypto from 'node:crypto';
import { tableNames } from '../config.js';
import { putDoc, nowIso } from '../storage/repository.js';
import { moduleState } from '../modules/registry.js';
import { intentCatalog } from './catalog.js';
import { normalizeInput } from './normalize.js';
import { resolveIntent, knownHighlights } from './resolver.js';
import { authorize, isAdmin } from './policy.js';
import { getChatState, saveChatState } from './session.js';
import { executeIntent } from './handlers.js';

const domainModule={
  'hub.upcomingSummary':null,'assignments.mine':'worship','program.query':'worship','replacement.request':'worship','availability.add':'worship','songs.history':'worship',
  'announcements.count':'publications','announcements.list':'publications','announcements.query':'publications','events.query':'events','events.myRsvp':'events','tasks.mine':'followups','tasks.complete':'followups','prayer.public':'prayer',
  'children.pickupCode':'children','children.status':'children','children.pickupRequest':'children',
  'admin.programStatus':'worship','admin.pendingSongs':'worship','admin.memberSearch':null,'admin.bulletinUpload':'publications','admin.announcementCreate':'publications','admin.eventCreate':'events','admin.taskCreate':'followups','admin.tasks.query':'followups','admin.modules.query':null
};
const byId=new Map(intentCatalog.map(x=>[x.id,x]));
function local(req,es,en){return req.locale==='en'?en:es;}
function intentLabel(id,locale='es'){
  const labels={
    'hub.upcomingSummary':['ver el resumen de esta semana','see this week’s summary'],'assignments.mine':['tus asignaciones','your assignments'],'program.query':['consultar el programa','query the worship program'],'replacement.request':['solicitar un reemplazo','request a replacement'],
    'availability.add':['registrar una ausencia','add unavailability'],'songs.history':['ver tu historial de cantos','view your song history'],
    'announcements.count':['contar anuncios','count announcements'],'announcements.list':['listar anuncios','list announcements'],'announcements.query':['preguntar por anuncios','ask about announcements'],'events.query':['consultar eventos','check events'],'events.myRsvp':['consultar tus RSVP','check your RSVPs'],'tasks.mine':['ver tus tareas','view your tasks'],'tasks.complete':['completar una tarea','complete a task'],
    'prayer.public':['ver peticiones públicas','view public prayer requests'],'children.pickupCode':['recuperar tu código de recogida','retrieve your pickup code'],
    'children.status':['consultar Cuidado de Niños','check Children Care'],'children.pickupRequest':['solicitar recogida','request pickup'],
    'admin.programStatus':['consultar el estado del programa','check program status'],'admin.pendingSongs':['ver cantos pendientes','check pending songs'],
    'admin.memberSearch':['buscar un miembro','search for a member'],'admin.bulletinUpload':['subir un boletín','upload a bulletin'],'admin.announcementCreate':['crear un anuncio','create an announcement'],'admin.eventCreate':['crear un evento','create an event'],'admin.taskCreate':['asignar una tarea','assign a task'],'admin.tasks.query':['consultar tareas administrativas','check administrative tasks'],'admin.modules.query':['consultar módulos','check modules']
  };
  const pair=labels[id]||[id,id];return pair[locale==='en'?1:0];
}
async function logUnknown(req,normalized,highlights){
  const id=`unknown_${crypto.randomUUID().replace(/-/g,'').slice(0,16)}`,text=normalized.normalized.slice(0,600),sensitive=/\b(codigo|code|password|contrasena|oracion|prayer|peticion|hijo|hija|child|pickup|telefono|phone|email)\b/.test(text),safeText=sensitive?'':text.replace(/\b\d{3,}\b/g,'[number]');
  await putDoc(tableNames.chatUnknowns,req.churchId,id,{id,memberId:req.identity?.member?.id||'',normalizedText:safeText,messageHash:crypto.createHash('sha256').update(text).digest('hex'),sensitiveRedacted:sensitive,highlights:highlights.map(x=>x.concept),createdAt:nowIso(),locale:req.locale||'es'},{memberId:req.identity?.member?.id||'',createdAt:nowIso()});
}
export async function processChat(req,{message='',attachment=null,action='',screenContext={}}={}){
  const state=await getChatState(req.churchId,req.identity);state.context={...(state.context||{}),screenContext:screenContext||{}};
  const normalized=normalizeInput(message||'');
  let resolution={id:state.lastIntent||'unknown',confidence:1,ambiguous:false,item:byId.get(state.lastIntent)};
  if(!action && !state.pending){resolution=resolveIntent(normalized,{isAdmin:isAdmin(req.identity),lastIntent:state.lastIntent});}
  const selectedId=state.pending?state.lastIntent:resolution.id;
  const item=byId.get(selectedId);
  if(!state.pending&&!action&&item?.readOnly===false&&/^(no quiero|no necesito|no publiques|no subas|do not|dont|don t|i do not want|i dont want)/.test(normalized.normalized)){return {reply:local(req,'Entendido. No hice ningún cambio.','Understood. I did not make any changes.'),intent:selectedId,cancelled:true};}
  if(item&&!authorize(req.identity,item.capability)){
    const out={reply:local(req,'Entendí la solicitud, pero esa acción requiere permisos que tu cuenta no tiene.','I understood the request, but that action requires permissions your account does not have.'),intent:selectedId,confidence:resolution.confidence,denied:true};
    await saveChatState(req.churchId,state);return out;
  }
  const modules=await moduleState(req.churchId),required=domainModule[selectedId];
  if(required&&modules[required]!==true){const out={reply:local(req,'Esa función está desactivada actualmente en Church Hub.','That feature is currently disabled in Church Hub.'),intent:selectedId,disabledModule:required};await saveChatState(req.churchId,state);return out;}
  if(!action&&!state.pending&&(selectedId==='unknown'||resolution.ambiguous)){
    const highlights=knownHighlights(normalized);
    const top=resolution.id!=='unknown'&&resolution.score>=35?resolution.id:null,second=resolution.second?.id&&resolution.second.score>=25?resolution.second.id:null;
    const actions=[];if(top)actions.push({id:`clarify:${top}`,kind:'reply',labelEs:`Sí: ${intentLabel(top,'es')}`,labelEn:`Yes: ${intentLabel(top,'en')}`});if(second&&second!==top)actions.push({id:`clarify:${second}`,kind:'reply',labelEs:intentLabel(second,'es'),labelEn:intentLabel(second,'en')});
    if(!byId.get(selectedId)?.sensitive) await logUnknown(req,normalized,highlights).catch(()=>{});
    const recognized=highlights.map(h=>h.text).join(', ');
    const reply=top?local(req,`Reconocí${recognized?` “${recognized}”`:''}. ¿Te refieres a ${intentLabel(top,'es')}?`,`I recognized${recognized?` “${recognized}”`:''}. Do you mean ${intentLabel(top,'en')}?`):local(req,`No estoy completamente seguro de lo que quieres hacer.${recognized?` Reconocí: ${recognized}.`:''} Dímelo de otra manera o usa una de las opciones sugeridas.`,`I am not completely sure what you want to do.${recognized?` I recognized: ${recognized}.`:''} Please say it another way or use one of the suggested options.`);
    state.context.lastHighlights=highlights;await saveChatState(req.churchId,state);return {reply,intent:'clarification',confidence:resolution.confidence,highlights,actions};
  }
  let intent=selectedId;
  if(action?.startsWith('clarify:')) intent=action.slice(8);
  const chosen=byId.get(intent);if(chosen&&!authorize(req.identity,chosen.capability)){return {reply:local(req,'Esa acción requiere permisos adicionales.','That action requires additional permissions.'),intent,denied:true};}
  const result=await executeIntent(req,{intent,message,attachment,state,action:action?.startsWith('clarify:')?'':action});
  if(!result){const highlights=knownHighlights(normalized);await logUnknown(req,normalized,highlights).catch(()=>{});return {reply:local(req,'No pude completar esa solicitud. Intenta decirlo de otra manera.','I could not complete that request. Try saying it another way.'),intent:'unknown',highlights};}
  state.lastIntent=intent;await saveChatState(req.churchId,state);
  return {...result,reply:req.locale==='en'?(result.replyEn||result.replyEs):(result.replyEs||result.replyEn),intent,confidence:resolution.confidence};
}
