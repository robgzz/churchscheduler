export const churchLexicon=Object.freeze({
  'entity.member':{es:['miembro','hermano','persona'],en:['member','person']},
  'entity.service':{es:['servicio','adoracion','clase'],en:['service','worship','class']},
  'entity.assignment':{es:['asignacion','turno','me toca'],en:['assignment','turn','assigned']},
  'entity.song':{es:['canto','cancion','himno'],en:['song','hymn']},
  'entity.task':{es:['tarea','seguimiento'],en:['task','follow-up']},
  'entity.event':{es:['evento','confraternidad'],en:['event','fellowship']},
  'entity.prayer_request':{es:['peticion','peticion de oracion'],en:['prayer request','petition']},
  'entity.child':{es:['nino','nina','hijo','hija'],en:['child','kid','son','daughter']},
  'entity.publication':{es:['boletin','anuncio','noticia'],en:['bulletin','announcement','news']},
  'entity.module':{es:['modulo'],en:['module']},
  'ministry.meditation':{es:['meditacion','sermon','predicar','dar el mensaje'],en:['meditation','sermon','preach','preaching','message']},
  'ministry.songs':{es:['cantos','cantar','dirigir cantos','cantor'],en:['songs','sing','singing','song leader']},
  'ministry.communion':{es:['cena','cena del senor','comunion','ofrenda'],en:['communion','lord s supper','offering']},
  'ministry.scripture':{es:['lectura','escritura','lectura biblica'],en:['scripture','bible reading']},
  'ministry.closing':{es:['oracion final','cierre'],en:['closing prayer','closing']}
});
export function lexemes(concept){const x=churchLexicon[concept]||{};return [...(x.es||[]),...(x.en||[])];}
