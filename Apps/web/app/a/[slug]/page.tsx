import { redirect } from 'next/navigation';
import AmbientBackground from '@/components/AmbientBackground';
import OAuthFallbackCard from '@/components/OAuthFallbackCard';
import { getDiscordAuthorizeUrl } from '@/lib/discord-oauth';

export default async function AdminInvitePage({
  params,
}: {
  params: { slug: string };
}) {
  const state = `admin:${params.slug}`;
  const { url, error } = await getDiscordAuthorizeUrl(state);
  if (url) redirect(url);

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      <AmbientBackground />
      <OAuthFallbackCard kind="admin" state={state} error={error} />
    </main>
  );
}
