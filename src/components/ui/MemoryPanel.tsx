'use client';

import Image from 'next/image';
import { Memory } from '@/types';

interface Props {
  memory: Memory | null;
  onClose: () => void;
  onHashtagClick: (tag: string) => void;
  /** 同じ場所にある思い出（選択中のものを含む）。2件以上なら切り替えボタンを出す */
  samePlace?: Memory[];
  /** 同じ場所の別の思い出に切り替える */
  onSelectSamePlace?: (memory: Memory) => void;
}

export default function MemoryPanel({
  memory, onClose, onHashtagClick, samePlace = [], onSelectSamePlace,
}: Props) {
  if (!memory) return null;

  const index = samePlace.findIndex((m) => m.id === memory.id);
  const total = samePlace.length;
  const showNav = total > 1 && index >= 0 && !!onSelectSamePlace;
  const go = (step: number) => {
    if (!showNav) return;
    onSelectSamePlace!(samePlace[(index + step + total) % total]);
  };

  const hashtags = memory.hashtags
    .split(/[\s,]+/)
    .filter((t) => t.startsWith('#'));

  return (
    <div className="absolute bottom-24 left-4 right-4 z-20 md:left-auto md:right-6 md:w-96">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
          <div className="flex items-center gap-2">
            <div className="shrink-0">
              <Image
                src={`/images/avatars/${memory.avatar || 'boy'}.png`}
                alt={memory.nickname}
                width={40}
                height={40}
                className="object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = '/images/avatars/boy.png'; }}
              />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-800">{memory.nickname}</p>
              <p className="text-xs text-gray-400">{memory.year}年</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none p-1"
          >
            ×
          </button>
        </div>

        {/* 同じ場所の思い出の切り替え */}
        {showNav && (
          <div className="flex items-center justify-between px-4 py-1.5 bg-gray-800 text-white text-xs">
            <button
              onClick={() => go(-1)}
              aria-label="前の思い出"
              className="px-2 py-0.5 rounded hover:bg-white/15 text-base leading-none"
            >
              ‹
            </button>
            <span className="tabular-nums">
              この場所の思い出 {index + 1} / {total}
            </span>
            <button
              onClick={() => go(1)}
              aria-label="次の思い出"
              className="px-2 py-0.5 rounded hover:bg-white/15 text-base leading-none"
            >
              ›
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-4 flex flex-col gap-2">
          <h3 className="font-bold text-gray-800">{memory.placeName}</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{memory.memory}</p>

          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {hashtags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => onHashtagClick(tag)}
                  className="text-xs text-blue-500 hover:text-blue-700 hover:underline"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
