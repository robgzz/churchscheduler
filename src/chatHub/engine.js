import crypto from 'node:crypto';
import { tableNames } from '../config.js';
import { putDoc, nowIso } from '../storage/repository.js';
import { moduleState } from '../modules/registry.js';
import { intentCatalog } from './catalog.js';
import { normalizeInput } from './normalize.js';
import { resolveIntent, knownHighlights } from './resolver.js';
import { compileDeterministic } from '../dce/compiler.js';
import { churchHubDomainPack } from './domainPack.js';
import { capabilityForIntent } from './capabilityRegistry.js';
import { planFrame } from '../dce/queryPlanner.js';
import { authorize, isAdmin, isOwner } from './policy.js';
import { getChatState, saveChatState } from './session.js';
import { executeIntent } from './handlers.js';

// Module and risk metadata live in capabilityRegistry.js; execution remains service-driven.

const byId=new Map(intentCatalog.map(x=>[x.id,x]));
function local(req,es,en){return req.locale==='en'?en:es;}
function intentLabel(id,locale='es'){
  const labels={
    'navigation.open':['abrir una sección','open a section'],'hub.upcomingSummary':['ver el resumen de esta semana','see this week’s summary'],'services.query':['consultar horarios de servicios','check service times'],'profile.mine':['consultar tu perfil','view your profile'],'notifications.mine':['ver tus notificaciones','view your notifications'],'assignments.mine':['tus asignaciones','your assignments'],'program.query':['consultar el programa','query the worship program'],'program.participation':['consultar participación de un miembro','check member participation'],'replacement.request':['solicitar un reemplazo','request a replacement'],
    'availability.add':['registrar una ausencia','add unavailability'],'songs.search':['buscar un canto','search songs'],'songs.history':['ver tu historial de cantos','view your song history'],
    'bulletins.latest':['ver el último boletín','view the latest bulletin'],'announcements.count':['contar anuncios','count announcements'],'announcements.list':['listar anuncios','list announcements'],'announcements.query':['preguntar por anuncios','ask about announcements'],'events.query':['consultar eventos','check events'],'events.myRsvp':['consultar tus RSVP','check your RSVPs'],'events.register':['registrarte a un evento','register for an event'],'events.cancelRsvp':['cancelar tu RSVP','cancel your RSVP'],'events.dismiss':['quitar un evento de tu pantalla','remove an event from your screen'],'tasks.mine':['ver tus tareas','view your tasks'],'tasks.complete':['completar una tarea','complete a task'],'tasks.cancel':['cancelar una tarea','cancel a task'],'tasks.dismiss':['quitar una tarea de tu pantalla','remove a task from your screen'],
    'prayer.list':['ver peticiones públicas','view public prayer requests'],'prayer.mine':['ver tus peticiones','view your prayer requests'],'prayer.create':['crear una petición','create a prayer request'],'prayer.delete':['eliminar tu petición','delete your prayer request'],'prayer.deleteExpired':['eliminar tu petición','delete your prayer request'],'children.pickupCode':['recuperar tu código de recogida','retrieve your pickup code'],'children.parentVerification':['generar un código temporal de verificación','generate a one-time parent verification code'],
    'children.status':['consultar Cuidado de Niños','check Children Care'],'children.workerStatus':['consultar tu área de cuidado','check your caregiver area'],'children.pickupRequest':['solicitar recogida','request pickup'],
    'admin.console':['abrir administración','open administration'],'admin.programStatus':['consultar el estado del programa','check program status'],'admin.scheduleGenerate':['generar el programa','generate the schedule'],'admin.pendingSongs':['ver cantos pendientes','check pending songs'],
    'admin.memberSearch':['buscar miembros','search members'],'admin.memberCreate':['crear un miembro','create a member'],'admin.memberEligibilityQuery':['consultar ministerios de un miembro','check a member’s ministries'],'admin.memberEligibilityUpdate':['cambiar ministerios de un miembro','change a member’s ministries'],'admin.visitors.query':['consultar visitantes','view visitors'],'admin.eventRsvpList':['ver RSVP de un evento','view event RSVPs'],'admin.bulletinUpload':['subir un boletín','upload a bulletin'],'admin.announcementCreate':['crear un anuncio','create an announcement'],'admin.eventCreate':['crear un evento','create an event'],'admin.taskCreate':['asignar una tarea','assign a task'],'admin.tasks.query':['consultar tareas administrativas','check administrative tasks'],'admin.prayer.list':['ver todas las peticiones','view all prayer requests'],'admin.childrenStatus':['consultar Cuidado de Niños activo','check active Children Care'],'admin.reports.query':['consultar reportes','check reports'],'admin.communications.query':['consultar comunicaciones','check communications'],'admin.audit.query':['consultar auditoría','check audit history'],'admin.modules.query':['consultar módulos','check modules'],'admin.moduleToggle':['activar o desactivar un módulo','enable or disable a module']
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
  let frame=state.context?.lastFrame||null;
  if(!action && !state.pending){
    const actor={isAdmin:isAdmin(req.identity),isOwner:isOwner(req.identity),memberId:req.identity?.member?.id||''};
    frame=compileDeterministic({normalized,domainPack:churchHubDomainPack,context:state.context||{},actor});
    const legacy=resolveIntent(normalized,{isAdmin:actor.isAdmin,lastIntent:state.lastIntent});
    // DCE owns the turn when it has a coherent frame. The legacy resolver remains a
    // compatibility fallback while old phrase packs are retired gradually.
    if(frame.intent!=='unknown'&&frame.confidence>=0.72){
      resolution={id:frame.intent,score:Math.round(frame.confidence*120),confidence:frame.confidence,ambiguous:frame.ambiguities.length>0,item:byId.get(frame.intent),frame,second:legacy.second};
    }else resolution={...legacy,frame};
  }
  const selectedId=state.pending?state.lastIntent:resolution.id;
  const item=byId.get(selectedId);
  if(!state.pending&&!action&&item?.readOnly===false&&/^(no quiero|no necesito|no publiques|no subas|do not|dont|don t|i do not want|i dont want)/.test(normalized.normalized)){return {reply:local(req,'Entendido. No hice ningún cambio.','Understood. I did not make any changes.'),intent:selectedId,cancelled:true};}
  if(item&&!authorize(req.identity,item.capability)){
    const out={reply:local(req,'Entendí la solicitud, pero esa acción requiere permisos que tu cuenta no tiene.','I understood the request, but that action requires permissions your account does not have.'),intent:selectedId,confidence:resolution.confidence,denied:true};
    await saveChatState(req.churchId,state);return out;
  }
  const modules=await moduleState(req.churchId),required=capabilityForIntent(selectedId).module;
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
  if(frame&&frame.intent!=='unknown')state.context.lastFrame=frame;
  const result=await executeIntent(req,{intent,message,attachment,state,action:action?.startsWith('clarify:')?'':action,frame});
  if(!result){const highlights=knownHighlights(normalized);await logUnknown(req,normalized,highlights).catch(()=>{});return {reply:local(req,'No pude completar esa solicitud. Intenta decirlo de otra manera.','I could not complete that request. Try saying it another way.'),intent:'unknown',highlights};}
  state.lastIntent=intent;
  if(frame&&frame.intent!=='unknown')state.context.lastFrame=frame;
  if(result?.data)state.context.lastResultSummary={intent,at:nowIso(),keys:Object.keys(result.data).slice(0,12)};
  await saveChatState(req.churchId,state);
  return {...result,reply:req.locale==='en'?(result.replyEn||result.replyEs):(result.replyEs||result.replyEn),intent,confidence:resolution.confidence,understanding:frame?{speechAct:frame.speechAct,operation:frame.operation,domain:frame.domain,resource:frame.resource,filters:frame.filters,time:frame.time,projection:frame.projection,plan:planFrame(frame)}:undefined};
}
