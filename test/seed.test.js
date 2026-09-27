import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../seed/westbury/',import.meta.url);
const members=JSON.parse(fs.readFileSync(new URL('members.json',root),'utf8'));
const services=JSON.parse(fs.readFileSync(new URL('services.json',root),'utf8'));
const templates=JSON.parse(fs.readFileSync(new URL('templates.json',root),'utf8'));
const ministries=JSON.parse(fs.readFileSync(new URL('ministries.json',root),'utf8'));
const church=JSON.parse(fs.readFileSync(new URL('church.json',root),'utf8'));
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


test('Westbury V6.4 anthology replaces legacy numbering with authoritative submitted files',()=>{
  assert.equal(songSeed.songs.length,226);
  assert.equal(songSeed.songs[0].number,'0');
  assert.equal(songSeed.songs[0].title,'Himno de Bienvenida');
  assert.equal(songSeed.songs.find(s=>s.number==='68').title,'De Mi Tierno Salvador');
  assert.ok(songSeed.songs.every(s=>s.markdown.startsWith(`# ${s.number} — ${s.title}\n`)));
  assert.ok(songSeed.songs.every(s=>s.active));
});


test('Westbury seed includes bilingual service, ministry, and template labels',()=>{
  assert.ok(services.every(s=>s.labelEn && s.labelEs));
  assert.ok(ministries.every(m=>m.labelEn && m.labelEs));
  assert.ok(templates.every(t=>(t.items||[]).every(i=>i.labelEn && i.labelEs)));
  assert.equal(church.logoUrl,'/assets/church-logo.png');
});
