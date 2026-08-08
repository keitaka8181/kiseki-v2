'use client';

import { Memory } from '@/types';
import MemoryCard from '@/components/ui/MemoryCard';

interface Props {
  memories: Memory[];
  isOpen: boolean;
  onClose: () => void;
  onSelectMemory: (memory: Memory) => void;
  totalCount: number;
}

export default function Sidebar({ memories, isOpen, onClose, onSelectMemory, totalCount }: Props) {
  return (
    <>
      {isOpen && (
        <div
          className="absolute inset-0 z-20 bg-black/30 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`
          absolute top-0 left-0 h-full z-30 bg-white shadow-2xl flex flex-col
          transition-transform duration-300 ease-in-out w-[320px]
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b">
          <div>
            <h2 className="font-bold text-gray-800">
              <span className="text-red-500">キ</span>
              <span className="text-gray-700">セ</span>
              <span className="text-blue-500">キ</span>
            </h2>
            <p className="text-xs text-gray-400">{memories.length} / {totalCount} 件の思い出</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none p-1">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          {memories.length === 0 ? (
            <p className="text-center text-gray-400 mt-8 text-sm">該当する思い出がありません</p>
          ) : (
            memories.map((m) => (
              <MemoryCard
                key={m.id}
                memory={m}
                onClick={() => { onSelectMemory(m); onClose(); }}
              />
            ))
          )}
        </div>
      </aside>
    </>
  );
}
