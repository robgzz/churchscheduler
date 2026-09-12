const fillers=new Set(['oye','mira','pues','este','eh','bueno','a','ver','porfavor','por','favor','please','hey','um','uh','mmm']);
const lexicon=[
'para','del','de','un','una','unos','unas','al','con','sin','le','lo','los','las','que','quien','quienes','cuando','donde','como','cual','cuales','cuanto','cuantos','cuantas','hay','tengo','tenemos','estoy','puedo','puedes','puede','esta','estan','es','son','abre','abrir','llevame','asignacion','asignaciones','servir','sirvo','toca','ministerio','domingo','miercoles','semana','proxima','siguiente','reemplazo','reemplazar','reemplace','cubrir','cubra','ausencia','disponible','disponibilidad','cantos','canciones','cantar','canta','cantando','cantor','cantores','boletin','anuncio','anuncios','noticias','confraternidad','evento','eventos','oracion','peticion','peticiones','hijo','hija','nino','nina','codigo','recoger','recogida','direccion','hora','publicar','sube','subir','programa','listo','miembro','miembros','cuenta','cuentas','buscar','predicar','predica','predicador','sermon','meditacion','vigilancia','seguridad','bienvenida','escritura','comunion','ofrenda','clase','maestro','maestra','profesor','profesora','participado','participo','participacion','tarea','tareas','pendiente','completar','terminada','registrado','registro','registrame','confirmacion','rsvp','crear','agregar','modulo','modulos','activo','lista','eliminar','elimina','borrar','borra','oculta','ocultar','privada','publica','verificacion','verificar','temporal','genera','generar','programador','acepto','asistir','asistencia','cancela','perfil','correo','telefono','preferencias','notificacion','notificaciones','aviso','avisos','visitante','visitantes','solicitud','chat','activa','activar','desactiva','desactivar','habilita','habilitar','todas','todos','actual','estado','quita','quitar','actuales','mostrar','muestrame','quieres','quiero','servicio','servicios','reportes','reporte','auditoria','comunicaciones','cuidador','salon','reunion','enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','setiembre','octubre','noviembre','diciembre',
'what','who','when','where','how','which','show','today','my','private','current','assigned','serve','sunday','wednesday','week','next','replacement','cover','songs','sing','singing','singer','singers','teacher','teaching','participated','participation','bulletin','announcement','announcements','fellowship','event','events','prayer','child','children','pickup','code','time','publish','upload','program','member','members','account','search','preach','preaching','sermon','meditation','security','welcome','scripture','communion','class','task','tasks','pending','complete','registered','register','registration','rsvp','create','add','module','modules','enabled','many','list','delete','remove','hide','dismiss','verification','temporary','generate','scheduler','attend','cancel','profile','notifications','service','services','reports','report','audit','communications','caregiver','roster','open','january','february','march','april','may','june','july','august','september','october','november','december'
];
export function fold(v=''){return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ\s:/.-]/g,' ').replace(/\s+/g,' ').trim();}
export function levenshtein(a,b){a=String(a);b=String(b);const d=Array(b.length+1).fill(0).map((_,i)=>i);for(let i=1;i<=a.length;i++){let prev=d[0];d[0]=i;for(let j=1;j<=b.length;j++){const old=d[j];d[j]=Math.min(d[j]+1,d[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old;}}return d[b.length];}
const knownTypos=new Map(Object.entries({
  'confrqternidad':'confraternidad','confraterniad':'confraternidad','confraternida':'confraternidad',
  'reemplqzo':'reemplazo','reemplqzar':'reemplazar','reemplqze':'reemplace','reemplqzqdo':'reemplazado',
  'domngo':'domingo','miercoles':'miercoles','miescoles':'miercoles','asignacione':'asignaciones',
  'peticioness':'peticiones','anunicos':'anuncios','boeltin':'boletin','miemrbo':'miembro','miemrbos':'miembros',
  'wednsday':'wednesday','annoucement':'announcement','annoucements':'announcements','assingment':'assignment','assignement':'assignment'
}));
const protectedTokens=new Set(['para','cantar','cuantas','cuantos','cuanto','cuenta','cuentas','quien','quienes','que','cuando','donde','como','hay','tengo','evento','eventos','anuncio','anuncios','peticion','peticiones','tarea','tareas','clase','domingo','miercoles','today','show','current','account','sing','count','enable','disable','create','delete','remove','upload','publish','generate','register','cancel','complete','open','add','assign','change','request','hide','search','find']);
function correctToken(token){
  if(knownTypos.has(token))return knownTypos.get(token);
  if(token.length<6||/\d/.test(token)||lexicon.includes(token)||protectedTokens.has(token))return token;
  let best=token,dist=99,runner=99;
  for(const word of lexicon){
    if(word.length<6||Math.abs(word.length-token.length)>1)continue;
    if(word[0]!==token[0]||word.slice(0,2)!==token.slice(0,2))continue;
    const d=levenshtein(token,word);
    if(d<dist){runner=dist;best=word;dist=d;}else if(d<runner)runner=d;
  }
  // Fuzzy correction is intentionally conservative: one edit only and a clear winner.
  return dist===1&&runner>1?best:token;
}
export function normalizeInput(raw=''){
  const original=String(raw||'').trim(),folded=fold(original),rawTokens=folded.split(' ').filter(Boolean),filteredRaw=rawTokens.filter(x=>!fillers.has(x)),corrected=filteredRaw.map(correctToken),tokens=corrected,normalized=tokens.join(' ');
  const isQuestion=/\?$/.test(original)||/^(que|quien|quienes|cuando|donde|como|cual|cuales|por que|cuanto|cuantos|cuantas|hay|tengo|tenemos|puedo|puedes|puede|esta|estan|es|son|who|what|when|where|why|how|which|do|does|did|is|are|am|can|could|would|will|have|has)\b/.test(normalized)||/\b(quien|cuando|donde|cuantos|cuantas|who|when|where|how many)\b/.test(normalized);
  const isRequest=/\b(abre|abrir|llevame|ve a|crea|crear|publica|publicar|sube|subir|carga|agrega|agregar|asigna|asignar|cambia|cambiar|reemplaza|reemplazar|marca|marcar|solicita|solicitar|quiero|necesito|elimina|eliminar|borra|borrar|oculta|ocultar|genera|generar|registrame|registra|confirma|cancela|create|publish|upload|add|assign|change|replace|mark|request|delete|remove|hide|dismiss|generate|register|cancel|open|take me|go to|i want|i need|enable|disable|turn on|turn off)\b/.test(normalized);
  return {original,folded,normalized,tokens,rawTokens,corrected,isQuestion,isRequest};
}
export function includesAny(text,values=[]){return values.some(x=>text.includes(fold(x)));}
export function tokenSimilarity(a,b){const aa=fold(a),bb=fold(b);if(!aa||!bb)return 0;if(aa===bb)return 1;const d=levenshtein(aa,bb);return Math.max(0,1-d/Math.max(aa.length,bb.length));}
