import './globals.css';
import type { Metadata, Viewport } from 'next';
import dynamic from 'next/dynamic';
import { I18nProvider } from '@/lib/i18n/I18nProvider';
import SWRProvider from '@/components/SWRProvider';

const ServiceWorkerGuard = dynamic(
  () => import('@/components/ServiceWorkerGuard'),
  { ssr: false },
);

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://maker.web.volyx.xyz';

const siteDescription =
  'Control all your Discord bots from one dashboard: protection, tickets, systems, Muslim, apply, logs, and more.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Volyx Maker | Bot Dashboard',
    template: '%s | Volyx Maker',
  },
  description: siteDescription,
  applicationName: 'Volyx Maker',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Volyx Maker',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['ar_SA'],
    url: '/',
    siteName: 'Volyx Maker',
    title: 'Volyx Maker | Bot Dashboard',
    description: siteDescription,
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'Volyx Maker — Discord bot dashboard',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Volyx Maker | Bot Dashboard',
    description: siteDescription,
    images: ['/og.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
    shortcut: ['/favicon.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#06060a',
  colorScheme: 'dark',
};

const localeBootScript = `
(function(){
  try {
    var l = localStorage.getItem('maker-locale');
    if (l === 'ar') {
      document.documentElement.lang = 'ar';
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.lang = 'en';
      document.documentElement.dir = 'ltr';
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" className="dark font-cairo-root" suppressHydrationWarning>
      <head>
        {/* Browser-only font load — never blocks Next.js compile when Google is unreachable */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="preconnect" href="https://cdn.discordapp.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://cdn.discordapp.com" />
        <script dangerouslySetInnerHTML={{ __html: localeBootScript }} />
      </head>
      <body className="font-cairo-body" suppressHydrationWarning>
        <I18nProvider>
          <ServiceWorkerGuard />
          <SWRProvider>{children}</SWRProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
