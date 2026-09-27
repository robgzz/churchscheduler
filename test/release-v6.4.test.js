import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const songs=JSON.parse(read('seed/westbury/songs.json')).songs;
const byNumber=new Map(songs.map(s=>[s.number,s]));
const index=read('anthology/INDICE-CANTOS.md');
const members=read('src/routes/member.js');
const admin=read('src/routes/admin.js');
const seed=read('src/services/seed.js');
const app=read('public/assets/app.js');

test('V6.4 anthology contains authoritative titles and lyrics for every uploaded numbered file',()=>{
 assert.equal(songs.length,226);
 assert.equal(new Set(songs.map(s=>s.number)).size,226);
 assert.equal(new Set(songs.map(s=>s.id)).size,226);
 assert.ok(songs.every(s=>s.title&&s.markdown.startsWith(`# ${s.number} — ${s.title}\n`)&&s.markdown.length>45));
 assert.ok(songs.every(s=>index.includes(`**${s.number}** — ${s.title}`)));
 const files=fs.readdirSync(path.join(root,'anthology/markdown')).filter(x=>x.endsWith('.md'));
 const manifest=JSON.parse(read('anthology/markdown-manifest.json'));
 assert.equal(manifest.length,songs.length);
 const expected=new Set(manifest.map(entry=>entry.filename));
 const obsolete=files.filter(filename=>!expected.has(filename));
 assert.deepEqual(obsolete,[],`Obsolete Markdown files must be removed: ${obsolete.join(', ')}`);
 assert.equal(files.length,songs.length);
 for(const entry of manifest){
  const song=byNumber.get(entry.number);
  assert.ok(song,`Unknown song number ${entry.number} in Markdown manifest`);
  assert.equal(entry.title,song.title);
  assert.equal(read(path.join('anthology/markdown',entry.filename)),song.markdown);
 }
});

test('all supplied #69–#99 are present and #68 standalone overrides defective source',()=>{
 for(let i=69;i<=99;i++)assert.ok(byNumber.has(String(i)),`Missing hymn ${i}`);
 assert.match(byNumber.get('68').markdown,/De mi tierno Salvador/i);
});

test('203a/203b and 223a/223b are distinct named hymns from source filenames',()=>{
 assert.match(byNumber.get('203a').title,/Dias de Elias/i);
 assert.match(byNumber.get('203b').title,/MAS ALLA DEL SOL/i);
 assert.match(byNumber.get('223a').title,/DIAS DE ELIAS/i);
 assert.match(byNumber.get('223b').title,/ESPERAR EN TI/i);
 for(const n of ['203a','203b','223a','223b'])assert.ok(byNumber.get(n).markdown.length>100);
});

test('do not invent source songs whose hymn numbers were absent',()=>{
 for(const n of ['133','202','213'])assert.ok(!byNumber.has(n));
});

test('all logged-in regular users can fetch song metadata and one full Markdown song',()=>{
 assert.match(members,/memberRouter\.use\(requireLogin\)/);
 assert.match(members,/memberRouter\.get\('\/songs',async/);
 assert.match(members,/memberRouter\.get\('\/songs\/:id',async/);
 assert.match(app,/items\.push\(\{id:'songs'/);
 assert.match(app,/function renderSongLibrary\(\)/);
 assert.match(app,/function openMemberHymn\(id\)/);
 assert.match(app,/\/api\/member\/songs/);
});

test('admin can view and edit Markdown lyrics without losing existing lyrics',()=>{
 assert.match(admin,/adminRouter\.get\('\/songs\/:id'/);
 assert.match(admin,/markdown:req\.body\.markdown===undefined\?/);
 const ui=read('public/assets/admin.js');
 assert.match(ui,/name="markdown"/);
 assert.match(ui,/\/api\/admin\/songs\//);
});

test('first deployment reconciles by title not by obsolete number, preserving history',()=>{
 assert.match(seed,/const SEED_VERSION=5/);
 assert.match(seed,/function songTitleKey/);
 assert.match(seed,/const candidates=existing\.filter/);
 assert.match(seed,/active:false/);
 assert.match(seed,/reconcileAuthoritativeSongs\(churchId,songDoc\.songs/);
});

test('the default password remains welcome, with optional change from profile',()=>{
 const provision=read('src/services/accountProvisioning.js');
 assert.match(provision,/initialPassword='welcome'/);
 assert.match(provision,/mustChangePassword:false/);
 assert.match(read('src/routes/admin.js'),/initialPassword:'welcome'/);
});

test('duplicate suffixed numbers can be selected in deterministic Chat Hub and exported in order',()=>{
 const handlers=read('src/chatHub/handlers.js');
 assert.match(handlers,/\\b\\d\{1,4\}\[a-z\]\?/);
 assert.match(read('src/routes/owner.js'),/localeCompare\(String\(b.number\)/);
 assert.match(read('public/assets/admin.js'),/name="number" inputmode="text"/);
});
