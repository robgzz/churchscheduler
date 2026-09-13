import { traceRule } from '../../dce/core/reasoning.js';
export function canAssignTrace({active,serviceAvailable,eligible,unavailable=false,conflict=false}){
  return traceRule('member.can_be_assigned',[
    {rule:'member.active',passed:active!==false},
    {rule:'service.available',passed:serviceAvailable!==false},
    {rule:'ministry.eligible',passed:eligible===true},
    {rule:'member.not_unavailable',passed:unavailable!==true},
    {rule:'member.no_conflict',passed:conflict!==true}
  ]);
}
export function programReadyTrace({openAssignments=0,missingSongs=0}){
  return traceRule('program.ready',[
    {rule:'assignments.filled',passed:Number(openAssignments)===0,count:Number(openAssignments)},
    {rule:'songs.selected',passed:Number(missingSongs)===0,count:Number(missingSongs)}
  ]);
}
