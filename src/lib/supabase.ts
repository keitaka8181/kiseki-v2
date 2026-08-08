// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const url     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// サーバー／クライアント両方で使える素のクライアント
// 認証機能を使わないため @supabase/ssr は不要
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});

// DB上のカラム名 (snake_case) → アプリの Memory 型 (camelCase) に変換
import type { Memory } from '@/types';

export interface MemoryRow {
  id: number;
  timestamp: string;   // ISO
  nickname: string;
  place_name: string;
  memory: string;
  lat: number;
  lng: number;
  age: string | null;
  avatar: string | null;
  hashtags: string | null;
  genre: string | null;
  year: string | null;
}

export function rowToMemory(r: MemoryRow): Memory {
  return {
    id: r.id,
    timestamp: r.timestamp,
    nickname:  r.nickname,
    placeName: r.place_name,
    memory:    r.memory,
    latLng:    `${r.lat}, ${r.lng}`,
    lat:       r.lat,
    lng:       r.lng,
    age:       r.age ?? '',
    avatar:    r.avatar ?? 'boy',
    hashtags:  r.hashtags ?? '',
    genre:     r.genre ?? '',
    year:      r.year ?? '',
  };
}
