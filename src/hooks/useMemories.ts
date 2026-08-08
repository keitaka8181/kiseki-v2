'use client';

import { useState, useEffect } from 'react';
import { Memory } from '@/types';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function useMemories() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    async function load() {
      try {
        // Try internal API route first (server-side caching)
        const res = await fetch('/api/data');
        if (!res.ok) throw new Error(`API error ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setMemories(json.memories ?? []);
          setStatus('success');
        }
      } catch (e) {
        if (!cancelled) {
          setError(String(e));
          setStatus('error');
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { memories, status, error, isLoading: status === 'loading' };
}

// ----------------------------------------------------------------
// Client-side filter helper used by useMapFilter
// ----------------------------------------------------------------
export function applyFilters(
  memories: Memory[],
  searchTerm: string,
  hashtag: string | null,
  year: string | null,
  genre: string | null
): Memory[] {
  let result = memories;
  if (searchTerm) {
    const t = searchTerm.toLowerCase();
    result = result.filter(
      (m) =>
        m.placeName.toLowerCase().includes(t) ||
        m.memory.toLowerCase().includes(t) ||
        m.nickname.toLowerCase().includes(t) ||
        m.hashtags.toLowerCase().includes(t)
    );
  }
  if (hashtag) result = result.filter((m) => m.hashtags.toLowerCase().includes(hashtag.toLowerCase()));
  if (year)    result = result.filter((m) => m.year === year);
  if (genre)   result = result.filter((m) => m.genre.toLowerCase().includes(genre.toLowerCase()));
  return result;
}
