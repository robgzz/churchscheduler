// Church-specific semantic aliases. The generic DCE remains domain-agnostic.
export const roleOntology=Object.freeze([
  ['meditation',/\b(predic\w*|sermon|meditacion|mensaje|preach\w*|sermon)\b/],
  ['songs',/\b(cantos?|canciones?|cantar|canta|cantor(?:es)?|songs?|sing(?:ing)?|singer)\b/],
  ['security',/\b(vigilancia|seguridad|security)\b/],
  ['communion',/\b(comunion|cena(?: del senor)?|mesa del senor|ofrenda|communion|lord'?s supper|offering)\b/],
  ['scripture',/\b(escritura|lectura(?: biblica)?|scripture|bible reading)\b/],
  ['welcome',/\b(bienvenida|apertura|welcome|opening)\b/],
  ['class_teacher',/\b(clase|dar la clase|ensen\w*|maestr[oa]|profesor(?:a)?|teacher|teaching|class)\b/],
  ['closing',/\b(oracion final|cierre|closing prayer|closing announcements|final prayer)\b/],
  ['prayer',/\b(oracion|orar|oro|reza|prayer|pray|prayed)\b/]
]);
export function roleFromText(text){for(const [id,re] of roleOntology)if(re.test(text))return id;return '';}
export function requestedProjection(text){
  if(/\b(quien|quienes|who)\b/.test(text))return ['person'];
  if(/\b(cuando|when)\b/.test(text))return ['date','time'];
  if(/\b(donde|where)\b/.test(text))return ['location'];
  if(/\b(cuantos|cuantas|how many)\b/.test(text))return ['count'];
  if(/\b(por que|porque|why|que falta|what is missing|whats missing)\b/.test(text))return ['reason'];
  if(/\b(cual|cuales|que|what|which)\b/.test(text))return ['object'];
  return [];
}
export function subjectFromText(text){return /\b(mi|mis|me|yo|tengo|estoy|soy|my|mine|i|i have|i am|am i|assigned to me)\b/.test(text)?{scope:'self',type:'member',value:''}:{scope:'any',type:'',value:''};}
