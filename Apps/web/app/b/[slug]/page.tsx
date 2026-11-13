import { redirect } from 'next/navigation';
import AmbientBackground from '@/components/AmbientBackground';
import OAuthFallbackCard from '@/components/OAuthFallbackCard';
import { getDiscordAuthorizeUrl } from '@/lib/discord-oauth';

export default async function BotMagicLinkPage({
  params,
}: {
  // Next 16: route params are async.
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const state = String(slug);
  const { url, error } = await getDiscordAuthorizeUrl(state);
  if (url) redirect(url);

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      <AmbientBackground />
      <OAuthFallbackCard kind="bot" state={state} error={error} />
    </main>
  );
}
