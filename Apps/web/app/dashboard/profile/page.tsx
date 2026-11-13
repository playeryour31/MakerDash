import dynamic from 'next/dynamic';
import { BotRouteLoading } from '@/components/DashboardRouteLoading';

const ProfileClient = dynamic(() => import('./ProfileClient'), {
  loading: () => <BotRouteLoading />,
  ssr: false,
});

export default function ProfilePage() {
  return <ProfileClient />;
}
