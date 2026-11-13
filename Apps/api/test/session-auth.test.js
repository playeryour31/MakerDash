'use strict';

/**
 * Session transport regression tests.
 *
 * The dashboard authenticates with an HttpOnly cookie (`maker_session`) while
 * `Authorization: Bearer` stays supported for legacy clients. These tests run
 * against the compiled output so they exercise exactly what production runs:
 *
 *   npm test   (builds the API first)
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  SESSION_COOKIE,
  clearSessionCookie,
  readSessionCookie,
  setSessionCookie,
} = require('../dist/auth/session-cookie');
const { JwtAuthGuard } = require('../dist/auth/jwt-auth.guard');
const { AuthController } = require('../dist/auth/auth.controller');

function fakeRes() {
  const cookies = [];
  const clearedCookies = [];
  const redirects = [];
  return {
    cookies,
    clearedCookies,
    redirects,
    cookie(name, value, options) {
      cookies.push({ name, value, options });
      return this;
    },
    clearCookie(name, options) {
      clearedCookies.push({ name, options });
      return this;
    },
    redirect(url) {
      redirects.push(url);
      return this;
    },
  };
}

function contextFor(req) {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  };
}

const userPayload = {
  sub: '123456789012345678',
  role: 'bot-owner',
  username: 'tester',
};

test('readSessionCookie extracts only maker_session', () => {
  const req = {
    headers: {
      cookie: 'theme=dark; maker_session=abc.def.ghi; other=1',
    },
  };
  assert.equal(readSessionCookie(req), 'abc.def.ghi');
  assert.equal(
    readSessionCookie({ headers: { cookie: 'theme=dark' } }),
    null,
  );
  assert.equal(readSessionCookie({}), null);
  assert.equal(
    readSessionCookie({ headers: { cookie: 'maker_session=' } }),
    null,
  );
});

test('readSessionCookie decodes URL-encoded values', () => {
  const req = { headers: { cookie: `maker_session=${encodeURIComponent('a b+c')}` } };
  assert.equal(readSessionCookie(req), 'a b+c');
});

test('setSessionCookie uses HttpOnly / SameSite=Lax / 7d', () => {
  const res = fakeRes();
  setSessionCookie(res, 'jwt-token');
  assert.equal(res.cookies.length, 1);
  const [cookie] = res.cookies;
  assert.equal(cookie.name, SESSION_COOKIE);
  assert.equal(cookie.value, 'jwt-token');
  assert.equal(cookie.options.httpOnly, true);
  assert.equal(cookie.options.sameSite, 'lax');
  assert.equal(cookie.options.path, '/');
  assert.equal(cookie.options.maxAge, 7 * 24 * 60 * 60 * 1000);
  assert.equal(cookie.options.secure, false); // NODE_ENV=test
  assert.equal(cookie.options.domain, undefined);
});

test('setSessionCookie honours SESSION_COOKIE_DOMAIN', () => {
  process.env.SESSION_COOKIE_DOMAIN = '.example.com';
  try {
    const res = fakeRes();
    setSessionCookie(res, 'jwt-token');
    assert.equal(res.cookies[0].options.domain, '.example.com');
  } finally {
    delete process.env.SESSION_COOKIE_DOMAIN;
  }
});

test('clearSessionCookie expires the same cookie', () => {
  const res = fakeRes();
  clearSessionCookie(res);
  assert.equal(res.clearedCookies.length, 1);
  assert.equal(res.clearedCookies[0].name, SESSION_COOKIE);
  assert.equal(res.clearedCookies[0].options.httpOnly, true);
  assert.equal(res.clearedCookies[0].options.sameSite, 'lax');
});

test('JwtAuthGuard accepts the session cookie', () => {
  const guard = new JwtAuthGuard({
    verify: (token) => {
      assert.equal(token, 'cookie-jwt');
      return userPayload;
    },
  });
  const req = { headers: { cookie: `${SESSION_COOKIE}=cookie-jwt` } };
  assert.equal(guard.canActivate(contextFor(req)), true);
  assert.deepEqual(req.user, userPayload);
});

test('JwtAuthGuard still accepts a Bearer token', () => {
  const guard = new JwtAuthGuard({
    verify: (token) => {
      assert.equal(token, 'bearer-jwt');
      return userPayload;
    },
  });
  const req = { headers: { authorization: 'Bearer bearer-jwt' } };
  assert.equal(guard.canActivate(contextFor(req)), true);
});

test('JwtAuthGuard rejects a missing session', () => {
  const guard = new JwtAuthGuard({ verify: () => userPayload });
  assert.throws(
    () => guard.canActivate(contextFor({ headers: {} })),
    /Missing token/,
  );
});

test('JwtAuthGuard rejects pending 2FA tokens', () => {
  const guard = new JwtAuthGuard({
    verify: () => ({ ...userPayload, purpose: '2fa_pending' }),
  });
  const req = { headers: { cookie: `${SESSION_COOKIE}=pending` } };
  assert.throws(
    () => guard.canActivate(contextFor(req)),
    /Complete security verification/,
  );
});

test('JwtAuthGuard rejects non-Discord subjects', () => {
  const guard = new JwtAuthGuard({
    verify: () => ({ sub: 'abc', role: 'bot-owner' }),
  });
  const req = { headers: { cookie: `${SESSION_COOKIE}=jwt` } };
  assert.throws(
    () => guard.canActivate(contextFor(req)),
    /Discord login required/,
  );
});

test('POST /auth/logout clears the session cookie', () => {
  const controller = new AuthController({});
  const res = fakeRes();
  assert.deepEqual(controller.logout(res), { ok: true });
  assert.equal(res.clearedCookies[0].name, SESSION_COOKIE);
});

test('Discord callback sets the cookie and keeps the token out of the URL', async () => {
  const controller = new AuthController({
    completeDiscordLogin: async () => ({
      redirectUrl: 'http://localhost:4084/auth/callback?next=%2Fdashboard',
      accessToken: 'fresh-jwt',
    }),
  });
  const res = fakeRes();
  await controller.discordCallback('code', undefined, undefined, res);

  assert.equal(res.cookies.length, 1);
  assert.equal(res.cookies[0].name, SESSION_COOKIE);
  assert.equal(res.cookies[0].value, 'fresh-jwt');
  assert.equal(res.redirects.length, 1);
  assert.ok(!res.redirects[0].includes('fresh-jwt'));
  assert.ok(!res.redirects[0].includes('token='));
});

test('security challenge verify sets the cookie and strips accessToken', async () => {
  const controller = new AuthController({
    completeSecurityLogin: async () => ({
      accessToken: 'fresh-jwt',
      next: '/dashboard',
    }),
  });
  const res = fakeRes();
  const body = await controller.verifyChallenge(
    { pendingToken: 'pending', method: 'totp', code: '123456' },
    res,
  );

  assert.equal(res.cookies[0].name, SESSION_COOKIE);
  assert.equal(res.cookies[0].value, 'fresh-jwt');
  assert.deepEqual(body, { next: '/dashboard' });
});
