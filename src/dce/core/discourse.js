const MAX=12;
export function ensureDiscourse(state){state.context=state.context||{};state.context.discourse=state.context.discourse||{entities:[],focus:null,expectedResponse:null};return state.context.discourse;}
export function rememberEntity(state,entity,{salience=1}={}){if(!entity?.type||!entity?.id)return;const d=ensureDiscourse(state);d.entities=d.entities.filter(x=>!(x.type===entity.type&&x.id===entity.id)).map(x=>({...x,salience:Math.max(0,(x.salience||0)-.08)}));d.entities.unshift({...entity,salience,at:new Date().toISOString()});d.entities=d.entities.slice(0,MAX);d.focus={type:entity.type,id:entity.id};}
export function setExpectedResponse(state,expected){ensureDiscourse(state).expectedResponse=expected?{...expected,createdAt:new Date().toISOString()}:null;}
export function clearExpectedResponse(state){ensureDiscourse(state).expectedResponse=null;}
export function expectedResponse(state){return ensureDiscourse(state).expectedResponse;}
export function resolveReference(state,type){return ensureDiscourse(state).entities.find(x=>!type||x.type===type)||null;}
