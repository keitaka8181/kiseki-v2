// src/lib/supabase.ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';

const url       = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url)       throw new Error('環境変数 SUPABASE_URL が設定されていません');
if (!secretKey) throw new Error('環境変数 SUPABASE_SECRET_KEY が設定されていません');

// サーバー専用のクライアント（全権限の鍵を使うため、ブラウザ側から読み込まない）
// 認証機能を使わないため @supabase/ssr は不要
export const supabase = createClient(url, secretKey, {
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
