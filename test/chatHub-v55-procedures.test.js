import test from 'node:test';import assert from 'node:assert/strict';import { assistancePlan } from '../src/chatHub/assistancePlanner.js';
const A={isAdmin:true};
test('how-to song selection maps to procedure help',()=>{const x=assistancePlan('como escojo cantos?',{},A);assert.equal(x.intent,'procedure.help');assert.equal(x.procedureId,'songs.select');});
test('song selection command maps to songs.select',()=>{const x=assistancePlan('escoger cantos para domingo 27 de septiembre',{},A);assert.equal(x.intent,'songs.select');});
test('bare Cantos is assistance not search',()=>{const x=assistancePlan('Cantos',{},A);assert.equal(x.intent,'procedure.help');assert.equal(x.procedureId,'songs.select');});
test('active song goal keeps terse choose command in context',()=>{const x=assistancePlan('Elige cantos',{context:{activeGoal:{procedureId:'songs.select'}}},A);assert.equal(x.intent,'songs.select');});
test('program admin how-to maps to help',()=>{const x=assistancePlan('como marco a un administrador como admin responsable?',{},A);assert.equal(x.intent,'procedure.help');assert.equal(x.procedureId,'program_admin.change');});
test('program admin command maps to execution',()=>{const x=assistancePlan('pon a Ruben como administrador responsable',{},A);assert.equal(x.intent,'admin.programAdminSet');});
