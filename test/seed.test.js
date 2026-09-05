import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../seed/westbury/',import.meta.url);
const members=JSON.parse(fs.readFileSync(new URL('members.json',root),'utf8'));
const services=JSON.parse(fs.readFileSync(new URL('services.json',root),'utf8'));
const templates=JSON.parse(fs.readFileSync(new URL('templates.json',root),'utf8'));
const songSeed=JSON.parse(fs.readFileSync(new URL('songs.json',root),'utf8'));

test('Westbury seed has canonical service times',()=>{
  const byId=new Map(services.map(s=>[s.id,s]));
  assert.equal(byId.get('svc_sunday_class').startTime,'09:30');
  assert.equal(byId.get('svc_sunday_worship').startTime,'11:00');
  assert.equal(byId.get('svc_wednesday_class').startTime,'19:00');
});

test('Sunday Worship has two visible Cantos rows and linked song items',()=>{
  const t=templates.find(t=>t.serviceId==='svc_sunday_worship');
  const cantos=t.items.filter(i=>i.label==='Cantos');
  assert.equal(cantos.length,2);
  assert.deepEqual(t.items.find(i=>i.label==='Canto de invitación').assignmentKeys,['songs_a']);
  assert.deepEqual(t.items.find(i=>i.label==='Canto de la cena').assignmentKeys,['songs_b']);
  assert.deepEqual(t.items.find(i=>i.label==='Canto de la ofrenda').assignmentKeys,['songs_b']);
});

test('migrated members use V2 additive groups',()=>{
  const worship=members.filter(m=>(m.groups||[]).includes('worship'));
  assert.ok(worship.length>30);
  assert.ok(worship.every(m=>(m.groups||[]).includes('members')));
});


test('Westbury song library is migrated and normalized',()=>{
  assert.equal(songSeed.songs.length,216);
  assert.equal(songSeed.songs[0].number,'0');
  assert.equal(songSeed.songs[0].title,'Himno de Bienvenida');
  const splitTitle=songSeed.songs.find(s=>s.id==='song_vmlt0kv3');
  assert.equal(splitTitle.number,'5');
  assert.equal(splitTitle.title,'Oh, Bondad Tan Infinita!');
  assert.ok(splitTitle.legacySource);
});
