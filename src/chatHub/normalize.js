const fillers=new Set(['oye','mira','pues','este','esta','eh','bueno','a','ver','porfavor','por','favor','please','hey','um','uh','mmm']);
const lexicon=[
'asignacion','asignaciones','servir','sirvo','toca','ministerio','domingo','miercoles','semana','proxima','siguiente','reemplazo','reemplazar','reemplace','cubrir','cubra','ausencia','disponible','disponibilidad','cantos','canciones','boletin','anuncio','anuncios','confraternidad','evento','eventos','oracion','peticion','peticiones','hijo','hija','nino','nina','codigo','recoger','recogida','direccion','donde','cuando','hora','publicar','subir','programa','listo','miembro','buscar','predicar','predica','predicador','sermon','meditacion','vigilancia','seguridad','bienvenida','escritura','comunion','ofrenda','clase','tarea','tareas','pendiente','completar','terminada','registrado','confirmacion','rsvp','crear','agregar','modulo','modulos','activo','cuantos','cuantas','lista',
'what','assigned','serve','sunday','wednesday','week','next','replacement','cover','songs','bulletin','announcement','fellowship','event','events','prayer','child','pickup','code','where','when','time','publish','upload','program','member','search','preach','preaching','sermon','meditation','security','welcome','scripture','communion','class','task','tasks','pending','complete','registered','rsvp','create','add','module','modules','enabled','how','many','list'
];
export function fold(v=''){return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ\s:/.-]/g,' ').replace(/\s+/g,' ').trim();}
export function levenshtein(a,b){a=String(a);b=String(b);const d=Array(b.length+1).fill(0).map((_,i)=>i);for(let i=1;i<=a.length;i++){let prev=d[0];d[0]=i;for(let j=1;j<=b.length;j++){const old=d[j];d[j]=Math.min(d[j]+1,d[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old;}}return d[b.length];}
function correctToken(token){if(token.length<4||/\d/.test(token)||lexicon.includes(token))return token;let best=token,dist=3;for(const word of lexicon){if(Math.abs(word.length-token.length)>2)continue;const d=levenshtein(token,word);if(d<dist){best=word;dist=d;if(d===1)break;}}return dist<=2?best:token;}
export function normalizeInput(raw=''){
  const original=String(raw||'').trim();
  const folded=fold(original);
  const rawTokens=folded.split(' ').filter(Boolean);
  const filteredRaw=rawTokens.filter(x=>!fillers.has(x));
  const corrected=filteredRaw.map(correctToken);
  const tokens=corrected;
  const normalized=tokens.join(' ');
  const isQuestion=/\?$/.test(original)||/^(que|quien|quienes|cuando|donde|como|cual|cuales|por que|cuanto|cuantos|hay|tengo|tenemos|puedo|puedes|puede|esta|estan|es|son|who|what|when|where|why|how|which|do|does|did|is|are|am|can|could|would|will|have|has)\b/.test(normalized)||/\b(quien|cuando|donde|cuantos|cuantas|who|when|where|how many)\b/.test(normalized);
  const isRequest=/\b(crea|crear|publica|publicar|sube|subir|carga|agrega|agregar|asigna|asignar|cambia|cambiar|reemplaza|reemplazar|marca|marcar|solicita|solicitar|quiero|necesito|create|publish|upload|add|assign|change|replace|mark|request|i want|i need)\b/.test(normalized);
  return {original,folded,normalized,tokens,rawTokens,corrected,isQuestion,isRequest};
}
export function includesAny(text,values=[]){return values.some(x=>text.includes(fold(x)));}
export function tokenSimilarity(a,b){const aa=fold(a),bb=fold(b);if(!aa||!bb)return 0;if(aa===bb)return 1;const d=levenshtein(aa,bb);return Math.max(0,1-d/Math.max(aa.length,bb.length));}
