// src/lib/supabase.ts
// サーバー専用。ブラウザ側で import するとビルドエラーになる（server-only）
import 'server-only';
import { createClient } from '@supabase/supabase-js';

// NEXT_PUBLIC_ を付けない＝ブラウザ用の JS に埋め込まれない
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  throw new Error('SUPABASE_URL / SUPABASE_SECRET_KEY が設定されていません');
}

// サーバー専用の鍵（RLS の対象外）。DB へのアクセスは /api/data からのみ行う
export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
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
