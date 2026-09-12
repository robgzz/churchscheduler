import { Operation } from './frame.js';
export function planFrame(frame){
  const aggregate=frame.operation===Operation.COUNT?'count':frame.operation===Operation.EXISTS?'exists':null;
  return {
    source:{domain:frame.domain,resource:frame.resource},
    operation:frame.operation,
    filters:{...(frame.filters||{}),...(frame.time?{time:frame.time}:{})},
    subject:frame.subject||null,
    projection:[...(frame.projection||[])],
    aggregate,
    limit:frame.quantifier||null,
    mutations:[Operation.CREATE,Operation.UPDATE,Operation.ASSIGN,Operation.DELETE,Operation.CANCEL,Operation.COMPLETE,Operation.DISMISS,Operation.REGISTER,Operation.UPLOAD,Operation.PUBLISH,Operation.GENERATE,Operation.ENABLE,Operation.DISABLE,Operation.REQUEST].includes(frame.operation)
  };
}
