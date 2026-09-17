import { emptyFrame, SpeechAct, Operation, cloneFrame } from './frame.js';
import { Predicate, ResultType } from './core/semantic.js';

const rx=(parts)=>new RegExp(`(?:^|\\s)(?:${parts.join('|')})(?=\\s|$)`,'i');
const wh=rx(['que','quien','quienes','cuando','donde','como','cual','cuales','cuanto','cuantos','cuantas','what','who','when','where','how','which','why']);
const confirmation=rx(['si','yes','ok','okay','confirmar','confirm','hazlo','do it']);
const cancellation=rx(['cancela','cancelar','cancel','olvidalo','dejalo','never mind','stop']);
const rejection=rx(['no','nope','nah']);
const correction=rx(['no,?','mejor','quise decir','correccion','correction','i mean']);
const openWords=rx(['abre','abrir','ve','llevame','open','go','take me']);
const commandWords=rx(['make','crea','crear','agrega','agregar','asigna','asignar','cambia','cambiar','elimina','eliminar','borra','borrar','sube','subir','publica','publicar','genera','generar','registra','registrame','confirma','solicita','solicitar','marca','oculta','ocultar','activa','activar','desactiva','desactivar','create','add','assign','change','delete','remove','upload','publish','generate','register','request','mark','hide','enable','disable']);

function detectSpeechAct(n,ctx){const t=n.normalized;if(confirmation.test(t)&&t.split(' ').length<=4)return SpeechAct.CONFIRMATION;if(cancellation.test(t)&&t.split(' ').length<=5)return SpeechAct.CANCELLATION;if(rejection.test(t)&&t.split(' ').length<=4)return SpeechAct.REJECTION;if(correction.test(t)&&ctx?.lastFrame)return SpeechAct.CORRECTION;if(/\b(por que|porque|why|que falta|what is missing|whats missing)\b/.test(t))return SpeechAct.WHY;if(/^(como|how)\b/.test(t)||/\b(no se como|no se cómo|how do i|how can i)\b/.test(t))return SpeechAct.HOW_TO;if(/\b(ayudame|necesito ayuda|help me|i need help)\b/.test(t))return SpeechAct.HELP;if(/\b(que es|para que sirve|what is|what does|explica|explain)\b/.test(t))return SpeechAct.EXPLAIN;if(openWords.test(t))return SpeechAct.NAVIGATION;if(n.isQuestion||wh.test(t)||/^(hay|tengo|tenemos|es|esta|estan|do|does|did|is|are|am|have|has|can|could|would|will)\b/.test(t))return SpeechAct.QUERY;if(commandWords.test(t)||n.isRequest)return SpeechAct.COMMAND;if(ctx?.lastFrame&&t.split(' ').length<=7)return SpeechAct.FOLLOW_UP;return SpeechAct.UNKNOWN;}
function detectOperation(t,act){
  if(act===SpeechAct.NAVIGATION)return Operation.OPEN;
  if(act===SpeechAct.WHY)return Operation.STATUS;
  if([SpeechAct.HOW_TO,SpeechAct.HELP,SpeechAct.EXPLAIN].includes(act))return Operation.GET;
  if(/\b(cuantos|cuantas|cantidad|numero|how many|count)\b/.test(t))return Operation.COUNT;
  if(/^(hay|existe|existen|is there|are there)\b/.test(t))return Operation.EXISTS;
  if(/\b(busca|buscar|encuentra|find|search)\b/.test(t))return Operation.SEARCH;
  if(/\b(muestrame|mostrar|lista|listar|show|list)\b/.test(t))return Operation.LIST;
  if(/\b(historial|anteriores|ultima vez|last time|history|previous)\b/.test(t))return Operation.HISTORY;
  if(/\b(estado|status|listo|ready)\b/.test(t))return Operation.STATUS;
  if(/\b(make|cambia|cambiar|modifica|modificar|edita|editar|actualiza|actualizar|change|update|edit)\b/.test(t))return Operation.UPDATE;
  if(/\b(crea|crear|nuevo|nueva|agrega|agregar|create|new|add)\b/.test(t))return Operation.CREATE;
  if(/\b(asigna|asignar|assign)\b/.test(t))return Operation.ASSIGN;
  if(/\b(elimina|eliminar|borra|borrar|quita|quitar|remueve|remover|delete|remove)\b/.test(t))return Operation.DELETE;
  if(/\b(cancela|cancelar|cancel)\b/.test(t))return Operation.CANCEL;
  if(/\b(completa|completar|termine|terminada|done|complete|completed|finished)\b/.test(t))return Operation.COMPLETE;
  if(/\b(oculta|ocultar|quita de mi pantalla|hide|dismiss|remove from my screen)\b/.test(t))return Operation.DISMISS;
  if(/\b(registrame|registrar|rsvp|acepto|asistir|register|attend|sign me up)\b/.test(t))return Operation.REGISTER;
  if(/\b(sube|subir|carga|upload)\b/.test(t))return Operation.UPLOAD;
  if(/\b(publica|publicar|publish)\b/.test(t))return Operation.PUBLISH;
  if(/\b(genera|generar|generate)\b/.test(t))return Operation.GENERATE;
  if(/\b(activa|activar|habilita|enable|turn on)\b/.test(t))return Operation.ENABLE;
  if(/\b(desactiva|desactivar|disable|turn off)\b/.test(t))return Operation.DISABLE;
  if(/\b(solicita|solicitar|quiero|necesito|request|i want|i need)\b/.test(t)&&act===SpeechAct.COMMAND)return Operation.REQUEST;
  if(act===SpeechAct.QUERY)return /\b(cuales|lista|muestrame|mostrar|ver|show|list|what)\b/.test(t)?Operation.LIST:Operation.GET;
  return Operation.UNKNOWN;
}


