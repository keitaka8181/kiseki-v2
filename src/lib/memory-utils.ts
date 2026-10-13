// ============================================================
// ブラウザ・サーバーの両方で使う型と関数
// Supabase を import しないこと（ブラウザ用の JS に DB の接続処理が入るため）
// ============================================================
import { Memory } from '@/types';

// 新規投稿の入力（フォーム → /api/data）
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

// ----------------------------------------------------------------
// 同じ場所の思い出をまとめる（2D マーカー・3D マーカー・思い出パネルで共通）
// Google マップ等で同じ施設を選ぶと緯度経度が完全に一致するため、
// そのまま並べると 1 人分のマーカーしか見えず、他の人の思い出が隠れてしまう。
// ----------------------------------------------------------------

/** 緯度経度を小数第5位（約1m）で丸め、同じ場所とみなす */
const SAME_PLACE_DECIMALS = 5;

export function locationKey(m: Pick<Memory, 'lat' | 'lng'>): string {
  return `${m.lat.toFixed(SAME_PLACE_DECIMALS)},${m.lng.toFixed(SAME_PLACE_DECIMALS)}`;
}

export interface LocationGroup {
  key: string;
  lat: number;
  lng: number;
  /** この場所の思い出（元の並び順のまま。API は新しい順で返す） */
  memories: Memory[];
}

/** 座標が正しい思い出だけを、同じ場所ごとにまとめる */
export function groupByLocation(memories: Memory[]): LocationGroup[] {
  const groups = new Map<string, LocationGroup>();
  for (const m of memories) {
    if (!Number.isFinite(m.lat) || !Number.isFinite(m.lng) ||
        m.lat < -90 || m.lat > 90 || m.lng < -180 || m.lng > 180) continue;
    const key = locationKey(m);
    const g = groups.get(key);
    if (g) g.memories.push(m);
    else groups.set(key, { key, lat: m.lat, lng: m.lng, memories: [m] });
  }
  return Array.from(groups.values());
}
