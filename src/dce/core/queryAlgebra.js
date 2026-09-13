export const QueryOp=Object.freeze({SCAN:'scan',FILTER:'filter',JOIN:'join',PROJECT:'project',GROUP:'group',COUNT:'count',SUM:'sum',MIN:'min',MAX:'max',SORT:'sort',LIMIT:'limit',EXISTS:'exists',COMPARE:'compare'});
export function qScan(entity){return {op:QueryOp.SCAN,entity};}
export function qFilter(input,field,operator,value){return {op:QueryOp.FILTER,input,field,operator,value};}
export function qProject(input,fields){return {op:QueryOp.PROJECT,input,fields:[...fields]};}
export function qAggregate(input,op,field=''){return {op,input,field};}
export function qSort(input,field,direction='asc'){return {op:QueryOp.SORT,input,field,direction};}
export function qLimit(input,count){return {op:QueryOp.LIMIT,input,count};}
export function planFromSemantic(semantic){
  let p=qScan(semantic?.object?.type||semantic?.subject?.type||'unknown');
  for(const [field,value] of Object.entries(semantic?.scope||{}))if(value!==undefined&&value!==null&&value!=='')p=qFilter(p,field,'eq',value);
  if(semantic?.projection?.length)p=qProject(p,semantic.projection);
  if(semantic?.quantifier?.type==='count')p=qAggregate(p,QueryOp.COUNT);
  if(semantic?.comparison)p={op:QueryOp.COMPARE,input:p,...semantic.comparison};
  return p;
}
