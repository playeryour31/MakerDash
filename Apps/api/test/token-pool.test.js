'use strict';

/**
 * Token-pool storage tests.
 *
 * Pool rows must be encrypted at rest, but `@@unique([kind, token])` means the
 * ciphertext has to stay deterministic: the same plaintext must hash to the same
 * stored value or every import would duplicate rows. These tests run against the
 * compiled repository with a fake Prisma client, so they need no database.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

process.env.BOT_TOKEN_ENCRYPTION_KEY = 'token-pool-test-key-'.padEnd(48, 'x');
process.env.NODE_ENV = 'test';

const { decryptPoolToken, isEncryptedPoolToken } = require('@maker/database');
const {
  TokenPoolRepository,
} = require('../dist/prisma/repositories/token-pool.repository');

const TOKEN = 'MTAwMDAwMDAwMDAwMDAwMDAw.GaBcDe.0123456789abcdefghijklmnopqrstuvwxyz';

function fakeClient() {
  const rows = [];
  const calls = [];
  let seq = 0;

  const matches = (row, where) =>
    Object.entries(where || {}).every(([key, value]) => {
      if (value && typeof value === 'object' && Array.isArray(value.in)) {
        return value.in.includes(row[key]);
      }
      return row[key] === value;
    });

  const api = {
    rows,
    calls,
    async create({ data }) {
      calls.push(['create', data]);
      const row = {
        id: `row-${++seq}`,
        clientId: null,
        meta: null,
        createdAt: new Date(seq),
        updatedAt: new Date(seq),
        ...data,
      };
      rows.push(row);
      return row;
    },
    async findMany({ where, orderBy, select } = {}) {
      let out = rows.filter((r) => matches(r, where));
      if (orderBy?.createdAt === 'asc') {
        out = out.slice().sort((a, b) => a.createdAt - b.createdAt);
      }
      return out.map((r) =>
        select ? Object.fromEntries(Object.keys(select).map((k) => [k, r[k]])) : r,
      );
    },
    async findFirst({ where } = {}) {
      return rows.find((r) => matches(r, where)) || null;
    },
    async upsert({ where, create, update }) {
      calls.push(['upsert', where]);
      const key = where.kind_token || {};
      const existing = rows.find(
        (r) => r.kind === key.kind && r.token === key.token,
      );
      if (existing) {
        if (update?.meta !== undefined) existing.meta = update.meta;
        return existing;
      }
      return api.create({ data: create });
    },
    async delete({ where }) {
      const idx = rows.findIndex((r) => r.id === where.id);
      if (idx === -1) throw new Error('not found');
      return rows.splice(idx, 1)[0];
    },
    async deleteMany({ where } = {}) {
      const keep = [];
      let count = 0;
      for (const row of rows) {
        if (matches(row, where)) count += 1;
        else keep.push(row);
      }
      rows.length = 0;
      rows.push(...keep);
      return { count };
    },
  };

  return {
    tokenPoolEntry: api,
    rows,
    calls,
    async $transaction(arg) {
      if (typeof arg === 'function') return arg({ tokenPoolEntry: api });
      return Promise.all(arg);
    },
  };
}

test('add stores ciphertext, never the plaintext token', async () => {
  const client = fakeClient();
  const repo = new TokenPoolRepository({ client });

  await repo.add('unused', TOKEN);

  assert.equal(client.rows.length, 1);
  assert.notEqual(client.rows[0].token, TOKEN);
  assert.ok(isEncryptedPoolToken(client.rows[0].token));
  assert.ok(!client.rows[0].token.includes(TOKEN));
  assert.equal(decryptPoolToken(client.rows[0].token), TOKEN);
});

test('the same token always produces the same row (unique index works)', async () => {
  const client = fakeClient();
  const repo = new TokenPoolRepository({ client });

  await repo.add('unused', TOKEN);
  await repo.add('unused', TOKEN);

  assert.equal(client.rows.length, 1);
  assert.equal(decryptPoolToken(client.rows[0].token), TOKEN);
});

test('a different token gets a different stored value', async () => {
  const client = fakeClient();
  const repo = new TokenPoolRepository({ client });

  await repo.add('unused', TOKEN);
  await repo.add('unused', `${TOKEN}x`);

  assert.equal(client.rows.length, 2);
  assert.notEqual(client.rows[0].token, client.rows[1].token);
});

test('listTokens and takeOne return plaintext', async () => {
  const client = fakeClient();
  const repo = new TokenPoolRepository({ client });

  await repo.add('unused', TOKEN);
  assert.deepEqual(await repo.listTokens('unused'), [TOKEN]);

  const taken = await repo.takeOne('unused');
  assert.equal(taken, TOKEN);
  assert.equal(client.rows.length, 0);
});

test('remove deletes both the encrypted row and a legacy plaintext row', async () => {
  const client = fakeClient();
  const repo = new TokenPoolRepository({ client });

  await repo.add('unused', TOKEN);
  // Simulate a row written before encryption.
  await client.tokenPoolEntry.create({
    data: { kind: 'unused', token: TOKEN },
  });
  assert.equal(client.rows.length, 2);

  await repo.remove('unused', TOKEN);
  assert.equal(client.rows.length, 0);
});

test('add heals a leftover plaintext row instead of duplicating it', async () => {
  const client = fakeClient();
  const repo = new TokenPoolRepository({ client });

  await client.tokenPoolEntry.create({
    data: { kind: 'unused', token: TOKEN },
  });
  await repo.add('unused', TOKEN);

  assert.equal(client.rows.length, 1);
  assert.ok(isEncryptedPoolToken(client.rows[0].token));
});

test('replaceAll rewrites the pool encrypted', async () => {
  const client = fakeClient();
  const repo = new TokenPoolRepository({ client });

  await repo.replaceAll('working', [TOKEN, `${TOKEN}y`]);

  assert.equal(client.rows.length, 2);
  assert.ok(client.rows.every((r) => isEncryptedPoolToken(r.token)));
  assert.deepEqual(await repo.listTokens('working'), [TOKEN, `${TOKEN}y`]);
});

test('legacy plaintext rows stay readable before the migration runs', async () => {
  const client = fakeClient();
  const repo = new TokenPoolRepository({ client });

  await client.tokenPoolEntry.create({
    data: { kind: 'unused', token: TOKEN },
  });

  assert.deepEqual(await repo.listTokens('unused'), [TOKEN]);
});