function semanticize(frame,text){
  const resource=frame.resource||'';
  if(resource==='assignment')frame.predicate=Predicate.ASSIGNED_TO;
  else if(resource==='eligibility')frame.predicate=Predicate.ELIGIBLE_FOR;
  else if(resource==='selection_status'||resource==='my_selection'||frame.domain==='songs')frame.predicate=Predicate.SELECTED_FOR;
  else if(resource==='program'&&frame.operation===Operation.STATUS)frame.predicate=Predicate.READY;
  else if(frame.domain==='events'&&frame.subject?.scope==='self')frame.predicate=Predicate.REGISTERED_FOR;
  else if(frame.domain==='tasks')frame.predicate=Predicate.HAS_TASK;
  else if(frame.domain==='children')frame.predicate=Predicate.PARENT_OF;
  else if(frame.domain==='modules')frame.predicate=Predicate.ENABLED;
  if(frame.subject?.scope==='self')frame.roles.owner={type:'entity.member',ref:'self'};
  if(frame.filters?.role)frame.roles.role={type:'entity.ministry',ref:frame.filters.role};
  frame.scope={...(frame.filters||{}),...(frame.time?{time:frame.time}:{})};
  if(/\b(no|not|sin|without|excepto|except|menos)\b/.test(text))frame.polarity='negative';
  if(frame.speechAct===SpeechAct.WHY)frame.resultType=ResultType.DIAGNOSIS;
  else if([SpeechAct.HOW_TO,SpeechAct.HELP,SpeechAct.EXPLAIN].includes(frame.speechAct))frame.resultType=ResultType.PROCEDURE;
  else if(frame.operation===Operation.COUNT)frame.resultType=ResultType.COUNT;
  else if(frame.operation===Operation.STATUS||frame.operation===Operation.EXISTS)frame.resultType=ResultType.STATUS;
  else if(frame.operation===Operation.LIST||frame.projection?.length)frame.resultType=ResultType.LIST;
  else if([Operation.CREATE,Operation.UPDATE,Operation.ASSIGN,Operation.DELETE,Operation.CANCEL,Operation.COMPLETE,Operation.REGISTER,Operation.UPLOAD,Operation.PUBLISH,Operation.GENERATE,Operation.ENABLE,Operation.DISABLE,Operation.REQUEST].includes(frame.operation))frame.resultType=ResultType.ACTION_PREVIEW;
  else frame.resultType=ResultType.FACT;
  return frame;
}

