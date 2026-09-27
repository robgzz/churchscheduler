import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {songSectionsFor,songPartsFor,allSongIds,missingSongSections,repeatedSongsInOtherSections} from '../src/services/songSections.js';
import {renderProgramItems} from '../src/scheduler/template.js';
const templates=JSON.parse(fs.readFileSync(new URL('../seed/westbury/templates.json',import.meta.url),'utf8'));
const worship=templates.find(t=>t.id==='tpl_sunday_worship');
const songs=new Map(['s32','s109','s123','s200','s201','s202'].map((id,i)=>[id,{id,number:String(i),titleEs:id}]));
const members=new Map([['roberto',{id:'roberto',fullName:'Roberto Gonzalez'}],['emanuel',{id:'emanuel',fullName:'Emmanuel Garcia'}]]);
test('Sunday worship requires main and invitation for A; main, communion and offering for B',()=>{
  assert.deepEqual(songSectionsFor(worship,'songs_a').map(x=>x.key),['main','invitation']);
  assert.deepEqual(songSectionsFor(worship,'songs_b').map(x=>x.key),['main','communion','offering']);
});
test('legacy selected October 4 songs survive as main without guessing invitation',()=>{
  const a={id:'a',assignmentKey:'songs_a',ministryId:'ministry_songs',currentMemberId:'roberto',songIds:['s32','s109','s123']};
  assert.deepEqual(songPartsFor(a),{main:['s32','s109','s123']});
  assert.deepEqual(missingSongSections(a,songSectionsFor(worship,'songs_a')).map(x=>x.key),['invitation']);
  const p=renderProgramItems(worship,{songs_a:a},members,songs);
  assert.deepEqual(p.find(x=>x.id==='sw_songs_a').assignees[0].songIds,a.songIds);
  assert.deepEqual(p.find(x=>x.id==='sw_invitation').assignees[0].songIds,[]);
});
test('each visible song position shows only its own selected song(s)',()=>{
  const a={id:'a',assignmentKey:'songs_a',ministryId:'ministry_songs',currentMemberId:'roberto',songIds:['s32','s109','s123'],songParts:{main:['s32','s109','s123'],invitation:['s200']}};
  const b={id:'b',assignmentKey:'songs_b',ministryId:'ministry_songs',currentMemberId:'emanuel',songParts:{main:['s201'],communion:['s202'],offering:['s109']},songIds:['s201']};
  assert.deepEqual(missingSongSections(a,songSectionsFor(worship,'songs_a')),[]);
  assert.deepEqual(missingSongSections(b,songSectionsFor(worship,'songs_b')),[]);
  const p=renderProgramItems(worship,{songs_a:a,songs_b:b},members,songs);
  for(const [item,ids] of Object.entries({sw_songs_a:['s32','s109','s123'],sw_invitation:['s200'],sw_songs_b:['s201'],sw_communion_song:['s202'],sw_offering_song:['s109']})){
    assert.deepEqual(p.find(x=>x.id===item).assignees[0].songIds,ids);
  }
  assert.deepEqual(allSongIds(a),['s32','s109','s123','s200']);
});
test('changing secondary selection never changes stored first block',()=>{
  const initial={songIds:['s32','s109','s123']};
  const next={...initial,songParts:{...songPartsFor(initial),invitation:['s200']}};
  assert.deepEqual(songPartsFor(next).main,initial.songIds);
  assert.deepEqual(missingSongSections(next,songSectionsFor(worship,'songs_a')),[]);
});
test('missing any one B section still reports the service incomplete',()=>{
  const b={songIds:['s201'],songParts:{main:['s201'],communion:['s202']}};
  assert.deepEqual(missingSongSections(b,songSectionsFor(worship,'songs_b')).map(x=>x.key),['offering']);
});

test('duplicate hymns across one singer or between sections are rejected by validation helper',()=>{
  const a={songIds:['s32','s109'],songParts:{main:['s32','s109'],invitation:['s200']}};
  assert.deepEqual(repeatedSongsInOtherSections(a,'invitation',['s109']),['s109']);
  assert.deepEqual(repeatedSongsInOtherSections(a,'main',['s200']),['s200']);
  assert.deepEqual(repeatedSongsInOtherSections(a,'invitation',['s123']),[]);
});
