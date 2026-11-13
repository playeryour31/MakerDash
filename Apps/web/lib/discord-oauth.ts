/**
 * Ask the Nest API whether Discord OAuth is configured, then hand the browser a
 * same-origin URL to continue.
 *
 * The API mints a one-shot CSRF nonce and stores it in an HttpOnly cookie when
 * `/api/auth/discord` is requested. A server-side fetch here would receive that
 * Set-Cookie and throw it away (Server Components cannot set cookies), so the
 * callback would be rejected as `oauth_state_invalid`. Returning the relative
 * proxy path keeps the whole flow in the browser.
 */
export async function getDiscordAuthorizeUrl(
  state: string,
): Promise<{ url?: string; error?: string }> {
  const origin = (
    process.env.INTERNAL_API_ORIGIN ||
    'http://127.0.0.1:3011'
  ).replace(/\/$/, '');

  try {
    const res = await fetch(
      `${origin}/api/auth/discord?state=${encodeURIComponent(state)}`,
      {
        redirect: 'manual',
        cache: 'no-store',
        headers: { 'ngrok-skip-browser-warning': '1' },
      },
    );

    if (!res.headers.get('location')) {
      return {
        error: `تعذر بدء تسجيل Discord (HTTP ${res.status}). تأكد أن الـ API يعمل.`,
      };
    }
    return { url: `/api/auth/discord?state=${encodeURIComponent(state)}` };
  } catch (err: any) {
    return {
      error: err?.message || 'تعذر الاتصال بخادم المصادقة',
    };
  }
}