function componentScore(frame,parts){let total=0,weight=0;for(const [value,w] of parts){weight+=w;total+=(value?1:0)*w;}return weight?total/weight:0;}

export function compileDeterministic({normalized,domainPack,context={},actor={}}){
  const frame=emptyFrame(),text=normalized.normalized;frame.speechAct=detectSpeechAct(normalized,context);frame.operation=detectOperation(text,frame.speechAct);
  const domain=domainPack.detectDomain(text,{normalized,actor,context,frame});if(domain){frame.domain=domain.domain;frame.resource=domain.resource||'';frame.evidence.push(...(domain.evidence||[]));}
  const slots=domainPack.extractSlots(text,{normalized,actor,context,frame})||{};Object.assign(frame.filters,slots.filters||{});Object.assign(frame.entities,slots.entities||{});if(slots.subject)frame.subject=slots.subject;if(slots.time)frame.time=slots.time;if(slots.projection)frame.projection=slots.projection;if(slots.quantifier)frame.quantifier=slots.quantifier;frame.evidence.push(...(slots.evidence||[]));
  const contextualFollowUp=Boolean(context?.lastFrame)&&(!frame.domain)&&(frame.speechAct===SpeechAct.FOLLOW_UP||text.split(' ').length<=7||/\b(proxima|proximo|siguiente|otra|otro|next|previous|anterior|despues|after|before)\b/.test(text));
  if(contextualFollowUp){const prev=cloneFrame(context.lastFrame);for(const k of ['domain','resource'])if(!frame[k])frame[k]=prev[k];if(frame.operation===Operation.UNKNOWN)frame.operation=prev.operation;frame.subject=frame.subject?.scope?frame.subject:prev.subject;frame.filters={...(prev.filters||{}),...(frame.filters||{})};frame.entities={...(prev.entities||{}),...(frame.entities||{})};if(!frame.time)frame.time=prev.time;if(!frame.projection?.length)frame.projection=prev.projection||[];frame.evidence.push('context:follow-up');}
  const mapped=domainPack.resolveFrame(frame,{text,normalized,actor,context})||{};frame.intent=mapped.intent||'unknown';if(mapped.patch){Object.assign(frame,mapped.patch);}
  semanticize(frame,text);
  frame.confidenceByComponent={
    speechAct:frame.speechAct!==SpeechAct.UNKNOWN?1:0,
    operation:frame.operation!==Operation.UNKNOWN?1:0,
    domain:frame.domain?1:0,
    resource:frame.resource?1:(frame.domain?.5:0),
    subject:frame.subject?.scope?1:0,
    time:frame.time?1:0,
    entity:Object.keys(frame.entities||{}).length||Object.keys(frame.filters||{}).length?1:0,
    predicate:frame.predicate?1:0
  };
  const score=componentScore(frame,[[frame.speechAct!==SpeechAct.UNKNOWN,.16],[frame.operation!==Operation.UNKNOWN,.16],[Boolean(frame.domain),.24],[Boolean(frame.resource||frame.domain),.10],[frame.intent!=='unknown',.24],[frame.evidence.length>0,.10]]);
  frame.confidence=Math.max(0,Math.min(1,score+(mapped.boost||0)));if(mapped.ambiguities)frame.ambiguities.push(...mapped.ambiguities);if(mapped.contradictions)frame.contradictions.push(...mapped.contradictions);
  return frame;
}
