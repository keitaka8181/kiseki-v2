'use client';

import { Memory } from '@/types';
import { FilterState } from '@/types';
import { BasemapLayer } from '@/lib/basemaps';
import dynamic from 'next/dynamic';
import SearchBar from '@/components/search/SearchBar';
import Sidebar from '@/components/sidebar/Sidebar';
import TimelineControls from '@/components/timeline/TimelineControls';
import HorizontalScroller from '@/components/ui/HorizontalScroller';
import MemoryPanel from '@/components/ui/MemoryPanel';
import BasemapTimeline from '@/components/map/BasemapTimeline';

const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false });

interface Props {
  memories: Memory[];
  filtered: Memory[];
  years: string[];
  isLoading: boolean;
  filter: FilterState;
  activeBasemap: BasemapLayer;
  selectedMemory: Memory | null;
  flyToMemory: Memory | null;
  sidebarOpen: boolean;
  onFilterChange: (patch: Partial<FilterState>) => void;
  onBasemapChange: (layer: BasemapLayer) => void;
  onSelectMemory: (memory: Memory) => void;
  onCloseMemory: () => void;
  onHashtagClick: (tag: string) => void;
  onSidebarOpen: () => void;
  onSidebarClose: () => void;
}

export default function MapExplorer({
  memories, filtered, years, isLoading,
  filter, activeBasemap,
  selectedMemory, flyToMemory,
  sidebarOpen,
  onFilterChange, onBasemapChange,
  onSelectMemory, onCloseMemory, onHashtagClick,
  onSidebarOpen, onSidebarClose,
}: Props) {
  return (
    /*
     * position:relative + 明示的なサイズ指定が必須。
     * MapLibre は初期化時にコンテナの clientWidth/clientHeight を読む。
     * 親(main: absolute inset-0)から width/height:100% で正しく継承される。
     */
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>

      {/* 地図レイヤー: absolute inset-0 で relative 親を埋め尽くす。z-index 0 */}
      <MapView
        memories={filtered}
        onMarkerClick={onSelectMemory}
        flyToMemory={flyToMemory}
        activeBasemap={activeBasemap}
      />

      {/* === UI overlay 群 (z-index 10以上、地図の上) === */}

      <SearchBar
        value={filter.searchTerm}
        onChange={(term) => onFilterChange({ searchTerm: term })}
      />

      <Sidebar
        memories={filtered}
        isOpen={sidebarOpen}
        onClose={onSidebarClose}
        onSelectMemory={(m) => { onSelectMemory(m); onSidebarClose(); }}
        totalCount={memories.length}
      />

      <MemoryPanel
        memory={selectedMemory}
        onClose={onCloseMemory}
        onHashtagClick={onHashtagClick}
      />

      <HorizontalScroller memories={filtered} onSelect={onSelectMemory} />

      <TimelineControls
        years={years}
        activeYear={filter.year}
        onSelect={(y) => onFilterChange({ year: y })}
      />

      <BasemapTimeline activeId={activeBasemap.id} onChange={onBasemapChange} />

      {isLoading && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-white/80 text-xs text-gray-500 px-3 py-1 rounded-full shadow z-20">
          データを読み込み中…
        </div>
      )}

      {filter.hashtag && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-blue-500 text-white text-xs px-3 py-1.5 rounded-full shadow z-20">
          <span>{filter.hashtag}</span>
          <button onClick={() => onFilterChange({ hashtag: null })} className="hover:opacity-70">×</button>
        </div>
      )}
    </div>
  );
}
