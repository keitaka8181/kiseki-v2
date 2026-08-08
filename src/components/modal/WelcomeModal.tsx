'use client';

import { useEffect, useState } from 'react';
import { Memory } from '@/types';

const FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSfXPt1yca5nZY26U4hsEinVi0WsFPqheEV-ed_TiX7KtzGp-g/viewform?usp=header';

interface Props {
  memories: Memory[];
  onExplore: () => void;
}

export default function WelcomeModal({ memories, onExplore }: Props) {
  const [pill, setPill] = useState<string>('');

  useEffect(() => {
    if (memories.length === 0) return;
    const pick = () => {
      const m = memories[Math.floor(Math.random() * memories.length)];
      setPill(`${m.nickname}の「${m.placeName}」`);
    };
    pick();
    const interval = setInterval(pick, 3000);
    return () => clearInterval(interval);
  }, [memories]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-[90vw] max-w-sm flex flex-col items-center gap-6">

        <p className="text-xs tracking-[0.3em] text-gray-400 uppercase">MeMOriA</p>

        <h1 className="text-5xl font-bold tracking-widest font-serif">
          <span className="text-red-500">キ</span>
          <span className="text-gray-700">セ</span>
          <span className="text-blue-500">キ</span>
          <span className="text-gray-500 text-2xl ml-1">を…</span>
        </h1>

        <div className="flex w-full rounded-xl overflow-hidden border border-gray-200">
          <a
            href={FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex flex-col items-center py-4 hover:bg-red-50 transition-colors"
          >
            <span className="text-lg font-bold text-gray-700">のこす</span>
            <span className="text-xs text-gray-400 mt-1">share</span>
          </a>
          <div className="w-px bg-gray-200" />
          <button
            onClick={onExplore}
            className="flex-1 flex flex-col items-center py-4 hover:bg-blue-50 transition-colors"
          >
            <span className="text-lg font-bold text-gray-700">たどる</span>
            <span className="text-xs text-gray-400 mt-1">explore</span>
          </button>
        </div>

        {memories.length > 0 && (
          <p className="text-sm text-gray-500">
            {memories.length} 件の思い出が記録されています
          </p>
        )}

        {pill && (
          <div className="px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-600 text-center transition-all duration-500">
            {pill}
          </div>
        )}
      </div>
    </div>
  );
}
