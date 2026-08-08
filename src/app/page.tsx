'use client';

import { useState, useCallback, useMemo } from 'react';
import { Memory } from '@/types';
import { applyFilters, useMemories } from '@/hooks/useMemories';
import { useMapFilter } from '@/hooks/useMapFilter';
import { getUniqueYears } from '@/lib/data';
import { BASEMAP_LAYERS, DEFAULT_BASEMAP_ID, BasemapLayer } from '@/lib/basemaps';

import AppLayout from '@/components/AppLayout';
import WelcomeModal from '@/components/modal/WelcomeModal';
import MapExplorer from '@/components/MapExplorer';

export default function HomePage() {
  const { memories, isLoading } = useMemories();
  const { filter, updateFilter, clearFilter } = useMapFilter();

  const [showModal, setShowModal] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [flyToMemory, setFlyToMemory] = useState<Memory | null>(null);
  const [activeBasemap, setActiveBasemap] = useState<BasemapLayer>(
    () => BASEMAP_LAYERS.find((b) => b.id === DEFAULT_BASEMAP_ID) ?? BASEMAP_LAYERS[BASEMAP_LAYERS.length - 1]
  );

  const filtered = useMemo(
    () => applyFilters(memories, filter.searchTerm, filter.hashtag, filter.year, filter.genre),
    [memories, filter]
  );
  const years = useMemo(() => getUniqueYears(memories), [memories]);

  const handleSelectMemory = useCallback((memory: Memory) => {
    setSelectedMemory(memory);
    setFlyToMemory(memory);
  }, []);

  const handleHashtagClick = useCallback((tag: string) => {
    updateFilter({ hashtag: tag });
    setSelectedMemory(null);
  }, [updateFilter]);

  const handleLogoClick = useCallback(() => {
    clearFilter();
    setSelectedMemory(null);
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
          onCloseMemory={() => setSelectedMemory(null)}
          onHashtagClick={handleHashtagClick}
          onSidebarOpen={() => setSidebarOpen(true)}
          onSidebarClose={() => setSidebarOpen(false)}
        />
      )}
    </AppLayout>
  );
}
