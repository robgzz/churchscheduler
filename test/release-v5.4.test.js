import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeInput } from '../src/chatHub/normalize.js';
import { compileDeterministic } from '../src/dce/compiler.js';
import { churchHubDomainPack } from '../src/chatHub/domainPack.js';
const compile=q=>compileDeterministic({normalized:normalizeInput(q),domainPack:churchHubDomainPack,context:{},actor:{isAdmin:true,isOwner:true}});
test('V5.5 DCE understands administrator member ministry eligibility changes',()=>{
  const writes=['Quita a Antonio Mendoza de Cantos en Servicio de Adoración','Agrega a Antonio Mendoza a Cantos los miércoles','Cambia los ministerios de Antonio Mendoza','Make Antonio Mendoza eligible for Songs on Wednesday Class','Remove Songs from Antonio Mendoza for Sunday Worship','Antonio puede servir en todo en Adoración excepto Cantos'];
  for(const q of writes)assert.equal(compile(q).intent,'admin.memberEligibilityUpdate',q);
});
test('V5.5 DCE understands administrator member ministry eligibility questions',()=>{
  for(const q of ['¿Qué ministerios tiene Antonio Mendoza?','¿Puede Antonio Mendoza cantar en Adoración?','What ministries can Antonio Mendoza serve in?','Can Antonio Mendoza sing in Sunday Worship?'])assert.equal(compile(q).intent,'admin.memberEligibilityQuery',q);
});
test('V5.5 ministry chat is live-service aware and explicit-state safe',()=>{
  const h=fs.readFileSync(new URL('../src/chatHub/handlers.js',import.meta.url),'utf8');
  assert.match(h,/listDocs\(tableNames\.services/);assert.match(h,/listDocs\(tableNames\.templates/);assert.match(h,/assignmentEligibilityMode='explicit'/);assert.match(h,/member\.eligibility\.updated/);assert.match(h,/member-eligibility:confirm/);
});
