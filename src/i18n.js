const ES_ERRORS = new Map([
  ['Authentication required','Se requiere iniciar sesión'],
  ['Access denied','Acceso denegado'],
  ['Admin access required','Se requiere acceso de administrador'],
  ['Church Administrator access required','Se requiere acceso de Administrador de la Iglesia'],
  ['Church Administrator is already configured.','El Administrador de la Iglesia ya está configurado.'],
  ['Current password is incorrect.','La contraseña actual es incorrecta.'],
  ['File not found','No se encontró el archivo'],
  ['Invalid bootstrap code.','El código de configuración no es válido.'],
  ['Invalid username or password.','El usuario o la contraseña no son válidos.'],
  ['Logo must be 3 MB or smaller','El logo debe ser de 3 MB o menos'],
  ['Logo must be PNG, JPG, or WEBP','El logo debe ser PNG, JPG o WEBP'],
  ['Member not found','No se encontró el miembro'],
  ['Member profile not found','No se encontró el perfil del miembro'],
  ['Name is required.','El nombre es obligatorio.'],
  ['Name required','El nombre es obligatorio'],
  ['New password must be at least 10 characters.','La nueva contraseña debe tener al menos 10 caracteres.'],
  ['One or more selected songs are invalid or inactive','Uno o más cantos seleccionados no son válidos o están inactivos'],
  ['Only scheduled assignments can be updated','Solo se pueden actualizar asignaciones programadas'],
  ['Only scheduled assignments can be replaced','Solo se pueden reemplazar asignaciones programadas'],
  ['Only the Church Administrator can change the Church Administrator account.','Solo el Administrador de la Iglesia puede cambiar la cuenta del Administrador de la Iglesia.'],
  ['Password must be at least 10 characters.','La contraseña debe tener al menos 10 caracteres.'],
  ['Petition text is required.','El texto de la petición es obligatorio.'],
  ['Selected member is not active','El miembro seleccionado no está activo'],
  ['Selected member is not eligible for this ministry/service/date.','El miembro seleccionado no es elegible para este ministerio, servicio o fecha.'],
  ['Service not found','No se encontró el servicio'],
  ['Song not found','No se encontró el canto'],
  ['Song title is required.','El título del canto es obligatorio.'],
  ['Songs can only be selected for a Cantos assignment','Los cantos solo se pueden seleccionar para una asignación de Cantos'],
  ['Template not found','No se encontró la plantilla'],
  ['Temporary password must be at least 10 characters.','La contraseña temporal debe tener al menos 10 caracteres.'],
  ['This assignment does not belong to this member','Esta asignación no pertenece a este miembro'],
  ['Transfer Church Administrator ownership before removing this access.','Transfiere primero la propiedad de Administrador de la Iglesia antes de retirar este acceso.'],
  ['Username required','El usuario es obligatorio'],
  ['memberId is required','Se requiere memberId'],
  ['Assignment not found','No se encontró la asignación'],
  ['Valid from/to dates are required','Se requieren fechas válidas de inicio y fin']
]);

export function requestLocale(req){
  const explicit=String(req.headers['x-locale']||'').toLowerCase();
  if(explicit.startsWith('en')) return 'en';
  if(explicit.startsWith('es')) return 'es';
  const accept=String(req.headers['accept-language']||'').toLowerCase();
  return accept.startsWith('en')?'en':'es';
}
export function localizeError(message,locale){
  if(locale!=='es') return message;
  return ES_ERRORS.get(String(message)) || message;
}
export function localizationMiddleware(req,res,next){
  req.locale=requestLocale(req);
  const originalJson=res.json.bind(res);
  res.json=(payload)=>{
    if(payload && typeof payload==='object' && typeof payload.error==='string') payload={...payload,error:localizeError(payload.error,req.locale)};
    return originalJson(payload);
  };
  next();
}
