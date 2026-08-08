'use client';

import Image from 'next/image';
import { Memory } from '@/types';

interface Props {
  memory: Memory;
  onClick?: () => void;
  compact?: boolean;
}

export default function MemoryCard({ memory, onClick, compact = false }: Props) {
  const avatarSrc = `/images/avatars/${memory.avatar || 'boy'}.png`;

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white shadow hover:shadow-md transition-shadow cursor-pointer min-w-[80px]"
      >
        <Image
          src={avatarSrc}
          alt={memory.nickname}
          width={48}
          height={48}
          className="object-contain"
          onError={(e) => { (e.target as HTMLImageElement).src = '/images/avatars/boy.png'; }}
        />
        <span className="text-[10px] text-gray-600 text-center leading-tight max-w-[72px] line-clamp-2">
          {memory.placeName}
        </span>
      </button>
    );
  }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow-md p-4 flex gap-3 cursor-pointer hover:shadow-lg transition-shadow"
    >
      {/* Avatar */}
      <div className="shrink-0">
        <Image
          src={avatarSrc}
          alt={memory.nickname}
          width={64}
          height={64}
          className="object-contain"
          onError={(e) => { (e.target as HTMLImageElement).src = '/images/avatars/boy.png'; }}
        />
      </div>

      {/* Content */}
      <div className="flex flex-col justify-center gap-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-gray-800 truncate">{memory.nickname}</span>
          {memory.year && (
            <span className="text-xs text-white bg-gray-400 rounded-full px-2 py-0.5 shrink-0">
              {memory.year}
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-gray-700 truncate">{memory.placeName}</p>
        <p className="text-xs text-gray-500 line-clamp-2">{memory.memory}</p>
        {memory.hashtags && (
          <p className="text-xs text-blue-500 truncate">{memory.hashtags}</p>
        )}
      </div>
    </div>
  );
}
