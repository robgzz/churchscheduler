import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const admin=fs.readFileSync(new URL('../public/assets/admin.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../public/assets/app.js',import.meta.url),'utf8');
const member=fs.readFileSync(new URL('../src/routes/member.js',import.meta.url),'utf8');

test('admin console invokes init bootstrap',()=>{ assert.match(admin,/\ninit\(\);\s*$/); });
test('children worker parent alert writes through family notification helper',()=>{ assert.match(member,/children-worker\/check-ins\/:id\/alert[\s\S]*notifyFamilyChildren\(req\.churchId,parent/); });
test('member UI polls in-app notifications without stale cache',()=>{ assert.match(app,/api\('\/api\/member\/notifications'\)/); assert.match(app,/setInterval\(\(\)=>\{if\(state\.me\)refreshNotificationBadge\(\);\},10000\)/); });
test('future programs collapse after nearest three',()=>{ assert.match(app,/map\(\(p,i\)=>programCard\(p,i<3\)\)/); assert.match(app,/function programCard\(p,expanded=false\)/); assert.match(app,/<details class=/); });
