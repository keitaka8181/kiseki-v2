'use client';

import { useState, useCallback, useEffect } from 'react';
import { FilterState } from '@/types';

const DEFAULT_FILTER: FilterState = {
  searchTerm: '',
  hashtag: null,
  year: null,
  genre: null,
};

export function useMapFilter() {
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);

  // URL同期はレンダリング後に行う（useEffect内）
  useEffect(() => {
    const params = new URLSearchParams();
    if (filter.searchTerm) params.set('search', filter.searchTerm);
    if (filter.hashtag)    params.set('hashtag', filter.hashtag);
    if (filter.year)       params.set('year', filter.year);
    if (filter.genre)      params.set('genre', filter.genre);
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [filter]);

  const updateFilter = useCallback((patch: Partial<FilterState>) => {
    setFilter((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearFilter = useCallback(() => {
    setFilter(DEFAULT_FILTER);
  }, []);

  return { filter, updateFilter, clearFilter };
}
