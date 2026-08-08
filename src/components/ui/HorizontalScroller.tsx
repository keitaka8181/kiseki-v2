'use client';

import { Memory } from '@/types';
import MemoryCard from '@/components/ui/MemoryCard';

interface Props {
  memories: Memory[];
  onSelect: (memory: Memory) => void;
}

export default function HorizontalScroller({ memories, onSelect }: Props) {
  if (memories.length === 0) return null;

  return (
    <div className="absolute bottom-36 left-0 right-0 z-10 pointer-events-none">
      <div className="overflow-x-auto pointer-events-auto px-4 pb-1">
        <div className="flex gap-2 w-max">
          {memories.map((m) => (
            <MemoryCard
              key={m.id}
              memory={m}
              compact
              onClick={() => onSelect(m)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
