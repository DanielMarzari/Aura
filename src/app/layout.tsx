import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aura · Soundscapes',
  description: 'Immersive nature soundscapes for focus, sleep, and rest.',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

const themeInit = `
(function() {
  try {
    var t = localStorage.getItem('aura-theme');
    document.documentElement.setAttribute('data-theme', t === 'dawn' ? 'dawn' : 'dusk');
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dusk');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dusk">
      <head>
        <Script id="theme-init" strategy="beforeInteractive">{themeInit}</Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
