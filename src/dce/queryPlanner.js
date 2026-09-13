import { Operation } from './frame.js';
import { planFromSemantic } from './core/queryAlgebra.js';
export function planFrame(frame){
  const aggregate=frame.operation===Operation.COUNT?'count':frame.operation===Operation.EXISTS?'exists':null;
  return {
    source:{domain:frame.domain,resource:frame.resource},
    operation:frame.operation,
    predicate:frame.predicate||'',
    filters:{...(frame.filters||{}),...(frame.time?{time:frame.time}:{})},
    subject:frame.subject||null,
    roles:{...(frame.roles||{})},
    scope:{...(frame.scope||{})},
    projection:[...(frame.projection||[])],
    aggregate,
    resultType:frame.resultType||'',
    algebra:planFromSemantic({subject:frame.subject,object:{type:frame.resource||frame.domain},scope:frame.scope,projection:frame.projection,quantifier:frame.quantifier}),
    limit:frame.quantifier||null,
    mutations:[Operation.CREATE,Operation.UPDATE,Operation.ASSIGN,Operation.DELETE,Operation.CANCEL,Operation.COMPLETE,Operation.DISMISS,Operation.REGISTER,Operation.UPLOAD,Operation.PUBLISH,Operation.GENERATE,Operation.ENABLE,Operation.DISABLE,Operation.REQUEST].includes(frame.operation)
  };
}
