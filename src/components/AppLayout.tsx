'use client';

import { ReactNode } from 'react';
import Header from '@/components/ui/Header';

interface Props {
  children: ReactNode;
  onLogoClick: () => void;
  onMenuClick: () => void;
}

export default function AppLayout({ children, onLogoClick, onMenuClick }: Props) {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
      <Header onLogoClick={onLogoClick} onMenuClick={onMenuClick} />
      {/* absolute inset-0 で画面全体を覆う。WelcomeModal / MapExplorer の基準コンテナ */}
      <main style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {children}
      </main>
    </div>
  );
}
