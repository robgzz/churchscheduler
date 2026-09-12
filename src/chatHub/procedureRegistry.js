// V5.5 Procedure Registry: canonical explain/guide/execute metadata for Chat Hub.
// Procedures are application capabilities, not language phrases. The DCE uses them
// to explain a feature, guide a user, and offer safe execution from the same source.
const P=(id,opts)=>Object.freeze({id,...opts});
export const procedures=Object.freeze({
  'songs.select':P('songs.select',{
    domain:'songs',capability:'write.self',canExecute:true,
    keywords:['cantos','canto','canciones','song','songs','singing'],
    goalWords:['escoger','elige','elegir','seleccionar','selecciona','choose','select','pick'],
    titleEs:'Escoger cantos',titleEn:'Select songs',
    explainEs:'Los cantos se guardan en tu asignación específica de Cantos. Church Hub evita usar el mismo canto en dos asignaciones de Cantos del mismo servicio.',
    explainEn:'Songs are saved to your specific Songs assignment. Church Hub prevents the same song from being used in two Songs assignments in the same service.',
    stepsEs:['Abre tu programa o usa Chat Hub.','Selecciona tu asignación de Cantos.','Busca los cantos por número o nombre.','Revisa la selección y guárdala.'],
    stepsEn:['Open your program or use Chat Hub.','Select your Songs assignment.','Find songs by number or title.','Review the selection and save it.'],
    offerEs:'También puedo hacerlo aquí. Dime los números o nombres de los cantos que quieres. Puedo mostrarte tu historial de cantos, incluso filtrado por domingo o miércoles.',
    offerEn:'I can also do it here. Tell me the song numbers or titles you want. I can show your song history, including Sunday- or Wednesday-only history.',
    startIntent:'songs.select'
  }),
  'program_admin.change':P('program_admin.change',{
    domain:'worship',capability:'admin',canExecute:true,
    keywords:['administrador responsable','admin responsable','program admin','responsible admin','administrador del programa'],
    goalWords:['poner','cambiar','marcar','asignar','set','change','assign','make'],
    titleEs:'Administrador responsable',titleEn:'Responsible program administrator',
    explainEs:'El administrador responsable recibe las alertas operativas del programa, como posiciones pendientes, reemplazos y selecciones de Cantos que faltan.',
    explainEn:'The responsible program administrator receives operational alerts such as open positions, replacements, and missing song selections.',
    stepsEs:['Abre Administración.','Entra a la configuración del programa.','Selecciona Administrador responsable.','Elige un administrador activo y guarda.'],
    stepsEn:['Open Administration.','Open program settings.','Choose Responsible administrator.','Select an active administrator and save.'],
    offerEs:'También puedo cambiarlo por ti. Dime qué administrador quieres poner como responsable y te pediré confirmación antes de guardar.',
    offerEn:'I can also change it for you. Tell me which administrator should be responsible and I will ask for confirmation before saving.',
    startIntent:'admin.programAdminSet'
  }),
  'member.eligibility.update':P('member.eligibility.update',{
    domain:'members',capability:'admin',canExecute:true,
    keywords:['ministerios','ministerio','ministry','ministries','elegibilidad','eligibility'],
    goalWords:['cambiar','modificar','agregar','quitar','change','update','add','remove'],
    titleEs:'Cambiar ministerios de un miembro',titleEn:'Change member ministries',
    explainEs:'La elegibilidad se controla por servicio y por ministerio. Un miembro puede servir en Cantos en un servicio y no en otro.',
    explainEn:'Eligibility is controlled by service and ministry. A member can serve in Songs in one service but not another.',
    stepsEs:['Abre Administración → Personas.','Abre el miembro.','Expande el ministerio.','Marca o desmarca los servicios permitidos y guarda.'],
    stepsEn:['Open Administration → People.','Open the member.','Expand the ministry.','Check or uncheck allowed services and save.'],
    offerEs:'También puedo cambiarlo aquí. Dime el miembro, ministerio, servicio y si quieres habilitarlo o quitarlo.',
    offerEn:'I can also change it here. Tell me the member, ministry, service, and whether to enable or remove it.',
    startIntent:'admin.memberEligibilityUpdate'
  }),
  'availability.add':P('availability.add',{
    domain:'worship',capability:'write.self',canExecute:true,keywords:['ausencia','disponibilidad','unavailable','away'],goalWords:['registrar','poner','add','set'],
    titleEs:'Ausencia programada',titleEn:'Planned unavailability',
    explainEs:'Una ausencia programada evita nuevas asignaciones durante ese periodo y permite procesar asignaciones afectadas.',explainEn:'Planned unavailability prevents new assignments during that period and can process affected assignments.',
    stepsEs:['Abre Ausencia programada.','Elige las fechas.','Guarda la ausencia.'],stepsEn:['Open Planned unavailability.','Choose the dates.','Save the unavailability.'],
    offerEs:'También puedo registrarla aquí. Dime desde qué fecha hasta qué fecha no estarás disponible.',offerEn:'I can also record it here. Tell me the dates you will be unavailable.',startIntent:'availability.add'
  }),
  'replacement.request':P('replacement.request',{
    domain:'worship',capability:'write.self',canExecute:true,keywords:['reemplazo','replacement','replace','cubrir'],goalWords:['pedir','solicitar','request'],
    titleEs:'Solicitar reemplazo',titleEn:'Request replacement',explainEs:'Un reemplazo conserva el historial de la asignación original y registra quién la cubre.',explainEn:'A replacement preserves the original assignment history and records who covers it.',
    stepsEs:['Abre tu asignación.','Selecciona Solicitar reemplazo.','Confirma la solicitud.'],stepsEn:['Open your assignment.','Choose Request replacement.','Confirm the request.'],offerEs:'También puedo solicitarlo por ti. Dime cuál asignación necesitas reemplazar.',offerEn:'I can also request it for you. Tell me which assignment needs coverage.',startIntent:'replacement.request'
  }),
  'prayer.create':P('prayer.create',{
    domain:'prayer',capability:'write.self',canExecute:true,keywords:['peticion','petición','oracion','prayer request'],goalWords:['crear','hacer','create','add'],
    titleEs:'Crear petición de oración',titleEn:'Create prayer request',explainEs:'Puedes crear una petición pública o privada. Las privadas sólo son visibles para líderes autorizados.',explainEn:'You can create a public or private prayer request. Private requests are visible only to authorized leaders.',
    stepsEs:['Abre Peticiones.','Escribe la petición.','Elige pública o privada.','Guarda.'],stepsEn:['Open Prayer Requests.','Enter the request.','Choose public or private.','Save.'],offerEs:'También puedo crearla aquí. Dime por qué quieres oración y después te preguntaré si será pública o privada.',offerEn:'I can create it here too. Tell me what you want prayer for and I will ask whether it should be public or private.',startIntent:'prayer.create'
  }),
  'bulletin.upload':P('bulletin.upload',{
    domain:'publications',capability:'admin',canExecute:true,keywords:['boletin','bulletin'],goalWords:['subir','upload','publicar','publish'],titleEs:'Subir boletín',titleEn:'Upload bulletin',
    explainEs:'El boletín semanal se publica como el boletín actual y puede incluir un archivo PDF o imagen.',explainEn:'The weekly bulletin is published as the current bulletin and can include a PDF or image.',
    stepsEs:['Abre Administración → Publicaciones.','Selecciona el archivo del boletín.','Agrega un mensaje opcional.','Publica.'],stepsEn:['Open Administration → Publications.','Select the bulletin file.','Add an optional message.','Publish.'],offerEs:'También puedo hacerlo aquí. Usa el botón + para adjuntar el boletín.',offerEn:'I can do it here too. Use the + button to attach the bulletin.',startIntent:'admin.bulletinUpload'
  })
});
export function getProcedure(id){return procedures[id]||null;}
export function listProcedures(){return Object.values(procedures);}
