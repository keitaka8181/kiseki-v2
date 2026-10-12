// サーバー専用（DB の読み書き）。ブラウザでも使う関数と型は memory-utils.ts へ
import 'server-only';
import { Memory } from '@/types';
import { supabase, rowToMemory, MemoryRow } from '@/lib/supabase';
import type { NewMemoryInput } from '@/lib/memory-utils';

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
