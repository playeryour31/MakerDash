/**
 * Ask the Nest API for the Discord authorize URL (server-side).
 * The page then redirects the browser straight to discord.com — no client JS.
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

    const location = res.headers.get('location');
    if (!location) {
      return {
        error: `تعذر بدء تسجيل Discord (HTTP ${res.status}). تأكد أن الـ API يعمل.`,
      };
    }
    return { url: location };
  } catch (err: any) {
    return {
      error: err?.message || 'تعذر الاتصال بخادم المصادقة',
    };
  }
}
