import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');

test('V6.7.1 synchronizes lockfile before clean install in deployment', () => {
  const yml = read('.github/workflows/deploy.yml');
  const sync = yml.indexOf('npm install --package-lock-only --ignore-scripts --no-audit --no-fund');
  const ci = yml.indexOf('npm ci --no-audit --no-fund');
  const audit = yml.indexOf('npm audit --audit-level=high');
  assert.ok(sync >= 0, 'lockfile synchronization step is required');
  assert.ok(ci > sync, 'npm ci must run after lockfile synchronization');
  assert.ok(audit > ci, 'security audit must run after clean install');
});

test('V6.7.1 security workflow uses the same synchronized clean-install path', () => {
  const yml = read('.github/workflows/security.yml');
  assert.match(yml, /npm install --package-lock-only --ignore-scripts --no-audit --no-fund/);
  assert.match(yml, /npm ci --no-audit --no-fund/);
  assert.match(yml, /npm audit --audit-level=high/);
});

test('V6.7.1 preserves Node 22 and Docker clean installs', () => {
  assert.match(read('.github/workflows/deploy.yml'), /node-version: '22'/);
  assert.match(read('Dockerfile'), /npm ci --omit=dev --no-audit --no-fund/);
});
