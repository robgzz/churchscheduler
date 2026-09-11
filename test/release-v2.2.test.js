import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../public/assets/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/assets/styles.css',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../public/service-worker.js',import.meta.url),'utf8');
const repo=fs.readFileSync(new URL('../src/storage/repository.js',import.meta.url),'utf8');
const bicep=fs.readFileSync(new URL('../infra/main.bicep',import.meta.url),'utf8');

test('V2.2 makes assignment dates and Cantos actions prominent',()=>{
  assert.match(app,/date-tile/);
  assert.match(app,/songsNeedAttention/);
  assert.match(app,/youAreServingSongs/);
});

test('V2.2 song picker keeps save controls outside the scrolling song list',()=>{
  assert.match(app,/song-picker-footer/);
  assert.match(app,/data-song-view="selected"/);
  assert.match(css,/\.song-picker-list\{overflow-y:auto/);
  assert.match(css,/\.song-picker-footer\{/);
});

test('V2.2 includes server read caching and optimized PWA shell caching',()=>{
  assert.match(repo,/cacheTtlByTable/);
  assert.match(repo,/tableNames\.songs, 10\*60\*1000/);
  assert.match(sw,/church-v2-shell-[5-9]/);
  assert.match(sw,/staticAsset/);
});

test('V2.2 infrastructure allows four burst replicas',()=>{
  assert.match(bicep,/param maxReplicas int = [4-9]/);
});
