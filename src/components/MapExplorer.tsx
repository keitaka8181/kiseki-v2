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
import AddMemoryForm from '@/components/ui/AddMemoryForm';
import { useEffect, useMemo, useState } from 'react';
import { locationKey } from '@/lib/memory-utils';

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
  /** 地図を動かさずに選択だけ切り替える（同じ場所の思い出の切り替え用） */
  onChangeSelectedMemory: (memory: Memory) => void;
  onCloseMemory: () => void;
  onHashtagClick: (tag: string) => void;
  onSidebarOpen: () => void;
  onSidebarClose: () => void;
  draftLocation: { lat: number; lng: number } | null;
  onMapContextMenu: (pos: { lat: number; lng: number }) => void;
  onCancelDraft: () => void;
  onMemoryCreated: (memory: Memory) => void;
  /** Three.js の 3D マーカーを重ねる（試験中。/3d で true） */
  enable3D?: boolean;
}

const HINT_KEY = 'kiseki:hint-add-seen';

export default function MapExplorer({
  memories, filtered, years, isLoading,
  filter, activeBasemap,
  selectedMemory, flyToMemory,
  sidebarOpen,
  onFilterChange, onBasemapChange,
  onSelectMemory, onChangeSelectedMemory, onCloseMemory, onHashtagClick,
  onSidebarOpen, onSidebarClose,
  draftLocation, onMapContextMenu, onCancelDraft, onMemoryCreated,
  enable3D = false,
}: Props) {
  // 選択中の思い出と同じ場所にある思い出（地図に出ているものの中から）
  const samePlace = useMemo(() => {
    if (!selectedMemory) return [];
    const key = locationKey(selectedMemory);
    return filtered.filter((m) => locationKey(m) === key);
  }, [filtered, selectedMemory]);

  // 「右クリックで追加できる」ことを初回だけ案内する
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(HINT_KEY) === '1'; } catch { /* 無視 */ }
    if (seen) return;
    setShowHint(true);
    const t = setTimeout(() => setShowHint(false), 6000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!draftLocation) return;
    setShowHint(false);
    try { localStorage.setItem(HINT_KEY, '1'); } catch { /* 無視 */ }
  }, [draftLocation]);

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
        onMapContextMenu={onMapContextMenu}
        draftLocation={draftLocation}
        enable3D={enable3D}
        selectedMemoryId={selectedMemory?.id ?? null}
      />

      {enable3D && (
        <a
          href="/"
          title="通常の表示に戻る"
          className="absolute top-16 right-4 z-20 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[11px] text-white shadow hover:bg-black/75"
        >
          <span className="font-bold">3D</span>
          <span className="text-white/70">試験中 ×</span>
        </a>
      )}

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
        samePlace={samePlace}
        onSelectSamePlace={onChangeSelectedMemory}
      />

      <HorizontalScroller memories={filtered} onSelect={onSelectMemory} />

      <TimelineControls
        years={years}
        activeYear={filter.year}
        onSelect={(y) => onFilterChange({ year: y })}
      />

      <BasemapTimeline activeId={activeBasemap.id} onChange={onBasemapChange} />

      {draftLocation && (
        <AddMemoryForm
          key={`${draftLocation.lat},${draftLocation.lng}`}
          location={draftLocation}
          onClose={onCancelDraft}
          onCreated={onMemoryCreated}
        />
      )}

      {showHint && !isLoading && !draftLocation && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-black/70 text-white text-xs px-4 py-2 rounded-full shadow pointer-events-none whitespace-nowrap">
          <span className="hidden md:inline">地図を右クリックして思い出をのこせます</span>
          <span className="md:hidden">地図を長押しして思い出をのこせます</span>
        </div>
      )}

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
