import { Memory } from '@/types';
import { supabase, rowToMemory, MemoryRow } from '@/lib/supabase';

// ----------------------------------------------------------------
// Supabase から取得
// ----------------------------------------------------------------
export async function fetchMemories(): Promise<Memory[]> {
  const { data, error } = await supabase
    .from('memories')
    .select('id, timestamp, nickname, place_name, memory, lat, lng, age, avatar, hashtags, genre, year')
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Supabase 取得失敗:', error);
    return [];
  }
  return (data as MemoryRow[]).map(rowToMemory);
}

// ----------------------------------------------------------------
// 新規投稿を追加（フォーム用）
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

export async function insertMemory(input: NewMemoryInput): Promise<Memory> {
  const { data, error } = await supabase
    .from('memories')
    .insert({
      nickname:   input.nickname.trim(),
      place_name: input.placeName.trim(),
      memory:      input.memory.trim(),
      lat:        input.lat,
      lng:        input.lng,
      age:        input.age ?? null,
      avatar:     input.avatar ?? 'boy',
      hashtags:   input.hashtags ?? '',
      genre:      input.genre ?? null,
      year:       input.year ?? null,
    })
    .select('id, timestamp, nickname, place_name, memory, lat, lng, age, avatar, hashtags, genre, year')
    .single();

  if (error) throw new Error(`投稿に失敗しました: ${error.message}`);
  return rowToMemory(data as MemoryRow);
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
