import { getProcedure, listProcedures } from './procedureRegistry.js';
import { fold } from './normalize.js';
const HOW=/(?:^(?:como|cómo)\b|\b(?:como|cómo)\s+(?:hago|puedo|se hace|se cambia|selecciono|escojo)|\b(?:how do i|how can i|steps|pasos|no se como|no sé cómo)\b)/;
const HELP=/\b(ayudame|ayúdame|help me|necesito ayuda|i need help)\b/;
const EXPLAIN=/\b(que es|qué es|para que sirve|para qué sirve|what is|what does|explica|explain)\b/;
const WHY=/\b(por que|por qué|why|que falta|qué falta|whats missing|what is missing)\b/;
export function assistancePlan(raw,state={},actor={}){
  const text=fold(raw||''); if(!text)return null;
  const active=state?.context?.activeGoal||null;
  const justSongs=/^(canto|cantos|cancion|canciones|song|songs)$/.test(text);
  if(active?.procedureId==='songs.select'&&(justSongs||/^(elige|escoge|selecciona|choose|select)( cantos| songs)?$/.test(text)))return {intent:'songs.select',procedureId:'songs.select',kind:'continue',score:1};
  const wantsSongs=/(canto|cantos|cancion|canciones|song|songs)/.test(text);
  const songSelect=wantsSongs&&/(escog|elegi|elige|seleccion|pon|poner|choose|select|pick|use|usar)/.test(text);
  if(songSelect&&!HOW.test(text)&&!HELP.test(text))return {intent:'songs.select',procedureId:'songs.select',kind:'execute',score:.98};
  const programAdmin=/(admin(?:istrador)? responsable|administrador del programa|program admin|responsible admin)/.test(text);
  if(programAdmin&&!HOW.test(text)&&!HELP.test(text)&&!EXPLAIN.test(text)&&/(pon|poner|cambia|cambiar|marca|marcar|asigna|asignar|set|change|make|assign)/.test(text))return {intent:'admin.programAdminSet',procedureId:'program_admin.change',kind:'execute',score:.99};
  if(HOW.test(text)||HELP.test(text)||EXPLAIN.test(text)){
    let best=null;
    for(const p of listProcedures()){
      const score=p.keywords.reduce((n,k)=>n+(text.includes(fold(k))?4:0),0)+p.goalWords.reduce((n,k)=>n+(text.includes(fold(k))?2:0),0);
      if(score&&(!best||score>best.score))best={procedure:p,score};
    }
    if(best)return {intent:'procedure.help',procedureId:best.procedure.id,kind:EXPLAIN.test(text)?'explain':HOW.test(text)?'how_to':'help',score:Math.min(1,.75+best.score/20)};
  }
  if(justSongs)return {intent:'procedure.help',procedureId:'songs.select',kind:'resource',score:.9};
  if(WHY.test(text))return {intent:'diagnostic.why',procedureId:'',kind:'why',score:.85};
  return null;
}
export function assistanceActions(procedureId){const p=getProcedure(procedureId);if(!p)return[];const a=[];if(p.canExecute&&p.startIntent)a.push({id:`procedure:start:${procedureId}`,kind:'reply',labelEs:'Hazlo por mí',labelEn:'Do it for me'});if(procedureId==='songs.select')a.push({id:'procedure:songs.history',kind:'reply',labelEs:'Ver mi historial de cantos',labelEn:'Show my song history'});return a;}
