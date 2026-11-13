'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

// Tests run against the compiled package (npm test builds @maker/database first).
const crypto = require(path.join(__dirname, '..', 'dist', 'crypto.js'));

const KEY = 'test-only-key-'.padEnd(48, 'x');

function withEnv(vars, fn) {
  const saved = new Map();
  for (const [k, v] of Object.entries(vars)) {
    saved.set(k, process.env[k]);
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return fn();
  } finally {
    for (const [k, v] of saved) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test('round-trips a token with BOT_TOKEN_ENCRYPTION_KEY', () => {
  withEnv({ BOT_TOKEN_ENCRYPTION_KEY: KEY, NODE_ENV: 'development' }, () => {
    const enc = crypto.encryptBotToken('MTAw.abc.def');
    assert.notEqual(enc, 'MTAw.abc.def');
    assert.equal(crypto.decryptBotToken(enc), 'MTAw.abc.def');
  });
});

test('uses a random IV for every encryption', () => {
  withEnv({ BOT_TOKEN_ENCRYPTION_KEY: KEY, NODE_ENV: 'development' }, () => {
    const a = crypto.encryptBotToken('same-token');
    const b = crypto.encryptBotToken('same-token');
    assert.notEqual(a, b);
    assert.equal(crypto.decryptBotToken(a), crypto.decryptBotToken(b));
  });
});

test('accepts an explicit secret (CLI/tests) without env', () => {
  withEnv({ BOT_TOKEN_ENCRYPTION_KEY: undefined }, () => {
    const enc = crypto.encryptBotToken('explicit', KEY);
    assert.equal(crypto.decryptBotToken(enc, KEY), 'explicit');
  });
});

test('rejects a ciphertext encrypted with a different key', () => {
  const enc = crypto.encryptBotToken('secret-token', KEY);
  assert.throws(() => crypto.decryptBotToken(enc, `${KEY}-other`));
});

test('rejects malformed ciphertext', () => {
  withEnv({ BOT_TOKEN_ENCRYPTION_KEY: KEY }, () => {
    assert.throws(() => crypto.decryptBotToken('not-a-ciphertext'), /Invalid tokenEnc format/);
  });
});

test('refuses to run in production without the key', () => {
  withEnv(
    {
      BOT_TOKEN_ENCRYPTION_KEY: undefined,
      JWT_SECRET: 'j'.repeat(48),
      NODE_ENV: 'production',
    },
    () => {
      assert.throws(() => crypto.encryptBotToken('x'), /BOT_TOKEN_ENCRYPTION_KEY is required/);
    },
  );
});

test('rejects a short key instead of silently deriving one', () => {
  withEnv({ BOT_TOKEN_ENCRYPTION_KEY: 'short', NODE_ENV: 'development' }, () => {
    assert.throws(() => crypto.encryptBotToken('x'), /too short/);
  });
});

test('legacy JWT_SECRET fallback works outside production only', () => {
  withEnv(
    {
      BOT_TOKEN_ENCRYPTION_KEY: undefined,
      JWT_SECRET: 'legacy-jwt-secret-that-is-long-enough',
      NODE_ENV: 'development',
    },
    () => {
      const enc = crypto.encryptBotToken('legacy');
      assert.equal(crypto.decryptBotToken(enc), 'legacy');
    },
  );
});

test('assertTokenEncryptionKey passes for a valid key', () => {
  withEnv({ BOT_TOKEN_ENCRYPTION_KEY: KEY, NODE_ENV: 'development' }, () => {
    assert.doesNotThrow(() => crypto.assertTokenEncryptionKey());
  });
});

test('assertTokenEncryptionKey fails fast without a key', () => {
  withEnv(
    { BOT_TOKEN_ENCRYPTION_KEY: undefined, JWT_SECRET: undefined, NODE_ENV: 'production' },
    () => {
      assert.throws(() => crypto.assertTokenEncryptionKey(), /BOT_TOKEN_ENCRYPTION_KEY is required/);
    },
  );
});

test('pool tokens are deterministic so the unique index still dedupes', () => {
  withEnv({ BOT_TOKEN_ENCRYPTION_KEY: KEY, NODE_ENV: 'development' }, () => {
    const a = crypto.encryptPoolToken('MTAw.abc.def');
    const b = crypto.encryptPoolToken('MTAw.abc.def');
    assert.equal(a, b);
    assert.notEqual(a, 'MTAw.abc.def');
    assert.equal(crypto.decryptPoolToken(a), 'MTAw.abc.def');
  });
});

test('different pool tokens never share a ciphertext or IV', () => {
  withEnv({ BOT_TOKEN_ENCRYPTION_KEY: KEY, NODE_ENV: 'development' }, () => {
    const a = crypto.encryptPoolToken('token-a');
    const b = crypto.encryptPoolToken('token-b');
    assert.notEqual(a, b);
    const iv = (v) => v.split(':')[2];
    assert.notEqual(iv(a), iv(b));
  });
});

test('pool encryption is safe to apply twice', () => {
  withEnv({ BOT_TOKEN_ENCRYPTION_KEY: KEY, NODE_ENV: 'development' }, () => {
    const once = crypto.encryptPoolToken('idempotent');
    assert.equal(crypto.encryptPoolToken(once), once);
    assert.equal(crypto.decryptPoolToken(once), 'idempotent');
  });
});

test('legacy plaintext pool rows are passed through untouched', () => {
  withEnv({ BOT_TOKEN_ENCRYPTION_KEY: KEY, NODE_ENV: 'development' }, () => {
    assert.equal(crypto.isEncryptedPoolToken('MTAw.abc.def'), false);
    assert.equal(crypto.decryptPoolToken('MTAw.abc.def'), 'MTAw.abc.def');
  });
});

test('pool ciphertext from another key fails authentication', () => {
  const enc = crypto.encryptPoolToken('secret', KEY);
  assert.throws(() => crypto.decryptPoolToken(enc, `${KEY}-other`));
});
