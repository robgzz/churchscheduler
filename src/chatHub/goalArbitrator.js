import { fold } from './normalize.js';

const YES=/^(si|yes|ok|okay|confirmar|confirm|hazlo|do it|adelante|go ahead)$/;
const NO=/^(no|nope|nah|cancel|cancela|cancelar|dejalo|olvidalo|never mind|stop)$/;
const DOMAIN_WORDS={
  tasks:/\b(tarea|tareas|task|tasks|seguimiento|follow up)\b/,
  songs:/\b(canto|cantos|cancion|canciones|song|songs)\b/,
  children:/\b(hijo|hija|nino|nina|ninos|children|child|kid|pickup|recogida)\b/,
  worship:/\b(programa|asignacion|asignaciones|predic|sermon|meditacion|clase|comunion|cena|ofrenda|oracion|worship|serve|servir)\b/,
  prayer:/\b(peticion|peticiones|prayer request|prayer requests)\b/,
  events:/\b(evento|eventos|event|events|rsvp)\b/,
  publications:/\b(anuncio|anuncios|boletin|bulletin|announcement|confraternidad|fellowship)\b/,
  members:/\b(miembro|miembros|member|members|ministerio|ministerios|ministry|ministries)\b/,
  reports:/\b(reporte|reportes|report|reports)\b/,
  modules:/\b(modulo|modulos|module|modules)\b/
};
const QUESTION=/^(que|quien|quienes|cuando|donde|como|cual|cuales|cuanto|cuantos|cuantas|por que|dame|muestrame|mostrar|lista|listar|why|what|who|when|where|how|which|show|list|give me|is|are|do|does|did|have|has|can)\b/;
const STRONG_COMMAND=/\b(crea|crear|agrega|agregar|incluye|incluir|activa|activar|habilita|habilitar|cambia|cambiar|asigna|asignar|quita|quitar|elimina|eliminar|sube|subir|publica|publicar|genera|generar|dame|muestrame|mostrar|lista|listar|create|add|include|enable|change|assign|remove|delete|upload|publish|generate|show|list|give)\b/;

function detectDomain(text){for(const [domain,re] of Object.entries(DOMAIN_WORDS))if(re.test(text))return domain;return '';}
function pendingDomain(state){const p=state?.pending?.type||'',g=state?.context?.activeGoal?.procedureId||'';
  if(p.startsWith('task.')||g.startsWith('task'))return 'tasks';
  if(p.startsWith('songs.')||g==='songs.select')return 'songs';
  if(p.startsWith('children.'))return 'children';
  if(p.startsWith('prayer.')||g==='prayer.create')return 'prayer';
  if(p.startsWith('event.')||p.startsWith('rsvp.'))return 'events';
  if(p.startsWith('bulletin.')||p.startsWith('announcement.'))return 'publications';
  if(p.startsWith('member.')||g==='member.eligibility.update')return 'members';
  if(p.startsWith('program_admin')||g==='program_admin.change'||p.startsWith('replacement.')||p.startsWith('availability.'))return 'worship';
  return '';
}
function optionMatch(state,text){const options=state?.pending?.options||state?.context?.activeGoal?.options||[];if(!options.length)return false;return options.some(o=>{const label=fold(o.name||o.labelEs||o.labelEn||o.memberName||'');return label&&(text===label||text.includes(label));});}
function looksLikeExpectedSlot(state,text){
  if(optionMatch(state,text))return true;
  const p=state?.pending?.type||'',g=state?.context?.activeGoal||{};
  if((p==='program_admin.confirm'||p.endsWith('.confirm'))&&(YES.test(text)||NO.test(text)))return true;
  if(g.expectedSlot==='administrator'&&!detectDomain(text)&&text.split(' ').length<=5&&!QUESTION.test(text)&&!STRONG_COMMAND.test(text))return true;
  if(g.expectedSlot==='songs'&&(/\b\d{1,4}\b/.test(text)||/^(canto|cantos|song|songs|pon|elige|escoge|selecciona|use)/.test(text)))return true;
  if(g.expectedSlot==='song_assignment'&&(/\b\d{4}-\d{2}-\d{2}\b/.test(text)||/\b(domingo|miercoles|sunday|wednesday)\b/.test(text)))return true;
  return false;
}
export function arbitrateTurn(normalized,state={}){
  const text=fold(normalized?.normalized||normalized||'');const hasPending=Boolean(state?.pending||state?.context?.activeGoal);
  if(/^(volvamos|regresemos|continua|continuemos|resume|go back|continue previous|back to that)\b/.test(text))return {mode:'resume',score:.99};
  if(!hasPending)return {mode:'new_or_followup',score:1,domain:detectDomain(text)};
  if(YES.test(text))return {mode:'confirmation',score:1};
  if(NO.test(text))return {mode:'cancellation',score:1};
  if(looksLikeExpectedSlot(state,text))return {mode:'continue',score:.98};
  const domain=detectDomain(text),prior=pendingDomain(state),explicit=QUESTION.test(text)||STRONG_COMMAND.test(text);
  if(domain&&domain!==prior&&(explicit||text.split(' ').length>=3))return {mode:'new_goal',score:explicit?.99:.93,domain,priorDomain:prior};
  if(domain&&explicit&&domain===prior){
    // Same domain can still be a new goal. Listing, profile, role, status and self queries
    // must not be swallowed by an unfinished edit in that same domain.
    if(/\b(mis|my|tengo|have|cuales|which|quien|who|historial|history|ya estan|already|estado|status|lista|listar|todos|todas|perfil|profile|admin|administrador|administrator|cuantos|how many)\b/.test(text))return {mode:'new_goal',score:.94,domain,priorDomain:prior};
  }
  if(explicit&&QUESTION.test(text))return {mode:'new_goal',score:.86,domain,priorDomain:prior};
  return {mode:'continue',score:.62,domain,priorDomain:prior};
}
export function suspendGoal(state,reason='new_goal'){
  state.context=state.context||{};const suspended=state.context.suspendedGoals||[];
  if(state.pending||state.context.activeGoal)suspended.unshift({pending:state.pending||null,goal:state.context.activeGoal||null,lastIntent:state.lastIntent||'',reason,at:new Date().toISOString()});
  state.context.suspendedGoals=suspended.slice(0,5);state.pending=null;state.context.activeGoal=null;
  return state;
}

export function resumeSuspendedGoal(state){state.context=state.context||{};const list=state.context.suspendedGoals||[];const next=list.shift();if(!next)return false;state.context.suspendedGoals=list;state.pending=next.pending||null;state.context.activeGoal=next.goal||null;state.lastIntent=next.lastIntent||state.lastIntent||'';return true;}
