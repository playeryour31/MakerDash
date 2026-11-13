'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePool, DISCORD_TOKEN } = require('./token-pool-normalize');

// Valid-shaped fake tokens (never real credentials).
const T1 = `MTAwMDAwMDAwMDAwMDAwMDAw.${'GaHo9J'}.${'A'.repeat(30)}`;
const T2 = `MTExMTExMTExMTExMTExMTEx.${'GVcTov'}.${'B'.repeat(32)}`;

test('accepts the canonical { Tokens: [] } shape', () => {
  const out = normalizePool({ Tokens: [T1, T2] });
  assert.deepEqual(out.unique, [T1, T2]);
  assert.equal(out.invalid.length, 0);
  assert.match(out.source, /key:Tokens/);
});

test('accepts the legacy { TOKENS: [] } uppercase shape', () => {
  const out = normalizePool({ TOKENS: [T1] });
  assert.deepEqual(out.unique, [T1]);
});

test('accepts { tokens: [{ token, reason }] }', () => {
  const out = normalizePool({ tokens: [{ token: T1, reason: 'boom' }] });
  assert.deepEqual(out.unique, [T1]);
});

test('accepts { Subscriptions: [{ Token, ClientID }] }', () => {
  const out = normalizePool({
    Subscriptions: [{ Token: T1, ClientID: '123', Owner: ['1'] }],
  });
  assert.deepEqual(out.unique, [T1]);
});

test('accepts the old token-map shape { "<token>": [metadata] }', () => {
  const out = normalizePool({ [T1]: [{ id: '123', username: 'bot' }] });
  assert.deepEqual(out.unique, [T1]);
  assert.match(out.source, /token-map/);
});

test('accepts a bare array', () => {
  const out = normalizePool([T1, T2]);
  assert.deepEqual(out.unique, [T1, T2]);
  assert.equal(out.source, 'bare-array');
});

test('deduplicates tokens repeated across shapes', () => {
  const out = normalizePool({
    tokens: [{ token: T1 }, { token: T1 }, { token: T2 }],
    [T1]: [{ id: '123' }],
  });
  assert.equal(out.tokens.length, 4);
  assert.deepEqual(out.unique, [T1, T2]);
});

test('routes malformed entries to invalid instead of tokens', () => {
  const out = normalizePool({ Tokens: [T1, 'not-a-token', '', 42] });
  assert.deepEqual(out.unique, [T1]);
  assert.deepEqual(out.invalid, ['not-a-token']);
});

test('handles empty and unknown payloads', () => {
  assert.deepEqual(normalizePool({}).unique, []);
  assert.equal(normalizePool({}).source, 'unknown');
  assert.deepEqual(normalizePool(null).unique, []);
});

test('token regex matches real Discord token layout', () => {
  assert.equal(DISCORD_TOKEN.test(T1), true);
  assert.equal(DISCORD_TOKEN.test(`${'a'.repeat(24)}.GaHo9J`), false);
});
