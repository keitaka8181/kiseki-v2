// ============================================================
// 新規投稿の入力検証（サーバー側 / クライアント側 共通）
// ============================================================
import type { NewMemoryInput } from '@/lib/memory-utils';
import { DEFAULT_AVATAR, GENRES, isAvatarId } from '@/lib/avatars';

export const LIMITS = {
  nickname: 100,
  placeName: 200,
  memory: 2000,
  age: 20,
  hashtags: 300,
  year: 10,
} as const;

export const MIN_YEAR = 1900;

type Result = { ok: true; value: NewMemoryInput } | { ok: false; error: string };

/** 全角数字→半角、末尾の「年」を除去して 4 桁の西暦に正規化。空なら '' */
export function normalizeYear(raw: string): string | null {
  const s = raw
    .trim()
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/年$/, '');
  if (s === '') return '';
  if (!/^\d{4}$/.test(s)) return null;
  const y = Number(s);
  if (y < MIN_YEAR || y > new Date().getFullYear()) return null;
  return s;
}

function str(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return '';
}

function num(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '') return Number(v);
  return NaN;
}

export function validateNewMemory(body: unknown): Result {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: '不正なリクエストです' };
  }
  const b = body as Record<string, unknown>;

  const nickname  = str(b.nickname);
  const placeName = str(b.placeName);
  const memory    = str(b.memory);
  const age       = str(b.age);
  const hashtags  = str(b.hashtags);
  const genreRaw  = str(b.genre);
  const lat       = num(b.lat);
  const lng       = num(b.lng);

  if (!nickname)  return { ok: false, error: 'あだ名を入力してください' };
  if (!placeName) return { ok: false, error: '場所の名前を入力してください' };
  if (!memory)    return { ok: false, error: '思い出を入力してください' };

  if (nickname.length  > LIMITS.nickname)  return { ok: false, error: `あだ名は${LIMITS.nickname}文字以内にしてください` };
  if (placeName.length > LIMITS.placeName) return { ok: false, error: `場所の名前は${LIMITS.placeName}文字以内にしてください` };
  if (memory.length    > LIMITS.memory)    return { ok: false, error: `思い出は${LIMITS.memory}文字以内にしてください` };
  if (age.length       > LIMITS.age)       return { ok: false, error: `年齢は${LIMITS.age}文字以内にしてください` };
  if (hashtags.length  > LIMITS.hashtags)  return { ok: false, error: `ハッシュタグは${LIMITS.hashtags}文字以内にしてください` };

  if (!Number.isFinite(lat) || lat < -90 || lat > 90 ||
      !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return { ok: false, error: '場所（緯度経度）が正しくありません' };
  }

  const year = normalizeYear(str(b.year));
  if (year === null) {
    return { ok: false, error: `年は${MIN_YEAR}〜${new Date().getFullYear()}の西暦4桁で入力してください` };
  }

  const genre = (GENRES as readonly string[]).includes(genreRaw) ? genreRaw : '';
  const avatar = isAvatarId(b.avatar) ? b.avatar : DEFAULT_AVATAR;

  return {
    ok: true,
    value: {
      nickname, placeName, memory, lat, lng,
      age: age || undefined,
      avatar,
      hashtags,
      genre: genre || undefined,
      year: year || undefined,
    },
  };
}
