'use client';



import dynamic from 'next/dynamic';

import { BotPageSkeleton } from '@/components/apply/BotFormBits';

import SystemOnlyGuard from '@/components/system/SystemOnlyGuard';



const WelcomeClient = dynamic(

  () => import('@/components/system/welcome/WelcomeClient'),

  { loading: () => <BotPageSkeleton />, ssr: false },

);



export default function SystemWelcomePage() {

  return (

    <SystemOnlyGuard>

      <WelcomeClient />

    </SystemOnlyGuard>

  );

}

