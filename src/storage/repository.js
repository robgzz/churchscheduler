import crypto from 'node:crypto';
import { tableClient, blobServiceClient } from './clients.js';
import { tableNames, config } from '../config.js';

const clients = new Map();
const readCache = new Map();
const cacheTtlByTable = new Map([
  [tableNames.settings, 5*60*1000],
  [tableNames.services, 5*60*1000],
  [tableNames.ministries, 5*60*1000],
  [tableNames.templates, 5*60*1000],
  [tableNames.songs, 10*60*1000],
  [tableNames.members, 60*1000]
]);
function clone(value){ return value==null?value:structuredClone(value); }
function cacheKey(kind,table,churchId,suffix=''){ return `${kind}|${table}|${churchId}|${suffix}`; }
function cached(table,key){ const ttl=cacheTtlByTable.get(table); if(!ttl)return undefined; const hit=readCache.get(key); if(!hit||hit.expiresAt<=Date.now()){ if(hit)readCache.delete(key); return undefined; } return clone(hit.value); }
function remember(table,key,value){ const ttl=cacheTtlByTable.get(table); if(ttl)readCache.set(key,{value:clone(value),expiresAt:Date.now()+ttl}); return value; }
function invalidateTableCache(table,churchId){ const marker=`|${table}|${churchId}|`; for(const key of readCache.keys())if(key.includes(marker))readCache.delete(key); }
function client(name){
  if (!clients.has(name)) clients.set(name, tableClient(name));
  return clients.get(name);
}

function normalizeRowKey(value){
  return String(value ?? '').replace(/[\\/#?]/g, '_');
}

function entityFromDoc(churchId, id, doc, indexes={}){
  return {
    partitionKey: churchId,
    rowKey: normalizeRowKey(id),
    data: JSON.stringify(doc),
    ...indexes
  };
}
function docFromEntity(entity){
  if (!entity) return null;
  const doc = entity.data ? JSON.parse(entity.data) : {};
  return { ...doc, _etag: entity.etag };
}
function q(s){ return String(s).replace(/'/g, "''"); }

export async function ensureStorage(){
  await Promise.all(Object.values(tableNames).map(async name => {
    try { await client(name).createTable(); } catch (e) { if (e.statusCode !== 409 && e.code !== 'TableAlreadyExists') throw e; }
  }));
  const bs = blobServiceClient();
  for (const container of [config.attachmentsContainer, config.importsContainer, config.backupsContainer]) {
    await bs.getContainerClient(container).createIfNotExists();
  }
}

export async function getDoc(table, churchId, id){
  const key=cacheKey('get',table,churchId,normalizeRowKey(id));
  const hit=cached(table,key); if(hit!==undefined)return hit;
  try { return remember(table,key,docFromEntity(await client(table).getEntity(churchId, normalizeRowKey(id)))); }
  catch (e) { if (e.statusCode === 404) return null; throw e; }
}

export async function putDoc(table, churchId, id, doc, indexes={}){
  const entity = entityFromDoc(churchId, id, doc, indexes);
  await client(table).upsertEntity(entity, 'Replace');
  invalidateTableCache(table,churchId);
  return doc;
}

export async function createDoc(table, churchId, id, doc, indexes={}){
  await client(table).createEntity(entityFromDoc(churchId, id, doc, indexes));
  invalidateTableCache(table,churchId);
  return doc;
}

export async function deleteDoc(table, churchId, id){
  try { await client(table).deleteEntity(churchId, normalizeRowKey(id)); invalidateTableCache(table,churchId); return true; }
  catch (e) { if (e.statusCode === 404) return false; throw e; }
}

export async function listDocs(table, churchId, {filter='', max=1000}={}){
  const key=cacheKey('list',table,churchId,`${filter}|${max}`);
  const hit=cached(table,key); if(hit!==undefined)return hit;
  const base = `PartitionKey eq '${q(churchId)}'`;
  const fullFilter = filter ? `${base} and ${filter}` : base;
  const out=[];
  for await (const entity of client(table).listEntities({ queryOptions:{ filter: fullFilter } })) {
    out.push(docFromEntity(entity));
    if (out.length >= max) break;
  }
  remember(table,key,out);
  return clone(out);
}

export async function uploadBuffer(containerName, blobName, buffer, contentType='application/octet-stream'){
  const container = blobServiceClient().getContainerClient(containerName);
  const blob = container.getBlockBlobClient(blobName);
  await blob.uploadData(buffer, { blobHTTPHeaders:{ blobContentType:contentType } });
  return { container: containerName, blobName, contentType, size: buffer.length };
}

export async function downloadBuffer(containerName, blobName){
  const blob = blobServiceClient().getContainerClient(containerName).getBlockBlobClient(blobName);
  const response = await blob.download();
  const chunks=[];
  for await (const chunk of response.readableStreamBody) chunks.push(chunk);
  return { buffer:Buffer.concat(chunks), contentType:response.contentType || 'application/octet-stream' };
}

export async function deleteBlob(containerName, blobName){
  return blobServiceClient().getContainerClient(containerName).deleteBlob(blobName, { deleteSnapshots:'include' });
}

export function nowIso(){ return new Date().toISOString(); }
export function newId(prefix='id'){
  return `${prefix}_${crypto.randomUUID().replace(/-/g,'').slice(0,16)}`;
}
