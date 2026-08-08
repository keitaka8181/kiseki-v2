import type { Metadata } from 'next';
import { Noto_Serif_JP, Kosugi_Maru } from 'next/font/google';
import './globals.css';

const notoSerifJP = Noto_Serif_JP({
  subsets: ['latin'],
  weight: ['600'],
  display: 'swap',
  variable: '--font-noto-serif-jp',
});

const kosugiMaru = Kosugi_Maru({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-kosugi-maru',
});

export const metadata: Metadata = {
  title: 'キセキ — 日本の高校生の軌跡',
  description: '高校生の思い出の場所をマップに残す、思い出の地図。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${notoSerifJP.variable} ${kosugiMaru.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
