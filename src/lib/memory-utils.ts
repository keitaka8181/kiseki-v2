// src/lib/memory-utils.ts
// ブラウザからも読み込める純粋なヘルパと型。Supabase は読み込まない。
import { Memory } from '@/types';

// ----------------------------------------------------------------
// 新規投稿の入力（フォーム用）
// ----------------------------------------------------------------
export interface NewMemoryInput {
  nickname: string;
  placeName: string;
  memory: string;
  lat: number;
  lng: number;
  age?: string;
  avatar?: string;
  hashtags?: string;
  genre?: string;
  year?: string;
}

// ----------------------------------------------------------------
// クライアント側フィルタ・集計ヘルパ
// ----------------------------------------------------------------
export function filterMemories(
  memories: Memory[],
  { searchTerm, hashtag, year, genre }:
    { searchTerm?: string; hashtag?: string; year?: string; genre?: string }
): Memory[] {
  let result = memories;
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    result = result.filter(
      (m) =>
        m.placeName.toLowerCase().includes(term) ||
        m.memory.toLowerCase().includes(term) ||
        m.nickname.toLowerCase().includes(term) ||
        m.hashtags.toLowerCase().includes(term)
    );
  }
  if (hashtag) result = result.filter((m) => m.hashtags.toLowerCase().includes(hashtag.toLowerCase()));
  if (year)    result = result.filter((m) => m.year === year);
  if (genre)   result = result.filter((m) => m.genre.toLowerCase().includes(genre.toLowerCase()));
  return result;
}

export function getUniqueYears(memories: Memory[]): string[] {
  const years = memories.map((m) => m.year).filter(Boolean);
  return Array.from(new Set(years)).sort();
}

export function getUniqueHashtags(memories: Memory[]): string[] {
  const tags = memories.flatMap((m) =>
    m.hashtags.split(/[\s,]+/).filter((t) => t.startsWith('#'))
  );
  return Array.from(new Set(tags)).sort();
}
