// Deterministic Chat Hub intent catalog.
// Keep intents narrow: language recognition happens here; authorization and execution remain separate.
const I=(id,capability,readOnly,phrases,concepts=[],extra={})=>({id,capability,readOnly,phrases,concepts,...extra});

export const intentCatalog=Object.freeze([
  I('help','read.self',true,[
    'ayuda','que puedes hacer','como me ayudas','que sabes hacer','que te puedo preguntar','comandos','opciones',
    'help','what can you do','how can you help','what can i ask','commands','options','help me'
  ]),
  I('navigation.open','read.self',true,[
    'abre inicio','abre el programa','abre iglesia','abre noticias','abre eventos','abre mis tareas','abre peticiones','abre mi perfil','abre cuidado de ninos','abre chat hub',
    'llevame al programa','llevame a eventos','llevame a tareas','llevame a peticiones','ve a iglesia','ve a mi perfil',
    'open home','open schedule','open church','open news','open events','open my tasks','open prayer requests','open my profile','open children care','open chat hub',
    'take me to schedule','take me to events','go to church','go to my profile','open mis tareas','show me la iglesia'
  ],['navigation']),
  I('hub.upcomingSummary','read.self',true,[
    'que hay esta semana','que tenemos esta semana','que viene esta semana','resumen de esta semana','que tengo esta semana','que pasa esta semana',
    'what is happening this week','what do we have this week','this week summary','whats going on this week','show me esta semana'
  ],['week']),
  I('services.query','read.members',true,[
    'cuales son los servicios','horarios de servicios','a que hora es la adoracion','a que hora es la clase','cuando hay servicio','cuando es el servicio','servicios habituales',
    'service times','what time is worship','when is bible class','when are services','regular services','church service schedule','what time es worship'
  ],['service']),

  I('assignments.mine','read.self',true,[
    'que me toca','que tengo','mis asignaciones','cuando sirvo','me toca servir','mi proximo servicio','donde sirvo','tengo algo el domingo','tengo algo esta semana','estoy programado','en que sirvo',
    'what am i assigned','when do i serve','am i serving','my assignments','what do i have','what am i doing sunday','am i scheduled','what me toca','when sirvo'
  ],['assignment','self']),
  I('program.query','read.members',true,[
    'quien va a predicar','quien predica','quien tiene cantos','quien dirige cantos','quien sirve este domingo','quien sirve el domingo','programa de este domingo','programa del domingo',
    'quien da la meditacion','quien da el sermon','quien tiene vigilancia','quien da la bienvenida','quien tiene comunion','quien tiene la escritura','quien tiene oracion','quien da la clase','quien cierra','quien abre',
    'who is preaching','who has songs','who is serving','who is on the program','sunday program','who has security','who has communion','who is teaching','who has scripture','who has prayer',
    'quien is preaching','who tiene cantos','show me programa del domingo','who serves este domingo',
    'quien va a dar la clase del domingo','quien va a dar la clase del miercoles','quien le toca cantar el domingo','quien canta el domingo','quien canta este domingo',
    'who teaches sunday class','who teaches wednesday class','who is singing sunday','who sings this sunday'
  ],['programQuery']),
  I('program.participation','read.members',true,[
    'ha participado','participo en septiembre','participacion de','cuando participo','ha servido este mes','sirvio este mes',
    'did participate','has participated','participation history','did serve this month','has served this month',
    'en el mes de septiembre ha participado','did eduardo participate'
  ],['participation']),
  I('replacement.request','write.self',false,[
    'necesito reemplazo','quiero reemplazo','que alguien me cubra','no puedo servir','reemplazame','sacame de mi asignacion','cambiame de mi asignacion','buscame reemplazo',
    'i need a replacement','cover me','i cannot serve','replace me','get someone to cover me','need someone que me cubra'
  ],['replacement']),
  I('availability.add','write.self',false,[
    'no estare disponible','marcar ausencia','agrega ausencia','no voy a estar','no puedo estar','estare fuera','voy a faltar','ponme ausente','no me programes',
    'unavailable','add unavailability','i will be away','i cannot be there','mark me unavailable','no me schedule'
  ],['availability']),

  I('profile.mine','read.self',true,[
    'mi perfil','cual es mi correo','cual es mi telefono','mis datos','mis preferencias','mis ministerios','en que ministerios estoy',
    'my profile','my email','my phone','my settings','my ministries','show my profile','show mi perfil'
  ],['profile','self']),
  I('notifications.mine','read.self',true,[
    'mis notificaciones','tengo notificaciones','notificaciones nuevas','avisos nuevos','cuantas notificaciones tengo',
    'my notifications','unread notifications','do i have notifications','show notifications','show mis notificaciones'
  ],['notification','self']),
  I('songs.search','read.members',true,[
    'busca el canto','buscar canto','busca la cancion','que numero es el canto','encuentra el canto','find song','search song','song number','find el canto','search cantos'
  ],['songs','search']),
  I('songs.history','read.self',true,[
    'mis cantos anteriores','historial de cantos','que cantos he cantado','cuales cantos use','que cante la ultima vez','mis ultimos cantos',
    'songs history','my previous songs','what songs did i use','what did i sing last time','show my cantos history'
  ],['songs','history']),

  I('bulletins.latest','read.members',true,[
    'ultimo boletin','boletin de esta semana','ver boletin','cual es el boletin','boletin del domingo','abre el boletin',
    'latest bulletin','this week bulletin','show bulletin','sunday bulletin','show me el boletin'
  ],['bulletin']),
  I('announcements.count','read.members',true,[
    'cuantos anuncios hay','cuantos anuncios hay hoy','numero de anuncios','cantidad de anuncios','cuantos anuncios esta semana',
    'how many announcements','how many announcements today','announcement count','how many anuncios hay hoy'
  ],['announcement','count']),
  I('announcements.list','read.members',true,[
    'que anuncios hay','cuales anuncios hay','lista de anuncios','anuncios de hoy','anuncios esta semana','muestrame los anuncios','noticias de la iglesia',
    'what announcements are there','list announcements','today announcements','show announcements','church news','show me los anuncios'
  ],['announcement','list']),
  I('announcements.query','read.members',true,[
    'proximo anuncio','que dice el anuncio','proxima confraternidad','hay confraternidad','donde es la confraternidad','donde va a ser la confraternidad','cuando es la confraternidad','a que hora es la confraternidad',
    'next fellowship','is there a fellowship','announcement details','where is the fellowship','when is the fellowship','what time is the fellowship','where is la confraternidad','what time es la reunion'
  ],['announcement']),

  I('events.query','read.members',true,[
    'proximo evento','que eventos hay','cuando es el evento','eventos esta semana','donde es el evento','detalles del evento','eventos proximos',
    'next event','upcoming events','what events','event details','show events','que events hay','donde es el siguiente evento','donde es el proximo evento','hay eventos','eventos','where is the next event','is there an event'
  ],['event']),
  I('events.myRsvp','read.members',true,[
    'a que eventos estoy registrado','estoy registrado para el evento','mis confirmaciones','mi rsvp','a cuales eventos voy',
    'am i registered','my rsvp','what events am i registered for','which events am i attending','show my rsvp','estoy registered'
  ],['event','rsvp']),
  I('events.register','write.self',false,[
    'registrame al evento','quiero ir al evento','confirma mi asistencia','acepto la invitacion','quiero asistir','voy a ir',
    'register me','rsvp yes','i am attending','sign me up for the event','i will attend','register me al evento'
  ],['event','rsvp','register']),
  I('events.cancelRsvp','write.self',false,[
    'cancela mi rsvp','ya no voy al evento','quita mi confirmacion','cancela mi asistencia','no voy a asistir',
    'cancel my rsvp','i am not attending','remove my registration','cancel my attendance','cancel mi rsvp'
  ],['event','rsvp','cancel']),
  I('events.dismiss','write.self',false,[
    'quita este evento de mi pantalla','borra el evento de mi pantalla','oculta el evento','no quiero ver este evento',
    'remove this event from my screen','hide this event','dismiss event','hide el evento'
  ],['event','dismiss']),

  I('tasks.mine','read.self',true,[
    'que tareas tengo','mis tareas','tareas asignadas','que tengo pendiente','tareas pendientes para mi','que debo hacer',
    'my tasks','assigned tasks','what tasks do i have','what do i need to do','show my tasks','show mis tareas'
  ],['task','self']),
  I('tasks.complete','write.self',false,[
    'completa mi tarea','marca la tarea completada','termine la tarea','termina la tarea','ya hice la tarea',
    'complete my task','mark task complete','i finished the task','task is done','complete mi tarea'
  ],['task','complete']),
  I('tasks.cancel','write.self',false,[
    'cancela mi tarea','marca la tarea cancelada','ya no hare la tarea','cancel task','cancel my task','mark task cancelled','cancel mi tarea'
  ],['task','cancel']),
  I('tasks.dismiss','write.self',false,[
    'quita la tarea de mi pantalla','oculta la tarea','borra la tarea de mi pantalla','remove task from my screen','hide task','dismiss task','hide mi tarea'
  ],['task','dismiss']),

  I('prayer.list','read.members',true,[
    'peticiones de oracion','por quien oramos','oracion publica','que peticiones hay','muestrame las peticiones','ver peticiones','peticiones actuales',
    'prayer requests','public prayer','show prayer requests','current prayer requests','show peticiones'
  ],['prayer','list']),
  I('prayer.mine','read.self',true,[
    'mis peticiones','tengo peticiones','que peticiones he puesto','mis oraciones','my prayer requests','do i have prayer requests','my petitions','show my prayer requests','show mis peticiones'
  ],['prayer','self']),
  I('prayer.create','write.self',false,[
    'crear una peticion','crea una peticion','quiero hacer una peticion','agrega una peticion de oracion','quiero pedir oracion','necesito oracion por','pon una peticion',
    'create a prayer request','add a prayer request','i need prayer for','make a prayer request','create una peticion'
  ],['prayer','create']),
  I('prayer.delete','write.self',false,[
    'elimina mi peticion','borra mi peticion','quita mi peticion','delete my petition','delete my prayer request','remove my prayer request','delete mi peticion'
  ],['prayer','delete']),

  I('children.pickupCode','read.self',true,[
    'cual es mi codigo','codigo para recoger','olvide mi codigo','codigo de recogida','codigo para mi hijo','dame mi codigo',
    'pickup code','forgot my code','what is my pickup code','give me my code','cual es my pickup code'
  ],['pickupCode'],{sensitive:true}),
  I('children.parentVerification','write.self',false,[
    'no recuerdo el codigo','necesito otro metodo para recoger','codigo temporal para recoger','verificacion de padre','no tengo el codigo','como recojo sin codigo',
    'parent verification code','i forgot the pickup code','alternate pickup verification','i do not have the code','pickup without code','no tengo pickup code'
  ],['children','verification'],{sensitive:true}),
  I('children.status','read.self',true,[
    'mis hijos estan registrados','donde esta mi hijo','donde esta mi hija','estado de mis ninos','quien de mis hijos esta registrado','mis ninos',
    'child status','where is my child','are my children checked in','my children','where esta mi child','nombres de mis ninos','como se llaman mis ninos','names of my children','what are my children names'
  ],['children'],{sensitive:true}),
  I('children.pickupRequest','write.self',false,[
    'quiero recoger a mi hijo','quiero recoger a mi hija','solicitar recogida','traigan a mi hijo','avisa que voy por mi hijo',
    'request pickup','pick up my child','i want to pick up my child','request pickup para mi hijo'
  ],['pickup'],{sensitive:true}),
  I('children.workerStatus','read.members',true,[
    'quien esta en mi salon','ninos bajo mi cuidado','quien pidio recogida','lista de mi salon','mi area de cuidado','caregiver roster',
    'children in my room','who requested pickup','my care area','nursery roster','toddlers roster','who is in my room'
  ],['children','caregiver'],{sensitive:true}),

  I('admin.console','admin',true,[
    'abre la consola de administrador','abre administracion','panel de administrador','ir a administracion','open admin console','open administration','admin portal','open admin','abre admin'
  ],['adminConsole']),
  I('admin.programStatus','admin',true,['estado del programa','programa listo','que falta del programa','program status','is the program ready','what is missing from the program','status del programa'],['program','status']),
  I('admin.scheduleGenerate','admin',false,['genera el programa','crear programa','haz el programa','corre el programador','generate schedule','generate the program','run scheduler','generate el programa'],['program','create']),
  I('admin.pendingSongs','admin',true,['quien falta escoger cantos','cantos pendientes','quien no ha seleccionado cantos','missing songs','pending songs','who still needs songs','quien has pending songs'],['songs','pending']),
  I('admin.memberSearch','admin',true,['busca a','buscar miembro','encuentra a','dame el perfil de','miembros','lista de miembros','cuantos miembros hay','find member','search member','member profile','members','how many members','show members'],['memberSearch']),
  I('admin.memberCreate','admin',false,['quiero agregar un miembro','agrega un miembro','crear un miembro','crear una cuenta de miembro','nuevo miembro','dar de alta un miembro','create a member','add a member','create member account','new member','create un miembro','add miembro'],['member','create']),
  I('admin.bulletinUpload','admin',false,['sube el boletin','publica el boletin','carga el boletin','upload bulletin','publish bulletin','upload el boletin'],['bulletin','upload']),
  I('admin.announcementCreate','admin',false,['crea un anuncio','publica un anuncio','nuevo anuncio','agrega un anuncio','create announcement','publish announcement','new announcement','create un anuncio'],['announcement','create']),
  I('admin.eventCreate','admin',false,['crea un evento','nuevo evento','agrega un evento','create event','new event','add event','create un evento'],['event','create']),
  I('admin.eventRsvpList','admin',true,['quien esta registrado al evento','quienes aceptaron el evento','lista rsvp del evento','quien va al evento','who is registered for the event','event rsvp list','who is attending the event','show rsvp names','quien registered al evento'],['event','rsvp','list']),
  I('admin.visitors.query','admin',true,['visitantes nuevos','que visitantes hay','lista de visitantes','solicitudes de acceso','new visitors','visitor list','member access requests','show visitors','show solicitudes de acceso'],['visitor','list']),
  I('admin.taskCreate','admin',false,['crea una tarea','asigna una tarea','nueva tarea','ponle una tarea a','create task','assign a task','new task','assign tarea a'],['task','create']),
  I('admin.tasks.query','admin',true,['que tareas estan pendientes','tareas pendientes','quien tiene tareas','lista de tareas','todas las tareas','pending tasks','who has tasks','task list','all tasks','show tareas pendientes'],['task','pending']),
  I('admin.prayer.list','admin',true,['todas las peticiones','peticiones privadas','peticiones actuales','muestrame todas las peticiones','all prayer requests','private prayer requests','current petitions','show all petitions','show peticiones privadas'],['prayer','admin']),
  I('admin.childrenStatus','admin',true,['ninos registrados ahora','cuidado infantil activo','recogidas pendientes','ninos por recoger','children care status','active children checkins','pending pickups','children currently checked in'],['children','admin']),
  I('admin.reports.query','admin',true,['reportes','centro de reportes','que reportes hay','abre reportes','reports','report center','available reports','open reports','show reports'],['report']),
  I('admin.communications.query','admin',true,['estado de comunicaciones','correo y sms','mensajes fallidos','cola de mensajes','communications status','email sms status','notification failures','message queue status'],['communication','status']),
  I('admin.audit.query','admin',true,['auditoria','historial de cambios','quien cambio','actividad administrativa','audit log','audit history','who changed','administrative activity'],['audit']),
  I('admin.modules.query','admin',true,['que modulos estan activos','modulos activos','estado de modulos','which modules are enabled','module status','show modules','que modules estan enabled'],['module','status']),
  I('admin.moduleToggle','owner',false,['activa el modulo','activa chat hub','activar chat hub','desactiva el modulo','desactiva chat hub','desactivar chat hub','habilita el modulo','habilita chat hub','enable module','disable module','turn on module','turn off module','enable chat hub','disable chat hub'],['module','toggle'])
]);
