/**
 * Keep generated Markdown files in lockstep with the authoritative song seed.
 * This is restricted to anthology/markdown/*.md; no other files are touched.
 * Run before tests/build so overlaying a release on an older checkout cannot
 * leave legacy Markdown files that break the library invariant.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const folder=path.join(root,'anthology/markdown');
const songs=JSON.parse(fs.readFileSync(path.join(root,'seed/westbury/songs.json'),'utf8')).songs;
const manifest=JSON.parse(fs.readFileSync(path.join(root,'anthology/markdown-manifest.json'),'utf8'));
if(songs.length!==226 || manifest.length!==songs.length){
  throw new Error(`Unexpected source or manifest size: ${songs.length} / ${manifest.length}; refusing destructive synchronization.`);
}
const byNumber=new Map(songs.map(song=>[String(song.number),song]));
if(byNumber.size!==songs.length || new Set(songs.map(song=>song.id)).size!==songs.length){
  throw new Error('Duplicate song number or ID: refusing synchronization.');
}
const keep=new Set();
let rewritten=0;
for(const entry of manifest){
  const song=byNumber.get(entry.number);
  if(!song || song.title!==entry.title || !entry.filename.endsWith('.md') || path.basename(entry.filename)!==entry.filename){
    throw new Error(`Manifest mismatch at number ${entry.number}; refusing synchronization.`);
  }
  if(keep.has(entry.filename))throw new Error(`Duplicate Markdown filename: ${entry.filename}`);
  keep.add(entry.filename);
}
fs.mkdirSync(folder,{recursive:true});
for(const entry of manifest){
  const target=path.join(folder,entry.filename);
  const expected=byNumber.get(entry.number).markdown;
  if(!fs.existsSync(target) || fs.readFileSync(target,'utf8')!==expected){
    fs.writeFileSync(target,expected,'utf8');
    rewritten++;
  }
}
const extras=fs.readdirSync(folder).filter(name=>name.endsWith('.md')&&!keep.has(name));
for(const name of extras)fs.unlinkSync(path.join(folder,name));
console.log(`Antología sincronizada: ${songs.length} cantos autorizados, ${rewritten} archivos restaurados, ${extras.length} archivos Markdown obsoletos eliminados.`);
if(extras.length)console.log('Obsoletos eliminados:',extras.join(' | '));
