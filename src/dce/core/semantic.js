export const SemanticAct=Object.freeze({
  QUERY:'query', EXPLAIN:'explain', GUIDE:'guide', EXECUTE:'execute', NAVIGATE:'navigate',
  CONFIRM:'confirm', REJECT:'reject', CORRECT:'correct', CANCEL:'cancel', UNKNOWN:'unknown'
});
export const Predicate=Object.freeze({
  HAS_PROPERTY:'has_property', RELATED_TO:'related_to', ASSIGNED_TO:'assigned_to', ELIGIBLE_FOR:'eligible_for', AVAILABLE_FOR:'available_for',
  SELECTED_FOR:'selected_for', RESPONSIBLE_FOR:'responsible_for', REGISTERED_FOR:'registered_for', HAS_TASK:'has_task', PARENT_OF:'parent_of', READY:'ready', ENABLED:'enabled'
});
export const ResultType=Object.freeze({
  FACT:'fact', STATUS:'status', LIST:'list', COUNT:'count', EXPLANATION:'explanation', PROCEDURE:'procedure', DIAGNOSIS:'diagnosis', RECOMMENDATION:'recommendation',
  ACTION_PREVIEW:'action_preview', ACTION_RESULT:'action_result', UNSUPPORTED:'unsupported', PERMISSION_DENIED:'permission_denied', CONSTRAINT_VIOLATION:'constraint_violation', AMBIGUITY:'ambiguity', NO_RESULTS:'no_results'
});
export const SemanticError=Object.freeze({
  PARSE_UNCERTAIN:'parse_uncertain', ENTITY_NOT_FOUND:'entity_not_found', ENTITY_AMBIGUOUS:'entity_ambiguous', REFERENCE_UNRESOLVED:'reference_unresolved', TEMPORAL_AMBIGUOUS:'temporal_ambiguous',
  CAPABILITY_UNSUPPORTED:'capability_unsupported', PERMISSION_DENIED:'permission_denied', CONSTRAINT_VIOLATION:'constraint_violation', MISSING_PARAMETER:'missing_parameter', CONFIRMATION_REQUIRED:'confirmation_required', CONFLICT:'conflict', NO_RESULTS:'no_results'
});
export function emptySemantic(){return {act:SemanticAct.UNKNOWN,predicate:'',subject:null,object:null,roles:{},scope:{},polarity:'positive',desiredState:null,projection:[],quantifier:null,comparison:null,confidence:{},evidence:[],errors:[]};}
