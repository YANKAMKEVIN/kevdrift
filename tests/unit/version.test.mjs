import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VERSION } from '../../src/config.js';
test('le numéro de version suit package.json', () => {
  assert.equal(VERSION, JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version);
});
