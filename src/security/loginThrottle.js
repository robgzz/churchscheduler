import crypto from 'node:crypto';
import { tableNames } from '../config.js';
import { getDoc, putDoc, deleteDoc, nowIso } from '../storage/repository.js';
const WINDOW_MS=15*60*1000, BLOCK_MS=15*60*1000, USER_MAX=10, IP_MAX=30;
function id(kind,value){return `login_${kind}_${crypto.createHash('sha256').update(String(value||'unknown').toLowerCase()).digest('hex').slice(0,32)}`;}
async function state(churchId,key){const row=await getDoc(tableNames.securityThrottle,churchId,key);if(!row)return null;if(Date.parse(row.expiresAt||0)<=Date.now()){await deleteDoc(tableNames.securityThrottle,churchId,key).catch(()=>{});return null;}return row;}
async function checkOne(churchId,key){const row=await state(churchId,key);if(!row)return {blocked:false};const blockedUntil=Date.parse(row.blockedUntil||0);return {blocked:blockedUntil>Date.now(),retryAfter:blockedUntil>Date.now()?Math.ceil((blockedUntil-Date.now())/1000):0};}
export async function checkLoginThrottle(churchId,{username,ip}){const [u,i]=await Promise.all([checkOne(churchId,id('user',username)),checkOne(churchId,id('ip',ip))]);return u.blocked?u:i;}
async function failOne(churchId,key,max){const current=await state(churchId,key);const started=current?.windowStartedAt&&Date.parse(current.windowStartedAt)>Date.now()-WINDOW_MS?current.windowStartedAt:nowIso();const count=(current?.windowStartedAt===started?Number(current.count||0):0)+1;const blockedUntil=count>=max?new Date(Date.now()+BLOCK_MS).toISOString():'';await putDoc(tableNames.securityThrottle,churchId,key,{id:key,count,windowStartedAt:started,blockedUntil,expiresAt:new Date(Date.now()+Math.max(WINDOW_MS,BLOCK_MS)*2).toISOString(),updatedAt:nowIso()},{expiresAt:new Date(Date.now()+Math.max(WINDOW_MS,BLOCK_MS)*2).toISOString()});}
export async function recordLoginFailure(churchId,{username,ip}){await Promise.all([failOne(churchId,id('user',username),USER_MAX),failOne(churchId,id('ip',ip),IP_MAX)]);}
export async function clearLoginFailure(churchId,{username}){await deleteDoc(tableNames.securityThrottle,churchId,id('user',username)).catch(()=>{});}
