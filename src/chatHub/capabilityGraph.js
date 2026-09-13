import { churchCapabilities } from './domain/capabilities.js';
const actionLabels={
  songs:['Ver tus cantos','Revisar cantos pendientes','Ver historial','Buscar un canto','Escoger o cambiar cantos'],
  worship:['Ver asignaciones','Consultar programas','Consultar participación','Solicitar reemplazo','Registrar ausencia'],
  members:['Buscar miembros','Crear miembro','Ver elegibilidad','Cambiar ministerios'],
  tasks:['Ver tareas','Completar tareas','Asignar tareas'],events:['Ver eventos','Confirmar asistencia','Administrar RSVP'],
  prayer:['Ver peticiones','Crear petición','Administrar peticiones'],children:['Ver tus niños','Solicitar recogida','Consultar Cuidado de Niños'],
  publications:['Ver boletín','Ver anuncios','Publicar contenido'],modules:['Ver módulos','Activar o desactivar módulos']
};
export function graphFor(domain){const caps=churchCapabilities.list({domain});if(!caps.length)return null;return {read:caps.filter(x=>x.risk==='read'||x.risk==='sensitive-read').map(x=>x.id),write:caps.filter(x=>!['read','sensitive-read'].includes(x.risk)).map(x=>x.id),actionsEs:actionLabels[domain]||caps.slice(0,5).map(x=>x.id),actionsEn:actionLabels[domain]||caps.slice(0,5).map(x=>x.id)};}
export const capabilityGraph=Object.freeze(Object.fromEntries([...new Set(churchCapabilities.list().map(x=>x.domain))].map(d=>[d,graphFor(d)])));
