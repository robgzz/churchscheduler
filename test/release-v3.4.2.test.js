import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('admin back button is CSP-safe and wired in admin.js', () => {
  const html=fs.readFileSync(new URL('../public/admin/index.html', import.meta.url),'utf8');
  const js=fs.readFileSync(new URL('../public/assets/admin.js', import.meta.url),'utf8');
  assert.match(html,/id="admin-back-btn"/);
  assert.doesNotMatch(html,/onclick="location\.href='\/'"/);
  assert.match(js,/admin-back-btn/);
  assert.match(js,/window\.location\.assign\('\/'\)/);
});
