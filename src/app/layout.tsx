import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aura · Soundscapes',
  description: 'Immersive nature soundscapes for focus, sleep, and rest.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
