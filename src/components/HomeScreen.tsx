'use client';

import { useState, useCallback, useMemo } from 'react';
import { Memory } from '@/types';
import { applyFilters, useMemories } from '@/hooks/useMemories';
import { useMapFilter } from '@/hooks/useMapFilter';
import { getUniqueYears } from '@/lib/memory-utils';
import { BASEMAP_LAYERS, DEFAULT_BASEMAP_ID, BasemapLayer } from '@/lib/basemaps';

import AppLayout from '@/components/AppLayout';
import WelcomeModal from '@/components/modal/WelcomeModal';
import MapExplorer from '@/components/MapExplorer';

interface Props {
  /** Three.js の 3D マーカーを重ねる（試験中。/3d で true） */
  enable3D?: boolean;
}

/** トップページ（/）と 3D 表示（/3d）で共通の画面 */
export default function HomeScreen({ enable3D = false }: Props) {
  const { memories, isLoading, addMemory } = useMemories();
  const { filter, updateFilter, clearFilter } = useMapFilter();

  const [showModal, setShowModal] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [flyToMemory, setFlyToMemory] = useState<Memory | null>(null);
  const [draftLocation, setDraftLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeBasemap, setActiveBasemap] = useState<BasemapLayer>(
    () => BASEMAP_LAYERS.find((b) => b.id === DEFAULT_BASEMAP_ID) ?? BASEMAP_LAYERS[BASEMAP_LAYERS.length - 1]
  );

  const filtered = useMemo(
    () => applyFilters(memories, filter.searchTerm, filter.hashtag, filter.year, filter.genre),
    [memories, filter]
  );
  const years = useMemo(() => getUniqueYears(memories), [memories]);

  const handleSelectMemory = useCallback((memory: Memory) => {
    setDraftLocation(null);
    setSelectedMemory(memory);
    setFlyToMemory(memory);
  }, []);

  // 地図の右クリック / 長押し → 投稿フォームを開く
  const handleMapContextMenu = useCallback((pos: { lat: number; lng: number }) => {
    setSelectedMemory(null);
    setSidebarOpen(false);
    setDraftLocation(pos);
  }, []);

  const handleCancelDraft = useCallback(() => setDraftLocation(null), []);

  const handleMemoryCreated = useCallback((memory: Memory) => {
    addMemory(memory);
    setDraftLocation(null);
    // 投稿した思い出が絞り込みで隠れないよう解除してから表示する
    clearFilter();
    setSelectedMemory(memory);
  }, [addMemory, clearFilter]);

  const handleHashtagClick = useCallback((tag: string) => {
    updateFilter({ hashtag: tag });
    setSelectedMemory(null);
  }, [updateFilter]);

  const handleLogoClick = useCallback(() => {
    clearFilter();
    setSelectedMemory(null);
    setDraftLocation(null);
    setShowModal(true);
  }, [clearFilter]);

  return (
    <AppLayout onLogoClick={handleLogoClick} onMenuClick={() => setSidebarOpen(true)}>
      {showModal ? (
        // Welcome screen — no map underneath
        <WelcomeModal
          memories={memories}
          onExplore={() => setShowModal(false)}
        />
      ) : (
        // Explore screen — map + all overlays
        <MapExplorer
          memories={memories}
          filtered={filtered}
          years={years}
          isLoading={isLoading}
          filter={filter}
          activeBasemap={activeBasemap}
          selectedMemory={selectedMemory}
          flyToMemory={flyToMemory}
          sidebarOpen={sidebarOpen}
          onFilterChange={updateFilter}
          onBasemapChange={setActiveBasemap}
          onSelectMemory={handleSelectMemory}
          onChangeSelectedMemory={setSelectedMemory}
          onCloseMemory={() => setSelectedMemory(null)}
          onHashtagClick={handleHashtagClick}
          onSidebarOpen={() => setSidebarOpen(true)}
          onSidebarClose={() => setSidebarOpen(false)}
          draftLocation={draftLocation}
          onMapContextMenu={handleMapContextMenu}
          onCancelDraft={handleCancelDraft}
          onMemoryCreated={handleMemoryCreated}
          enable3D={enable3D}
        />
      )}
    </AppLayout>
  );
}
