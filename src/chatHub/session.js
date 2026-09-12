import { tableNames } from '../config.js';
import { getDoc, putDoc, nowIso } from '../storage/repository.js';
const TTL=30*60*1000;
function sid(identity){return `chat_${identity?.session?.id||identity?.member?.id||identity?.user?.username||'unknown'}`;}
export async function getChatState(churchId,identity){const id=sid(identity),row=await getDoc(tableNames.chatSessions,churchId,id);if(!row||Date.parse(row.expiresAt||0)<=Date.now())return {id,memberId:identity?.member?.id||'',pending:null,lastIntent:'',context:{}};return row;}
export async function saveChatState(churchId,state){state.updatedAt=nowIso();state.expiresAt=new Date(Date.now()+TTL).toISOString();await putDoc(tableNames.chatSessions,churchId,state.id,state,{memberId:state.memberId||'',expiresAt:state.expiresAt,lastIntent:state.lastIntent||''});return state;}
export async function clearPending(churchId,state){state.pending=null;return saveChatState(churchId,state);}
