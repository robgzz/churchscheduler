import { tableNames } from '../config.js';
import { getDoc, putDoc, nowIso } from '../storage/repository.js';

export const moduleCatalog=Object.freeze([
  {id:'worship',labelEn:'Worship & Scheduling',labelEs:'Adoración y Programación',defaultEnabled:true},
  {id:'publications',labelEn:'Announcements & Bulletins',labelEs:'Anuncios y Boletines',defaultEnabled:true},
  {id:'prayer',labelEn:'Prayer Requests',labelEs:'Peticiones de Oración',defaultEnabled:true},
  {id:'visitors',labelEn:'Visitors',labelEs:'Visitantes',defaultEnabled:true},
  {id:'children',labelEn:"Children's Care",labelEs:'Cuidado de Niños',defaultEnabled:true},
  {id:'reports',labelEn:'Reports',labelEs:'Reportes',defaultEnabled:true},
  {id:'events',labelEn:'Events & RSVP',labelEs:'Eventos y Confirmación',defaultEnabled:false},
  {id:'followups',labelEn:'Follow-up',labelEs:'Seguimiento',defaultEnabled:false}
]);
const known=new Map(moduleCatalog.map(x=>[x.id,x]));

export function normalizedModules(settings={}){
  const configured=settings.modules||{};
  return Object.fromEntries(moduleCatalog.map(m=>[m.id,configured[m.id]!==undefined?configured[m.id]===true:m.defaultEnabled]));
}
export async function moduleState(churchId){const s=await getDoc(tableNames.settings,churchId,'church')||{};return normalizedModules(s);}
export async function updateModules(churchId,input,actorId=''){
  const settings=await getDoc(tableNames.settings,churchId,'church')||{id:'church'};
  const current=normalizedModules(settings),requested=input&&typeof input==='object'?input:{};
  for(const [id,value] of Object.entries(requested))if(known.has(id))current[id]=value===true;
  if(current.children===false){
    const { listDocs }=await import('../storage/repository.js');
    const active=await listDocs(tableNames.childCheckIns,churchId,{filter:`status ne 'picked_up'`,max:1});
    if(active.length)throw Object.assign(new Error('Children Care has active handoffs. Finish pickup before disabling this module.'),{statusCode:409,code:'MODULE_ACTIVE_HANDOFFS'});
  }
  settings.modules=current;settings.modulesUpdatedAt=nowIso();settings.modulesUpdatedBy=actorId;await putDoc(tableNames.settings,churchId,'church',settings);return current;
}
export function requireModule(id){return async(req,res,next)=>{try{const state=await moduleState(req.churchId);if(state[id]!==true)return res.status(404).json({error:'This module is disabled.',code:'MODULE_DISABLED',module:id});next();}catch(e){next(e);}};}
